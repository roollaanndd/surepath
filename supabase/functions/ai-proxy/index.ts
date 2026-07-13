
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { checkRateLimit as checkPersistentRateLimit } from '../_shared/rateLimit.ts';

// ─── AI Proxy ────────────────────────────────────────────────────────────────
//
// SECURITY HISTORY:
// Previous version forwarded the entire client request body to OpenRouter
// using SurePath's API key. Any logged-in user could swap the `model` to a
// premium one (claude-3.5-sonnet, gpt-4-turbo), bump max_tokens, or use
// streaming — leading to cost abuse and potential TOS violations.
//
// FIXED:
//   1. Whitelist allowed models (currently gpt-4o-mini + claude-3.5-haiku)
//   2. Cap max_tokens at 2000
//   3. Reject stream: true
//   4. Per-user rate limit: 30 requests / minute (in-memory counter)
//   5. Per-user daily cap: 500 requests / day (in-memory counter, resets on
//      cold start — acceptable for now, move to Redis if abuse appears)

const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3.5-haiku-20241022',
]);

const MAX_TOKENS_CAP = 2000;
const RATE_LIMIT_PER_MINUTE = 30;
const DAILY_CAP = 500;

// In-memory rate-limit counters (reset on cold start).
// Keyed by authId. Each entry: { minuteCount, minuteResetAt, dayCount, dayResetAt }
const rateLimitMap = new Map<string, { minuteCount: number; minuteResetAt: number; dayCount: number; dayResetAt: number }>();

function checkRateLimit(authId: string): { ok: boolean; reason?: string } {
  const now = Date.now();
  let entry = rateLimitMap.get(authId);
  if (!entry) {
    entry = {
      minuteCount: 0,
      minuteResetAt: now + 60_000,
      dayCount: 0,
      dayResetAt: now + 24 * 60 * 60_000,
    };
    rateLimitMap.set(authId, entry);
  }
  // Reset windows if expired
  if (now > entry.minuteResetAt) {
    entry.minuteCount = 0;
    entry.minuteResetAt = now + 60_000;
  }
  if (now > entry.dayResetAt) {
    entry.dayCount = 0;
    entry.dayResetAt = now + 24 * 60 * 60_000;
  }
  entry.minuteCount++;
  entry.dayCount++;
  if (entry.minuteCount > RATE_LIMIT_PER_MINUTE) {
    return { ok: false, reason: 'Rate limit exceeded (per-minute). Try again shortly.' };
  }
  if (entry.dayCount > DAILY_CAP) {
    return { ok: false, reason: 'Daily AI request cap exceeded.' };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Auth: require a verified Supabase JWT
  const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SERVICE_KEY, CORS);
  if (errorResponse) return errorResponse;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Per-user rate limit — fast in-memory burst guard (per-minute + per-day,
  // resets on cold start) layered with a persistent per-hour cap backed by
  // sp_rate_limits, so a limit survives redeploys even if the in-memory
  // counters don't.
  const rl = checkRateLimit(caller.authId);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: rl.reason }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  const persistentClient = createClient(SUPABASE_URL, SERVICE_KEY);
  const persistentAllowed = await checkPersistentRateLimit(persistentClient, `user:${caller.authId}`, 'ai_proxy', 200);
  if (!persistentAllowed) {
    return new Response(JSON.stringify({ error: 'Hourly AI request cap exceeded. Try again later.' }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    let OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
    if (!OPENROUTER_KEY && SUPABASE_URL && SERVICE_KEY) {
      const supabase = persistentClient;
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
      OPENROUTER_KEY = data ?? '';
    }

    if (!OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate + sanitize the client body ──────────────────────────────
    const clientBody = await req.json().catch(() => ({}));

    // Model whitelist
    const model = typeof clientBody.model === 'string' ? clientBody.model : '';
    if (!ALLOWED_MODELS.has(model)) {
      return new Response(JSON.stringify({
        error: `Model "${model}" is not allowed. Allowed models: ${[...ALLOWED_MODELS].join(', ')}`,
      }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Reject streaming (we can't bill-protection a stream easily)
    if (clientBody.stream === true) {
      return new Response(JSON.stringify({ error: 'Streaming is not supported.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Cap max_tokens
    let maxTokens = Number(clientBody.max_tokens);
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      maxTokens = MAX_TOKENS_CAP;
    }
    maxTokens = Math.min(maxTokens, MAX_TOKENS_CAP);

    // Reject if messages is missing/empty/malformed
    if (!Array.isArray(clientBody.messages) || clientBody.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages[] is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    // Reject if any message has unexpected shape (basic schema check)
    for (const m of clientBody.messages) {
      if (!m || typeof m.role !== 'string' || typeof m.content !== 'string' && !Array.isArray(m.content)) {
        return new Response(JSON.stringify({ error: 'Invalid message shape' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build the sanitized body — only fields we explicitly allow
    const sanitizedBody: Record<string, unknown> = {
      model,
      messages: clientBody.messages,
      max_tokens: maxTokens,
      temperature: typeof clientBody.temperature === 'number'
        ? Math.max(0, Math.min(2, clientBody.temperature))
        : 0.7,
    };
    // Pass through response_format if it's a valid shape (for json_object mode)
    if (clientBody.response_format && typeof clientBody.response_format === 'object') {
      const rf = clientBody.response_format as { type?: string };
      if (rf.type === 'json_object' || rf.type === 'text') {
        sanitizedBody.response_format = rf;
      }
    }

    // ── Forward to OpenRouter ────────────────────────────────────────────
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer':  'https://myinsurepath.com',
        'X-Title':       'SurePath',
      },
      body: JSON.stringify(sanitizedBody),
    });

    const responseText = await orRes.text();
    return new Response(responseText, {
      status:  orRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('ai-proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
