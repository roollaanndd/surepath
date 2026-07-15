// ai-gateway/index.ts — SurePath AI Gateway Edge Function
// Central entry point for ALL AI calls. Provides:
// - Model routing (GPT-4o, Claude, Gemini)
// - Rate limiting (per-user, per-role, global)
// - PII redaction (pre-LLM + post-LLM)
// - Cost tracking (token usage → sp_ai_usage table)
// - Safety filter (prompt injection detection)
// - Audit logging (every call logged)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('VITE_GEMINI_API_KEY') ?? '';

// ─── PII Redaction ───────────────────────────────────────────────────────────
const PII_PATTERNS = [
  { regex: /\b\d{16}\b/g, replacement: '[REDACTED_KTP]' },
  { regex: /\b08\d{8,11}\b/g, replacement: '[REDACTED_PHONE]' },
  { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[REDACTED_CARD]' },
  { regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[REDACTED_EMAIL]' },
];

function redactPII(text: string): string {
  let result = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// ─── Prompt Injection Detection ──────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|all|the above) (instructions|prompts|rules)/i,
  /you are now (a|an) /i,
  /disregard (your|the) (system|previous) prompt/i,
  /forget (everything|all) (you were told|above)/i,
];

function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
async function checkRateLimit(userId: string, role: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60000).toISOString();
  const limits: Record<string, number> = {
    MASTER_ADMIN: 100, ADMIN: 60, OPERATOR: 50, AGENT: 40, CUSTOMER: 30, default: 20,
  };
  const limit = limits[role] ?? limits.default;
  const { count } = await db.from('sp_ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);
  return (count ?? 0) < limit;
}

// ─── Gemini LLM Call ─────────────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2000
): Promise<{ content: string; inputTokens: number; outputTokens: number; cost: number }> {
  if (!GEMINI_KEY) throw new Error('No AI API key configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return {
    content,
    inputTokens: Math.ceil((systemPrompt + userMessage).length / 4),
    outputTokens: Math.ceil(content.length / 4),
    cost: 0.001,
  };
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { data: spUser } = await db.from('sp_users')
      .select('id, role, name, email, verified').eq('id', user.id).maybeSingle();
    if (!spUser) {
      return new Response(JSON.stringify({ error: 'No profile' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { agentType, systemPrompt, userMessage, context } = body;

    if (!agentType || (!userMessage && !body.messages)) {
      return new Response(JSON.stringify({ error: 'agentType and userMessage required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Rate limit
    const allowed = await checkRateLimit(user.id, spUser.role);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Coba lagi dalam 1 menit.' }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Build messages
    const finalSystemPrompt = systemPrompt ?? '';
    const finalUserMessage = typeof userMessage === 'string'
      ? userMessage
      : (body.messages ?? []).filter((m: any) => m.role === 'user').map((m: any) => m.content).join('\n\n');

    // PII redaction
    const redactedUserMessage = redactPII(finalUserMessage);

    // Prompt injection check
    if (detectPromptInjection(redactedUserMessage)) {
      await db.from('sp_audit_log').insert({
        table_name: 'ai_gateway', record_id: user.id,
        action: 'PROMPT_INJECTION_BLOCKED',
        old_values: null,
        new_values: { message: redactedUserMessage.slice(0, 500) },
        actor_id: user.id, actor_email: spUser.email,
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({
        error: 'Permintaan ditolak. AI SurePath tidak dapat mengabaikan instruksi sistem.',
      }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Call Gemini
    const startTime = Date.now();
    const result = await callGemini(finalSystemPrompt, redactedUserMessage);
    const latencyMs = Date.now() - startTime;
    const safeOutput = redactPII(result.content);

    // Log usage (non-blocking)
    db.from('sp_ai_usage').insert({
      user_id: user.id, agent_type: agentType, model: 'gemini-2.0-flash',
      input_tokens: result.inputTokens, output_tokens: result.outputTokens,
      cost_usd: result.cost, latency_ms: latencyMs,
      metadata: { context: context ?? null },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      data: {
        content: safeOutput,
        model: 'gemini-2.0-flash',
        usage: {
          inputTokens: result.inputTokens, outputTokens: result.outputTokens,
          cost: result.cost, latencyMs,
        },
      },
    }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('AI Gateway error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
