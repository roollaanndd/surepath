// ─────────────────────────────────────────────────────────────────────────────
// quotations-gateway — standalone bridge for the e-quotation actions.
//
// The canonical implementation lives in data-gateway/actions/quotations.ts
// and is dispatched by data-gateway once that function is redeployed
// (`supabase functions deploy data-gateway`). This bridge exists so QR links
// on generated quotation PDFs work immediately without redeploying the whole
// gateway; services/quotationService.ts calls data-gateway first and falls
// back here on "Unknown action". Safe to delete after the next data-gateway
// deploy.
//
// Actions:
//   save_quotation            (authed, Supabase JWT)
//   get_public_quotation      (public, IP rate-limited)
//   confirm_public_quotation  (public, IP rate-limited)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://myinsurepath.com', 'https://www.myinsurepath.com'];
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+-roollaanndds-projects\.vercel\.app$/i;
const LOCAL_RE = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) || LOCAL_RE.test(origin)) ? origin : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

// Same bucketed hourly limiter as _shared/rateLimit.ts (kept inline so this
// function stays a single self-contained file).
async function checkRateLimit(db: any, identifier: string, action: string, limit: number): Promise<boolean> {
  const now = new Date();
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  try {
    const { error: insErr } = await db.from('sp_rate_limits').insert({
      identifier, action, hour_bucket: hourBucket, request_count: 1, last_request: now.toISOString(),
    });
    if (insErr) {
      const { data, error: rpcErr } = await db.rpc('increment_rate_limit', {
        p_identifier: identifier, p_action: action, p_hour_bucket: hourBucket,
      });
      if (rpcErr) return false;
      return (data ?? 1) <= limit;
    }
    return true;
  } catch {
    return false;
  }
}

// Payload fields safe to expose on the public e-quotation page — keep in sync
// with data-gateway/actions/quotations.ts.
const PUBLIC_PAYLOAD_FIELDS = [
  'quotationNumber', 'slipType', 'issueDate', 'productName', 'productLine',
  'preparedForCompany', 'insurer', 'insurerShort', 'insurerLogoUrl',
  'periodStart', 'periodEnd', 'objectSummary',
  'coverageCondition', 'additionalCoverage', 'deductible', 'klausulList',
  'sumInsuredItems', 'totalSumInsured', 'currency',
  'premiumComponents', 'subtotalPremium', 'discountLabel', 'discountAmount',
  'premiumAfterDiscount', 'policyFee', 'stampDuty', 'totalPremium',
  'subjectivityList', 'termsList',
  'bankName', 'bankAccount', 'bankAccountName', 'paymentDueDate', 'transferMemo',
  'agentName', 'agentPhone', 'validUntil',
];

function publicPayload(payload: Record<string, unknown> | null): Record<string, unknown> {
  const src = payload ?? {};
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_PAYLOAD_FIELDS) {
    if (src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method === 'GET') return json({ status: 'ok', service: 'quotations-gateway' });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

    let parsed: any;
    try { parsed = await req.json(); } catch { parsed = { action: null }; }
    const { action, params = {} } = parsed;
    if (!action) return json({ error: 'Missing action' }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
    const sendTelegram = (text: string): void => {
      if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }) }).then(() => {}, () => {});
    };

    switch (action) {
      // ── save_quotation (authed) ─────────────────────────────────────────
      case 'save_quotation': {
        const authHeader = req.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token) return json({ error: 'Unauthorized: missing bearer token' }, 401);
        const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: userData, error: userErr } = await authClient.auth.getUser();
        if (userErr || !userData?.user) return json({ error: 'Unauthorized: invalid token' }, 401);
        const email = (userData.user.email ?? '').toLowerCase();
        const { data: spUser } = await db.from('sp_users').select('id').or(`id.eq.${userData.user.id},email.ilike.${email}`).maybeSingle();
        if (!spUser) return json({ error: 'No profile' }, 403);

        const allowed = await checkRateLimit(db, `user:${spUser.id}`, action, 60);
        if (!allowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);

        const code = String(params.code ?? '').trim();
        const payload = (params.payload ?? {}) as Record<string, unknown>;
        const quotationNumber = String(params.quotation_number ?? payload.quotationNumber ?? '').trim();
        if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);
        if (!quotationNumber) return json({ error: 'Missing quotation number' }, 400);

        const row = {
          code,
          quotation_number: quotationNumber,
          product_type: String(params.product_type ?? 'MOTOR').slice(0, 20),
          product_name: params.product_name ? String(params.product_name).slice(0, 120) : null,
          payload,
          customer_name: params.customer_name ? String(params.customer_name).slice(0, 120) : null,
          insurer_name: params.insurer_name ? String(params.insurer_name).slice(0, 120) : null,
          agent_name: params.agent_name ? String(params.agent_name).slice(0, 120) : null,
          agent_phone: params.agent_phone ? String(params.agent_phone).slice(0, 32) : null,
          total_premium: typeof params.total_premium === 'number' ? params.total_premium : null,
          valid_until: params.valid_until ? String(params.valid_until).slice(0, 10) : null,
          source_app: params.source_app ? String(params.source_app).slice(0, 20) : null,
          created_by: spUser.id,
          order_id: params.order_id ? String(params.order_id) : null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await db.from('sp_quotations').upsert(row, { onConflict: 'code' }).select('id, code').single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      // ── get_public_quotation (public) ───────────────────────────────────
      case 'get_public_quotation': {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
        const ipAllowed = await checkRateLimit(db, `ip:${clientIp}`, action, 60);
        if (!ipAllowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);

        const code = String(params.code ?? '').trim();
        if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);

        const { data: q, error } = await db
          .from('sp_quotations')
          .select('code, quotation_number, product_type, product_name, status, payload, customer_name, insurer_name, agent_name, agent_phone, total_premium, valid_until, confirmed_at, created_at')
          .eq('code', code)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!q) return json({ error: 'Quotation not found' }, 404);

        if (q.status === 'SENT') {
          db.from('sp_quotations')
            .update({ status: 'VIEWED', viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('code', code)
            .then(() => {}, () => {});
        }

        const expired = q.valid_until ? new Date(q.valid_until + 'T23:59:59') < new Date() : false;
        return json({
          data: {
            code: q.code,
            quotation_number: q.quotation_number,
            product_type: q.product_type,
            product_name: q.product_name,
            status: expired && q.status !== 'CONFIRMED' && q.status !== 'PAID' ? 'EXPIRED' : q.status,
            customer_name: q.customer_name,
            insurer_name: q.insurer_name,
            agent_name: q.agent_name,
            agent_phone: q.agent_phone,
            total_premium: q.total_premium,
            valid_until: q.valid_until,
            confirmed_at: q.confirmed_at,
            created_at: q.created_at,
            payload: publicPayload(q.payload),
          },
        });
      }

      // ── confirm_public_quotation (public) ───────────────────────────────
      case 'confirm_public_quotation': {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
        const ipAllowed = await checkRateLimit(db, `ip:${clientIp}`, action, 60);
        if (!ipAllowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);

        const code = String(params.code ?? '').trim();
        if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);
        const name = String(params.name ?? '').trim().slice(0, 120);
        const phone = String(params.phone ?? '').trim().slice(0, 32);
        if (!name) return json({ error: 'Nama wajib diisi' }, 400);

        const { data: q, error } = await db
          .from('sp_quotations')
          .select('id, code, quotation_number, status, customer_name, agent_name, total_premium, valid_until')
          .eq('code', code)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!q) return json({ error: 'Quotation not found' }, 404);
        if (q.status === 'PAID') return json({ error: 'Quotation sudah dibayar' }, 409);
        if (q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date()) {
          return json({ error: 'Quotation sudah kedaluwarsa. Hubungi agen/tim SurePath untuk penawaran baru.' }, 410);
        }

        const { error: updErr } = await db
          .from('sp_quotations')
          .update({
            status: 'CONFIRMED',
            confirmed_at: new Date().toISOString(),
            confirmed_name: name,
            confirmed_phone: phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('code', code);
        if (updErr) return json({ error: updErr.message }, 500);

        sendTelegram(
          `✅ <b>E-Quotation dikonfirmasi</b>\n` +
          `No: ${q.quotation_number}\n` +
          `Nasabah: ${name}${phone ? ` (${phone})` : ''}\n` +
          `Agen: ${q.agent_name ?? '-'}\n` +
          `Premi: ${q.total_premium ?? '-'}\n` +
          `https://myinsurepath.com/q/${q.code}`
        );

        return json({ data: { ok: true, status: 'CONFIRMED' } });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
