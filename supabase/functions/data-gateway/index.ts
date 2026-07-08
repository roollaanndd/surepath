// ─────────────────────────────────────────────────────────────────────────────
// SurePath secure data gateway — thin dispatcher (v1.30.0)
//
// All action logic is in actions/*.ts domain modules.
// This file handles: CORS, health check, auth, rate limiting, dispatch.
//
//   browser ──(Supabase JWT)──▶ data-gateway ──(service_role)──▶ Postgres
//                                   │
//                                   └─ dispatches to domain modules:
//                                      users, orders, claims, wallet, insurers,
//                                      agents, notifications, admin, misc
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import type { GatewayContext, ActionResult } from './actions/types.ts';
import { handleUsersAction } from './actions/users.ts';
import { handleOrdersAction } from './actions/orders.ts';
import { handleClaimsAction } from './actions/claims.ts';
import { handleWalletAction } from './actions/wallet.ts';
import { handleInsurersAction } from './actions/insurers.ts';
import { handleAgentsAction } from './actions/agents.ts';
import { handleNotificationsAction } from './actions/notifications.ts';
import { handleAdminAction } from './actions/admin.ts';
import { handleMiscAction } from './actions/misc.ts';

// CORS allowlist
const ALLOWED_ORIGINS = ['https://myinsurepath.com', 'https://www.myinsurepath.com'];
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
const LOCAL_RE = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) || LOCAL_RE.test(origin)) ? origin : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'OPERATOR'];

interface Caller { authId: string; email: string; spUser: Record<string, any> | null; role: string | null; isAdmin: boolean; userMetadata: Record<string, any> | null; }

const PUBLIC_ACTIONS = new Set(['get_insurer_review', 'submit_insurer_decision', 'get_insurer_dashboard', 'insurer_submit_decision_authed', 'insurer_list_payments', 'insurer_upload_policy']);

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', service: 'data-gateway', version: '1.30.0', timestamp: new Date().toISOString() }), { headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-ID': crypto.randomUUID() } });
  }

  const requestId = crypto.randomUUID();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-ID': requestId } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

    const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('RESEND_KEY') ?? '';

    const sendTelegram = (text: string): void => {
      if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }) }).then(() => {}, () => {});
    };

    // Parse action early
    let parsed: any;
    try { parsed = await req.json(); } catch { parsed = { action: null }; }
    const { action, params = {} } = parsed;
    if (!action) return json({ error: 'Missing action' }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limiting helper
    const checkRateLimit = async (identifier: string, limit: number): Promise<boolean> => {
      const now = new Date();
      const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}-${String(now.getUTCHours()).padStart(2,'0')}`;
      try {
        const { error: insErr } = await db.from('sp_rate_limits').insert({ identifier, action, hour_bucket: hourBucket, request_count: 1, last_request: now.toISOString() });
        if (insErr) {
          const { data, error: rpcErr } = await db.rpc('increment_rate_limit', { p_identifier: identifier, p_action: action, p_hour_bucket: hourBucket });
          if (rpcErr) return false;
          return (data ?? 1) <= limit;
        }
        return true;
      } catch { return false; }
    };

    // Activity log helper
    const logActivity = (insurerId: string | null, orderId: string | null, logAction: string, details: Record<string, unknown> = {}): void => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
      const userAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;
      db.from('sp_insurer_activity_log').insert({ insurer_id: insurerId, order_id: orderId, action: logAction, details: { ...details, ip, user_agent: userAgent }, ip_address: ip, user_agent: userAgent }).then(() => {}, () => {});
    };

    // Auth
    let caller: Caller;
    if (PUBLIC_ACTIONS.has(action)) {
      if (action.startsWith('get_insurer_') || action.startsWith('insurer_') || action.startsWith('submit_insurer_')) {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
        const ipAllowed = await checkRateLimit(`ip:${clientIp}`, 60);
        if (!ipAllowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);
      }
      caller = { authId: '', email: '', spUser: null, role: null, isAdmin: false, userMetadata: null };
    } else {
      const authHeader = req.headers.get('authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) return json({ error: 'Unauthorized: missing bearer token' }, 401);
      const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: 'Unauthorized: invalid token' }, 401);
      const authId = userData.user.id;
      const email = (userData.user.email ?? '').toLowerCase();
      const userMetadata = (userData.user.user_metadata ?? null) as Record<string, any> | null;
      const { data: spUser } = await db.from('sp_users').select('*').or(`id.eq.${authId},email.eq.${email}`).maybeSingle();
      caller = { authId, email, spUser: spUser ?? null, role: spUser?.role ?? null, isAdmin: ADMIN_ROLES.includes(spUser?.role ?? ''), userMetadata };
    }

    // Build context for modules
    const ctx: GatewayContext = { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY };

    // Dispatch to domain modules (first non-null result wins)
    const result: ActionResult | null =
      await handleUsersAction(action, ctx) ??
      await handleOrdersAction(action, ctx) ??
      await handleClaimsAction(action, ctx) ??
      await handleWalletAction(action, ctx) ??
      await handleInsurersAction(action, ctx) ??
      await handleAgentsAction(action, ctx) ??
      await handleNotificationsAction(action, ctx) ??
      await handleAdminAction(action, ctx) ??
      await handleMiscAction(action, ctx);

    if (result) return json(result.body, result.status);
    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
