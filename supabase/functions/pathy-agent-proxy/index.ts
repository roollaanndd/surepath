// ─────────────────────────────────────────────────────────────────────────────
// pathy-agent-proxy — OpenCode as the source/orchestrator for Pathy AI
//
// Purpose:
// - Keep JWT scoping, caller allowlists, and server-enforced disclaimers
// - Route Pathy requests through an OpenCode-compatible proxy while preserving
//   the same safety rails: no money writes, caller-scoped tools only
// - Fallback to existing pathy-agent flow if OpenCode unavailable
//
// Trust rules (must match pathy-agent):
// - Identity from verified JWT only (never from model args)
// - User free text wrapped with untrusted input delimiters
// - Block money-table writes, orders/claims/payments writes
// - Always attach server-computed disclaimer
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { wrapUserContent } from '../_shared/promptSafety.ts';
import { turnDisclaimer } from '../pathy-agent/disclaimers.ts';

const MAX_MESSAGE_CHARS = 2000;
const HOURLY_LIMIT = 60;
const PROXY_TIMEOUT_MS = 45000;

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return json({ error: 'Unauthorized: missing bearer token' }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'Unauthorized: invalid token' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const authId = userData.user.id;
  const email = (userData.user.email ?? '').toLowerCase();

  let { data: spUser } = await db
    .from('sp_users')
    .select('id,name,role,phone,agent_code')
    .eq('id', authId)
    .maybeSingle();
  if (!spUser && email) {
    ({ data: spUser } = await db
      .from('sp_users')
      .select('id,name,role,phone,agent_code')
      .eq('email', email)
      .maybeSingle());
  }

  const ownerId = spUser?.id ?? authId;
  const role = spUser?.role ?? 'CUSTOMER';

  const allowed = await checkRateLimit(db, `user:${ownerId}`, 'pathy_agent_proxy', HOURLY_LIMIT);
  if (!allowed) {
    return json({ error: 'Terlalu banyak pesan ke Pathy. Coba lagi dalam satu jam ya.' }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const userMessage = String(body?.message ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
  if (!userMessage) return json({ error: 'Pesan kosong.' }, 400);

  const OPENCODE_URL = Deno.env.get('OPENCODE_API_URL') ?? Deno.env.get('OPENCODE_URL') ?? '';
  const OPENCODE_KEY = Deno.env.get('OPENCODE_API_KEY') ?? Deno.env.get('OPENCODE_KEY') ?? '';
  const OPENCODE_MODEL = Deno.env.get('OPENCODE_MODEL') ?? 'big-pickle';

  if (!OPENCODE_URL || !OPENCODE_KEY) {
    // Fallback to pathy-agent
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/pathy-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('proxy fallback to pathy-agent failed:', e);
      return json({ error: 'Asisten Pathy sedang tidak tersedia.' }, 502);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    // OpenCode-compatible chat completion with safety rails
    const res = await fetch(`${OPENCODE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENCODE_KEY}`,
      },
      body: JSON.stringify({
        model: OPENCODE_MODEL,
        messages: [
          {
            role: 'system',
            content: `Kamu adalah Pathy, asisten AI SurePath. 
Aturan wajib:
- Hanya menjawab terkait asuransi dan layanan SurePath.
- Jangan pernah memproses pembayaran, mencairkan dana, mengubah polis/klaim.
- Selalu berikan indikasi, bukan keputusan final untuk klaim/jaminan.
- Gunakan data yang tersedia via tools yang diizinkan saja.
- Role pengguna: ${role}.`,
          },
          {
            role: 'user',
            content: wrapUserContent(userMessage),
          },
        ],
        max_tokens: 900,
        temperature: 0.4,
        // Tool allowlist will be enforced server-side; keep minimal
        tools: [],
        tool_choice: 'none',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Fallback on error
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/pathy-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => ({}));
        return new Response(JSON.stringify(data), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
      } catch {
        return json({ error: 'Asisten AI sedang tidak tersedia.' }, 502);
      }
    }

    const payload = await res.json().catch(() => ({}));
    const reply = String(payload?.choices?.[0]?.message?.content ?? '').trim();
    if (!reply) {
      // Fallback
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/pathy-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => ({}));
        return new Response(JSON.stringify(data), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
      } catch {
        return json({ error: 'AI tidak memberikan jawaban.' }, 502);
      }
    }

    const toolsUsed: string[] = [];
    const cards: any[] = [];
    return json({
      data: {
        reply,
        cards,
        toolsUsed,
        disclaimer: turnDisclaimer(reply, toolsUsed),
        source: 'opencode-proxy',
      },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('pathy-agent-proxy error:', e);
    // Fallback
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/pathy-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch {
      return json({ error: 'Terjadi gangguan pada asisten AI.' }, 500);
    }
  }
});
