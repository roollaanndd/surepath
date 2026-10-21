// ─────────────────────────────────────────────────────────────────────────────
// SurePath secure data gateway — thin dispatcher (v1.30.0)
//
// Deploy: JANGAN deploy fungsi ini dengan menempelkan isi bundel secara inline.
// 21 Okt 2026 cara itu memotong payload di ~8 KB tanpa error, Supabase menerima
// potongannya karena sintaksnya kebetulan valid, dan gateway terdeploy TANPA
// Deno.serve sama sekali — kelima portal mati dan kegagalannya diam. Bundelnya
// ~104 KB; pakai integrasi Supabase-GitHub atau CLI, yang mengirim berkas utuh.
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
import { evaluateTrust } from '../_shared/trust.ts';
import { handleUsersAction } from './actions/users.ts';
import { handleOrdersAction } from './actions/orders.ts';
import { handleClaimsAction } from './actions/claims.ts';
import { handleWalletAction } from './actions/wallet.ts';
import { handleInsurersAction } from './actions/insurers.ts';
import { handleAgentsAction } from './actions/agents.ts';
import { handleNotificationsAction } from './actions/notifications.ts';
import { handleAdminAction } from './actions/admin.ts';
import { handleMiscAction } from './actions/misc.ts';
import { checkRateLimit as sharedCheckRateLimit } from '../_shared/rateLimit.ts';
import { handleTiersAction } from './actions/tiers.ts';
// migration-apply removed v1.53.0 — the migration it applied has been
// deployed and a MASTER_ADMIN-only SQL executor via HTTP is unnecessary
// attack surface.
import { handleQuotationsAction } from './actions/quotations.ts';
import { handleMarketingAction } from './actions/marketing.ts';

// CORS allowlist
const ALLOWED_ORIGINS = ['https://myinsurepath.com', 'https://www.myinsurepath.com'];
// Scoped to this account's Vercel team slug — see supabase/functions/_shared/cors.ts
// for why an unscoped *.vercel.app pattern is too broad.
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+-roollaanndds-projects\.vercel\.app$/i;
const LOCAL_RE = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) || LOCAL_RE.test(origin)) ? origin : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'OPERATOR'];
// FIX v1.44.0 (pentest C2): FINANCE_ROLES excludes OPERATOR — operators should not
// create/update commissions or credit wallets. Previously OPERATOR was in ADMIN_ROLES
// which gave them full financial access via admin_create_commission.
const FINANCE_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR'];

interface Caller { authId: string; email: string; spUser: Record<string, any> | null; role: string | null; isAdmin: boolean; isFinanceAdmin: boolean; userMetadata: Record<string, any> | null; ownerId: string; ownerIds: string[]; }

const PUBLIC_ACTIONS = new Set(['get_insurer_review', 'submit_insurer_decision', 'get_insurer_dashboard', 'insurer_submit_decision_authed', 'insurer_list_payments', 'insurer_upload_policy', 'get_public_quotation', 'confirm_public_quotation']);

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

    // Rate limiting helper — sourced from the shared module (also used by
    // standalone AI/OCR edge functions outside this gateway).
    const checkRateLimit = (identifier: string, limit: number): Promise<boolean> =>
      sharedCheckRateLimit(db, identifier, action, limit);

    // Activity log helper
    const logActivity = (insurerId: string | null, orderId: string | null, logAction: string, details: Record<string, unknown> = {}): void => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
      const userAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;
      db.from('sp_insurer_activity_log').insert({ insurer_id: insurerId, order_id: orderId, action: logAction, details: { ...details, ip, user_agent: userAgent }, ip_address: ip, user_agent: userAgent }).then(() => {}, () => {});
    };

    // ── Jejak aktivitas per pengguna (v2.5.14) ──────────────────────────
    //
    // Dipasang di dispatcher, bukan di 100+ action satu per satu. Setiap aksi
    // terautentikasi lewat sini dengan caller yang SUDAH diverifikasi, jadi
    // cakupannya lengkap dengan sendirinya dan tidak bisa dipalsukan klien —
    // alasan yang sama kenapa gerbang kepercayaan juga duduk di titik ini.
    //
    // NILAI parameter sengaja tidak pernah disimpan. Payload aplikasi ini
    // membawa NIK, foto base64, dan kata sandi; menyalinnya ke tabel audit
    // justru menciptakan salinan kedua dari data yang sedang kita lindungi.
    // Nama kuncinya saja sudah menjawab "mengakses apa".
    const reqStartedAt = Date.now();
    const reqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip') ?? null;
    const reqUserAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;

    const recordActivity = (
      actor: Caller | null,
      status: 'OK' | 'DENIED' | 'ERROR',
      httpStatus: number,
    ): void => {
      // Fire-and-forget: an audit write must never fail the request it audits.
      try {
        const p = params as Record<string, unknown>;
        const target = p?.id ?? p?.order_id ?? p?.claim_id ?? p?.user_id ?? p?.agent_id ?? null;
        db.from('sp_activity_log').insert({
          actor_id:    actor?.spUser?.id ?? null,
          actor_email: actor?.email || null,
          actor_role:  actor?.role ?? null,
          action,
          target_id:   target == null ? null : String(target).slice(0, 100),
          status,
          http_status: httpStatus,
          duration_ms: Date.now() - reqStartedAt,
          param_keys:  p ? Object.keys(p).slice(0, 40) : [],
          ip:          reqIp,
          user_agent:  reqUserAgent,
        }).then(() => {}, () => {});
      } catch { /* never let auditing break the call it is auditing */ }
    };

    // Auth
    let caller: Caller;
    // Dipakai gerbang kepercayaan di bawah. Diambil dari sesi yang sudah
    // diverifikasi, jadi tidak menambah satu pun query.
    let emailConfirmedAt: string | null = null;
    if (PUBLIC_ACTIONS.has(action)) {
      if (action.startsWith('get_insurer_') || action.startsWith('insurer_') || action.startsWith('submit_insurer_') || action.endsWith('_public_quotation')) {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
        const ipAllowed = await checkRateLimit(`ip:${clientIp}`, 60);
        if (!ipAllowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);
      }
      caller = { authId: '', email: '', spUser: null, role: null, isAdmin: false, isFinanceAdmin: false, userMetadata: null, ownerId: '', ownerIds: [] };
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
      emailConfirmedAt = (userData.user.email_confirmed_at ?? null) as string | null;
      // FIX v1.49.2: Use ilike for case-insensitive email match.
      // Previously used .or() with exact match — Google OAuth emails can have
      // different casing than the original signup email.
      const { data: spUser } = await db.from('sp_users').select('*').or(`id.eq.${authId},email.ilike.${email}`).maybeSingle();
      // FIX v1.50.0: canonical owner id. Orders/quotes/notifications are written
      // with sp_users.id, but several reads filtered by auth.users.id — for
      // legacy accounts (sp_users.id ≠ auth id) their own submissions never
      // showed up ("pengajuan tidak tersimpan"). ownerIds carries both ids for
      // reads that must also match legacy rows keyed by auth id.
      const ownerId = spUser?.id ?? authId;
      const ownerIds = [...new Set([ownerId, authId].filter(Boolean))];
      caller = { authId, email, spUser: spUser ?? null, role: spUser?.role ?? null, isAdmin: ADMIN_ROLES.includes(spUser?.role ?? ''), isFinanceAdmin: FINANCE_ROLES.includes(spUser?.role ?? ''), userMetadata, ownerId, ownerIds };
    }

    // ── Gerbang kepercayaan akun (v2.5.6) ─────────────────────────────────
    //
    // SATU tempat, bukan puluhan penjaga tersebar di 103 action. Hanya enam
    // aksi berisiko yang digerbang (lihat _shared/trust.ts); semua aksi baca,
    // simulasi premi, penawaran draf, profil, notifikasi dan Pathy tetap
    // terbuka supaya pendaftar baru masih bisa mencoba produk.
    //
    // Akun yang dibuat sebelum ENFORCEMENT_FROM dibebaskan sepenuhnya, jadi
    // menyalakan gerbang ini tidak mengubah pengalaman satu pun pengguna lama.
    //
    // Ini menutup celah yang terlihat 11 Sep 2026: pendaftar CUSTOMER selalu
    // ditulis `verified: true`, sehingga akun `@example.com` punya akses penuh.
    if (!PUBLIC_ACTIONS.has(action)) {
      const trust = evaluateTrust(
        action,
        { email: caller.email, emailConfirmedAt, spUser: caller.spUser },
        { isAdmin: caller.isAdmin },
      );
      if (!trust.allowed) {
        // Attempts matter as much as successes — a blocked action is exactly
        // what an admin needs to see.
        recordActivity(caller, 'DENIED', 403);
        return json({
          error: trust.message,
          code: trust.code,
          tier: trust.tier,
          required_tier: trust.required,
        }, 403);
      }
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
      await handleTiersAction(action, ctx) ??
      await handleQuotationsAction(action, ctx) ??
      await handleMarketingAction(action, ctx) ??
      await handleMiscAction(action, ctx);

    if (result) {
      recordActivity(caller, result.status < 400 ? 'OK' : 'DENIED', result.status);
      return json(result.body, result.status);
    }
    recordActivity(caller, 'ERROR', 400);
    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
