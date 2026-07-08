// ─────────────────────────────────────────────────────────────────────────────
// SurePath secure data gateway
//
// Purpose: the browser must NOT read/write sensitive tables (sp_users, sp_clients,
// sp_claims, sp_commissions, sp_policies, sp_payments, …) directly with the public
// anon key. Those tables are being moved behind this gateway:
//
//   browser ──(Supabase JWT)──▶ data-gateway ──(service_role)──▶ Postgres
//                                   │
//                                   └─ verifies caller identity + role, then
//                                      enforces row-level authorization in code.
//
// The sensitive tables get RLS = deny-all to anon/authenticated (see the
// 2026…_lockdown_sensitive_tables.sql migration). service_role bypasses RLS, so
// ONLY this gateway (and other server-side functions) can touch them.
//
// AUTH MODEL: every caller must present a valid Supabase Auth JWT in the
// Authorization header. Role is resolved from sp_users. NOTE: admins must be
// migrated to Supabase Auth for admin operations to authenticate here — until
// then, admin_* actions will be rejected (by design — no unverifiable callers).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS allowlist (inlined — keeps this critical gateway self-contained, no
// cross-file dependency at deploy time).
const ALLOWED_ORIGINS = [
  'https://myinsurepath.com',
  'https://www.myinsurepath.com',
];
const PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
// http(s)://localhost covers dev servers AND the Capacitor Android/iOS WebView
// (origin is https://localhost by default); capacitor://localhost covers iOS
// custom-scheme builds. Without these the native apps can't reach the gateway.
const LOCAL_RE = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;
function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) || LOCAL_RE.test(origin))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'OPERATOR'];

interface Caller {
  authId: string;
  email: string;
  spUser: Record<string, any> | null;
  role: string | null;
  isAdmin: boolean;
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Health check endpoint (GET /functions/v1/data-gateway) ──────────────
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'data-gateway',
      version: '1.25.0',
      timestamp: new Date().toISOString(),
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  // Generate request ID for tracing
  const requestId = crypto.randomUUID();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-ID': requestId } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY          = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

    // ── Push notification helpers (best-effort, fire-and-forget) ──────────────
    const TELEGRAM_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
    const RESEND_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';

    const sendTelegram = (text: string): void => {
      if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      }).then(() => {}, () => {});
    };

    const sendInsurerEmail = (
      to: string, insurerName: string, orderNumber: string,
      clientName: string, productName: string, totalPremium: number, orderId: string,
    ): void => {
      if (!RESEND_KEY) return;
      const esc = (s: string) => s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
      );
      const reviewUrl  = `https://myinsurepath.com/insurer/orders/${orderId}`;
      const dashUrl    = `https://myinsurepath.com/insurer/dashboard`;
      const premiumFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPremium);
      const subject    = `Pengajuan Polis Baru: ${orderNumber} - ${clientName}`;
      const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#0f172a;padding:28px 32px;"><table width="100%"><tr>
  <td><span style="font-size:20px;font-weight:900;color:#fff;">Sure<span style="color:#f97316;">Path</span></span>
      <span style="display:block;font-size:10px;font-weight:700;color:#64748b;letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Insurer Portal</span></td>
  <td align="right"><span style="background:#f97316;color:#fff;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px;">Pengajuan Baru</span></td>
</tr></table></td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:14px;color:#64748b;margin:0 0 8px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Kepada Tim ${esc(insurerName)}</p>
  <h1 style="font-size:26px;font-weight:900;color:#0f172a;margin:0 0 24px;letter-spacing:-1px;line-height:1.2;">Terdapat pengajuan polis<br/>baru yang perlu ditinjau</h1>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">No. Order</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:800;color:#f97316;font-family:monospace;">${esc(orderNumber)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Nasabah</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(clientName)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Produk</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(productName)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Total Premi</td>
          <td align="right" style="padding:6px 0;font-size:16px;font-weight:900;color:#f97316;border-top:1px solid #e2e8f0;">${premiumFmt}</td></tr>
    </table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
    <td width="48%" align="center"><a href="${reviewUrl}" style="display:block;background:#0f172a;color:#fff;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:12px;text-align:center;">Review Order Ini</a></td>
    <td width="4%"></td>
    <td width="48%" align="center"><a href="${dashUrl}" style="display:block;background:#f97316;color:#fff;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:12px;text-align:center;">Dashboard Saya</a></td>
  </tr></table>
  <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;">Link review berlaku 7 hari. Jangan teruskan email ini ke pihak lain.</p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;"><table width="100%"><tr>
  <td style="font-size:11px;color:#94a3b8;font-weight:600;">PT Ruang Proteksi Indonesia</td>
  <td align="right" style="font-size:11px;color:#94a3b8;">myinsurepath.com</td>
</tr></table></td></tr>
</table></td></tr></table>
</body></html>`;
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'SurePath <noreply@myinsurepath.com>', to: [to], subject, html }),
      }).then(() => {}, () => {});
    };

    // ── 0) Parse the action early so we can skip JWT for public actions ──────
    try { var parsed = await req.json(); } catch { var parsed = { action: null }; }
    const { action, params = {} } = parsed;
    if (!action) return json({ error: 'Missing action' }, 400);

    // Service-role DB client — used by all actions (both JWT-authed and token-authed)
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Rate limiting helper ────────────────────────────────────────────────
    // Checks sp_rate_limits table. Returns true if request allowed, false if
    // rate limit exceeded. Limits: 200/hr per insurer, 60/hr per IP for public.
    const checkRateLimit = async (identifier: string, limit: number): Promise<boolean> => {
      const now = new Date();
      const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}-${String(now.getUTCHours()).padStart(2,'0')}`;
      try {
        // Try insert first. If conflict (row exists), update count atomically.
        const { error: insErr } = await db.from('sp_rate_limits').insert({
          identifier, action, hour_bucket: hourBucket,
          request_count: 1, last_request: now.toISOString(),
        });
        if (insErr) {
          // Row exists — increment count via RPC
          const { data, error: rpcErr } = await db.rpc('increment_rate_limit', {
            p_identifier: identifier, p_action: action, p_hour_bucket: hourBucket,
          });
          if (rpcErr) return false; // fail-closed (block on DB error for security)
          return (data ?? 1) <= limit;
        }
        return true; // first request this hour
      } catch {
        return false; // fail-closed
      }
    };

    // ── Activity log helper ─────────────────────────────────────────────────
    const logActivity = (insurerId: string | null, orderId: string | null, logAction: string, details: Record<string, unknown> = {}): void => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
      const userAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;
      db.from('sp_insurer_activity_log').insert({
        insurer_id: insurerId,
        order_id: orderId,
        action: logAction,
        details: { ...details, ip, user_agent: userAgent },
        ip_address: ip,
        user_agent: userAgent,
      }).then(() => {}, () => {});
    };

    // Public actions that don't require a Supabase JWT — they use their own
    // token-based auth (review token or insurer auth token) passed in params.
    const PUBLIC_ACTIONS = new Set([
      'get_insurer_review',           // /review/:uuid page (review token)
      'submit_insurer_decision',      // /review/:uuid page (review token)
      'get_insurer_dashboard',        // /insurerapp dashboard (auth token)
      'insurer_submit_decision_authed', // /insurerapp dashboard (auth token)
      'insurer_list_payments',        // /insurerapp payments tab (auth token)
      'insurer_upload_policy',        // /insurerapp policy upload (auth token)
    ]);

    let caller: Caller;

    if (PUBLIC_ACTIONS.has(action)) {
      // ── Rate limit public actions by IP (60 req/hour) ────────────────────
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
      const ipAllowed = await checkRateLimit(`ip:${clientIp}`, 60);
      if (!ipAllowed) {
        return json({ error: 'Rate limit exceeded. Terlalu banyak request dari IP ini. Coba lagi dalam 1 jam.' }, 429);
      }

      // Skip JWT auth — the action will validate its own token from params
      caller = {
        authId: '',
        email: '',
        spUser: null,
        role: null,
        isAdmin: false,
      };
    } else {
      // ── 1) Authenticate the caller via their Supabase JWT ──────────────────
      const authHeader = req.headers.get('authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) return json({ error: 'Unauthorized: missing bearer token' }, 401);

      // Verify the JWT by asking Supabase Auth who this token belongs to.
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: 'Unauthorized: invalid token' }, 401);

      const authId = userData.user.id;
      const email  = (userData.user.email ?? '').toLowerCase();

      // ── 2) Resolve the caller's SurePath identity + role (service_role) ────
      const { data: spUser } = await db
        .from('sp_users')
        .select('*')
        .or(`id.eq.${authId},email.eq.${email}`)
        .maybeSingle();

      caller = {
        authId,
        email,
        spUser: spUser ?? null,
        role: spUser?.role ?? null,
        isAdmin: ADMIN_ROLES.includes(spUser?.role ?? ''),
      };
    }

    // ── 3) Authorized operations ───────────────────────────────────────────────
    switch (action) {
      // Caller's own profile — never exposes other users' PII.
      case 'get_my_profile': {
        if (!caller.spUser) return json({ error: 'No SurePath profile linked to this account' }, 404);
        return json({ data: caller.spUser });
      }

      // ── Agent agreement: save acceptance (service_role bypasses RLS) ──────
      // Previously this was a direct client-side insert which went through
      // RLS. The RLS policy + foreign key + sequence could all cause silent
      // failures. Routing through the gateway (service_role) is more robust
      // and consistent with how all other mutations work.
      case 'accept_agreement': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const fullName = String(params.full_name ?? '').trim();
        const ktpNumber = String(params.ktp_number ?? '').trim();
        if (fullName.length < 3) return json({ error: 'Name too short' }, 400);
        if (!/^[0-9]{16}$/.test(ktpNumber)) return json({ error: 'KTP must be 16 digits' }, 400);

        const { data: existing } = await db
          .from('sp_agent_agreements')
          .select('id')
          .eq('agent_id', caller.authId)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        if (existing) return json({ error: 'ALREADY_ACCEPTED' }, 409);

        const { data: agreement, error: agErr } = await db
          .from('sp_agent_agreements')
          .insert({
            agent_id: caller.authId,
            doc_version: 'v1.0-2026',
            full_name: fullName,
            ktp_number: ktpNumber,
            user_agent: String(params.user_agent ?? '').slice(0, 255) || null,
          })
          .select()
          .single();
        if (agErr) {
          console.error('accept_agreement error:', agErr);
          return json({ error: agErr.message }, 400);
        }
        return json({ data: agreement });
      }

      // ── Agent agreement: check if already accepted ────────────────────────
      case 'get_my_agreement': {
        if (!caller.spUser) return json({ data: null });
        const { data: ag } = await db
          .from('sp_agent_agreements')
          .select('*')
          .eq('agent_id', caller.authId)
          .eq('doc_version', 'v1.0-2026')
          .maybeSingle();
        return json({ data: ag ?? null });
      }

      // Self-service profile creation: returns the caller's profile, creating it
      // from their verified JWT identity if missing. Used right after signup
      // (customer or agent) and as a self-heal at login. The row id is ALWAYS
      // the caller's auth id and the email is ALWAYS the verified token email —
      // never client-supplied. Role is restricted to CUSTOMER/AGENT; agents
      // start unverified until an admin approves them.
      case 'ensure_profile': {
        if (caller.spUser) return json({ data: caller.spUser });
        const meta = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
        const reqRole = String(params.role ?? meta.role ?? 'CUSTOMER').toUpperCase();
        const role = reqRole === 'AGENT' ? 'AGENT' : 'CUSTOMER';
        const insertRow: Record<string, unknown> = {
          id: authId,
          email,
          name: String(params.name ?? meta.name ?? email.split('@')[0]),
          phone: String(params.phone ?? meta.phone ?? ''),
          ktp: params.ktp ?? meta.ktp ?? null,
          address: params.address ?? meta.address ?? null,
          role,
          trust_score: role === 'AGENT' ? 80 : 85,
          verified: role !== 'AGENT',
          agent_code: role === 'AGENT'
            ? 'SP-AGT-' + String(Math.floor(1000 + Math.random() * 9000))
            : 'SP-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
        };
        if (role === 'AGENT') {
          insertRow.commission_rate = 0.1;
          insertRow.monthly_target = 50000000;
        }
        // Referral linkage — code travels in signup metadata (survives the
        // email-confirmation flow, even on another device) or explicit param.
        // Matches the upline's agent_code OR referral_code.
        // SECURITY: sanitize the ref code before interpolating into a PostgREST
        // .or() string — otherwise a value like "xyz,id.eq.<admin_uuid>" would
        // extend the filter and match arbitrary rows (filter injection).
        const rawRefCode = String(params.referral_code ?? meta.referral_code ?? '').trim();
        const refCode = rawRefCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);
        if (refCode) {
          // SECURITY: refCode is sanitized (alphanumeric + dash only, max 32 chars)
          // so it's safe to interpolate into the PostgREST .or() string filter.
          // The array form .or([{...}, {...}]) is NOT supported by the Supabase
          // JS client — it only accepts a string. Using the array form causes a
          // silent crash that breaks registration.
          const { data: upline } = await db
            .from('sp_users')
            .select('id')
            .or(`agent_code.eq.${refCode},referral_code.eq.${refCode}`)
            .neq('id', authId)
            .maybeSingle();
          if (upline) insertRow.upline_id = upline.id;
        }
        const { data, error } = await db.from('sp_users').insert(insertRow).select().single();
        if (error) return json({ error: error.message }, 400);
        // Auto-notify admins of new registration (non-blocking, best-effort)
        const roleLabel = role === 'AGENT' ? 'Agen' : 'Customer';
        db.from('sp_admin_notifications').insert({
          type: `NEW_${role}`,
          title: `${roleLabel} Baru Mendaftar`,
          body: `${String(insertRow.name)} (${email}) baru saja mendaftar sebagai ${roleLabel.toLowerCase()}.`,
          read: false,
          metadata: { user_id: (data as any).id, role, email },
        }).then(() => {}, () => {});
        // Telegram push to admin team
        const tgTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        sendTelegram(
          `Akun ${roleLabel} Baru - SurePath\n\n` +
          `Nama: ${String(insertRow.name)}\n` +
          `Email: ${email}\n` +
          `HP: ${String(insertRow.phone) || '-'}\n` +
          `Waktu: ${tgTime} WIB\n\n` +
          `Buka Admin Panel: https://myinsurepath.com/admin`
        );
        return json({ data });
      }

      // ── Customer: get my orders (self-purchases where agent_id = caller) ──
      case 'get_my_orders': {
        const { data, error } = await db
          .from('sp_policy_orders')
          .select('*')
          .eq('agent_id', caller.authId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Customer: cancel my order (only SUBMITTED/UNDER_REVIEW) ──────────
      case 'cancel_my_order': {
        if (!params.order_id) return json({ error: 'Missing order_id' }, 400);
        const { data, error } = await db
          .from('sp_policy_orders')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', params.order_id)
          .eq('agent_id', caller.authId)
          .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'Order not found or cannot be cancelled' }, 404);
        return json({ data });
      }

      // ── Customer: get my claims ──────────────────────────────────────────
      case 'get_my_claims': {
        const { data, error } = await db
          .from('sp_claims')
          .select('*')
          .eq('user_id', caller.authId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Customer: submit a claim ─────────────────────────────────────────
      case 'submit_claim': {
        const insertRow: Record<string, unknown> = {
          user_id: caller.authId,
          claim_type: String(params.claim_type ?? 'VEHICLE'),
          description: String(params.description ?? ''),
          location: String(params.location ?? ''),
          amount_estimated: Number(params.amount_estimated ?? 0),
          status: 'SUBMITTED',
        };
        const { data, error } = await db
          .from('sp_claims')
          .insert(insertRow)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        // ── Operator/admin in-app notification ──────────────────────────────
        db.from('sp_admin_notifications').insert({
          type: 'NEW_CLAIM',
          title: 'Klaim Baru Diajukan',
          body: `${String((data as any).claim_type ?? 'Klaim')} · Rp ${Number((data as any).amount_estimated ?? 0).toLocaleString('id-ID')}`,
          read: false,
          metadata: { claim_id: (data as any).id, user_id: caller.authId },
        }).then(() => {}, () => {});
        return json({ data });
      }

      // ── Get my notifications (works for both customers and agents) ───────
      case 'get_my_notifications': {
        const { data, error } = await db
          .from('sp_notifications')
          .select('*')
          .eq('agent_id', caller.authId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Apply a referral code to the caller's own profile (post-signup) ────
      // Sets upline_id once; matches agent_code OR referral_code; never self.
      case 'apply_referral': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        // SECURITY: sanitize the code — PostgREST .or() string interpolation
        // is otherwise vulnerable to filter injection.
        const rawCode = String(params.code ?? '').trim();
        const code = rawCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);
        if (!code) return json({ error: 'Missing code' }, 400);
        if (caller.spUser.upline_id) return json({ data: { upline_id: caller.spUser.upline_id, already_set: true } });
        const { data: upline, error: lookupErr } = await db
          .from('sp_users')
          .select('id')
          .or(`agent_code.eq.${code},referral_code.eq.${code}`)
          .neq('id', caller.spUser.id)
          .maybeSingle();
        if (lookupErr) return json({ error: lookupErr.message }, 400);
        if (!upline) return json({ error: 'Invalid referral code' }, 404);
        const { error } = await db
          .from('sp_users')
          .update({ upline_id: upline.id, updated_at: new Date().toISOString() })
          .eq('id', caller.spUser.id);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { upline_id: upline.id } });
      }

      // An agent's own clients only. Admins may pass an explicit agent_id.
      case 'list_my_clients': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const agentId = caller.isAdmin && params.agent_id ? params.agent_id : caller.spUser.id;
        const { data, error } = await db.from('sp_clients').select('*').eq('agent_id', agentId);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Update FCM push notification token ────────────────────────────────
      // Called by the client after requestNotificationPermission() succeeds.
      // Stores the token on sp_users.fcm_token so edge functions can send push.
      case 'update_fcm_token': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const token = String(params.token ?? '').trim();
        if (!token) return json({ error: 'Missing token' }, 400);
        const { error: updErr } = await db
          .from('sp_users')
          .update({ fcm_token: token, updated_at: new Date().toISOString() })
          .eq('id', caller.spUser.id);
        if (updErr) return json({ error: updErr.message }, 400);
        return json({ data: { ok: true } });
      }

      // Admin-only: list users. Optional role filter via params.role.
      case 'admin_list_users': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db
          .from('sp_users')
          .select('id, email, name, phone, role, agent_code, tier, verified, commission_rate, allowed_apps, tc_accepted, tc_accepted_at, tnc_ref_number, created_at, profile_photo_url, ktp_document_url, upline_id, referral_code, address, ktp, trust_score, monthly_target')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (params.role) q = q.eq('role', params.role);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // Admin: get full profile of a single user
      case 'admin_get_user': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.user_id) return json({ error: 'user_id required' }, 400);
        const { data, error } = await db.from('sp_users').select('*').eq('id', String(params.user_id)).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Operator-friendly: list pending agents (unverified AGENT role) ────
      // Returns full profile + agreement info so operator can review docs.
      case 'admin_list_pending_agents': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data: agents, error: agErr } = await db.from('sp_users')
          .select('id, email, name, phone, agent_code, ktp, address, trust_score, commission_rate, profile_photo_url, ktp_document_url, verified, created_at')
          .eq('role', 'AGENT')
          .eq('verified', false)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 100));
        if (agErr) return json({ error: agErr.message }, 400);
        // Fetch agreements for these agent ids (parallel)
        const agentIds = (agents ?? []).map((a: any) => a.id);
        let agreements: any[] = [];
        if (agentIds.length > 0) {
          const { data: agrData } = await db.from('sp_agent_agreements')
            .select('agent_id, agreement_no, full_name, ktp_number, accepted_at, user_agent')
            .in('agent_id', agentIds)
            .order('accepted_at', { ascending: false });
          agreements = agrData ?? [];
        }
        // Map: agent_id → latest agreement
        const agrMap: Record<string, any> = {};
        for (const a of agreements) {
          if (!agrMap[a.agent_id]) agrMap[a.agent_id] = a; // first = latest (sorted desc)
        }
        const result = (agents ?? []).map((a: any) => ({
          ...a,
          agreement: agrMap[a.id] ?? null,
        }));
        return json({ data: result });
      }

      // ── Operator-friendly: get agent detail with agreement + documents ────
      case 'admin_get_agent_detail': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        const { data: agent, error: agErr } = await db.from('sp_users')
          .select('*')
          .eq('id', String(params.agent_id))
          .maybeSingle();
        if (agErr) return json({ error: agErr.message }, 400);
        if (!agent) return json({ error: 'Agent not found' }, 404);
        // Fetch all agreements for this agent (history)
        const { data: agrHistory } = await db.from('sp_agent_agreements')
          .select('id, agreement_no, doc_version, full_name, ktp_number, accepted_at, user_agent')
          .eq('agent_id', String(params.agent_id))
          .order('accepted_at', { ascending: false });
        return json({ data: { agent, agreements: agrHistory ?? [] } });
      }

      // ── Operator-friendly: verify or reject an agent ─────────────────────
      // Sets verified=true (approve) or false (reject). Optionally also
      // updates reviewer notes by storing them in the `address` field
      // (we don't have a dedicated reviewer_notes column for sp_users).
      // The gateway already auto-creates a NEW_AGENT admin notification on
      // ensure_profile; we don't need a follow-up notification here.
      case 'admin_verify_agent': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        const approve = params.approve !== false; // default true
        const { data, error } = await db.from('sp_users')
          .update({
            verified: !!approve,
            trust_score: approve ? 85 : 50,
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(params.agent_id))
          .select('id, name, email, verified, trust_score')
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        // Insert admin notification about the decision
        db.from('sp_admin_notifications').insert({
          type: approve ? 'AGENT_VERIFIED' : 'AGENT_REJECTED',
          title: approve ? 'Agen Diverifikasi' : 'Agen Ditolak',
          body: `${String((data as any)?.name ?? 'Agen')} (${String((data as any)?.email ?? '')}) ${approve ? 'telah diverifikasi' : 'ditolak oleh operator'}.`,
          read: false,
          metadata: { agent_id: params.agent_id, approved: approve, reviewer_id: caller.authId },
        }).then(() => {}, () => {});
        return json({ data });
      }

      // ── Insurer Review Flow (token-based, no JWT required) ────────────────
      // These actions are called from the public /review/:uuid page and the
      // /insurer-portal dashboard. Auth is via the review token or insurer
      // auth token — NOT the Supabase JWT. This is intentional because
      // insurers don't have Supabase Auth accounts.

      // Admin/Operator: generate review token + send email to insurer PIC
      // Called when operator approves an order — triggers the insurer review flow.
      case 'admin_send_insurer_review_link': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const orderId = String(params.order_id ?? '');
        if (!orderId) return json({ error: 'order_id required' }, 400);

        // Fetch order
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, total_premium, insurer_id, insurer_name, status')
          .eq('id', orderId)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found' }, 404);
        if (!order.insurer_id) return json({ error: 'Order has no insurer assigned' }, 400);

        // Fetch insurer email
        const { data: ins, error: insErr } = await db.from('sp_insurers')
          .select('id, name, admin_email, pic_email, pic_name')
          .eq('id', order.insurer_id)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        const insurerEmail = ins?.pic_email || ins?.admin_email;
        if (!insurerEmail) return json({ error: 'Insurer has no email configured' }, 400);

        // Check if there's already an active (non-expired, non-actioned) token
        const { data: existing } = await db.from('sp_review_tokens')
          .select('id, token, expires_at, insurer_action')
          .eq('order_id', orderId)
          .is('insurer_action', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        let reviewToken: string;
        let reviewUrl: string;
        if (existing && existing.length > 0) {
          // Reuse existing active token
          reviewToken = existing[0].token;
        } else {
          // Create new token (7-day expiry)
          reviewToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { error: tkErr } = await db.from('sp_review_tokens').insert({
            token: reviewToken,
            order_id: orderId,
            created_by: caller.authId,
            expires_at: expiresAt,
            accessed_count: 0,
          });
          if (tkErr) return json({ error: tkErr.message }, 400);
        }

        const appOrigin = 'https://myinsurepath.com';
        reviewUrl = `${appOrigin}/review/${reviewToken}`;

        // Update token with review URL
        await db.from('sp_review_tokens').update({ review_url: reviewUrl }).eq('token', reviewToken).then(() => {}, () => {});

        // Send email via Resend
        if (insurerEmail && RESEND_KEY) {
          const esc = (s: string) => s.replace(/[&<>"']/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
          const premiumFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.total_premium ?? 0);
          const subject = `Pengajuan Polis Baru: ${order.order_number} - ${order.client_name}`;
          const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#003B2F;padding:28px 32px;">
  <span style="font-size:20px;font-weight:900;color:#fff;">Sure<span style="color:#00C16A;">Path</span></span>
  <span style="display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Insurer Review Request</span>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:14px;color:#64748b;margin:0 0 8px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Kepada ${esc(ins?.pic_name || 'Tim ' + (ins?.name || 'Penanggung'))}</p>
  <h1 style="font-size:24px;font-weight:900;color:#0f172a;margin:0 0 24px;letter-spacing:-1px;line-height:1.3;">Terdapat pengajuan polis<br/>baru yang perlu ditinjau</h1>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">No. Order</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:800;color:#00C16A;font-family:monospace;">${esc(order.order_number)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Nasabah</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(order.client_name)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Produk</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(order.product_name)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Total Premi</td>
          <td align="right" style="padding:6px 0;font-size:16px;font-weight:900;color:#00C16A;border-top:1px solid #e2e8f0;">${premiumFmt}</td></tr>
    </table>
  </td></tr></table>
  <a href="${reviewUrl}" style="display:block;background:#00C16A;color:#fff;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 24px;border-radius:12px;text-align:center;margin-bottom:16px;">Review Pengajuan Ini</a>
  <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;">Link review berlaku 7 hari. Di link tersebut Anda dapat: menyetujui, meminta informasi tambahan, atau menolak pengajuan.</p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
  <span style="font-size:11px;color:#94a3b8;font-weight:600;">PT Ruang Proteksi Indonesia · myinsurepath.com</span>
</td></tr>
</table></td></tr></table>
</body></html>`;
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'SurePath <noreply@myinsurepath.com>', to: [insurerEmail], subject, html }),
          }).then(() => {}, () => {});
        }

        // Send Telegram alert
        sendTelegram(
          `Link Review Insurer Dikirim - SurePath\n\n` +
          `Insurer: ${ins?.name ?? '-'}\n` +
          `No. Order: ${order.order_number}\n` +
          `Nasabah: ${order.client_name}\n` +
          `Email PIC: ${insurerEmail}\n` +
          `Link: ${reviewUrl}\n\n` +
          `Insurer dapat: Approve / Request Info / Decline`
        );

        // Create admin notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_REVIEW_SENT',
          title: 'Link Review Dikirim ke Insurer',
          body: `${ins?.name ?? 'Insurer'} — ${order.order_number} (${order.client_name})`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, review_url: reviewUrl, insurer_email: insurerEmail },
        }).then(() => {}, () => {});

        return json({ data: { success: true, review_url: reviewUrl, insurer_email: insurerEmail } });
      }

      // ── Admin: list all insurer auth tokens (for CMS token management) ────
      case 'admin_list_insurer_tokens': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, token, email, expires_at, used_at, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        // Enrich with insurer name
        const insurerIds = [...new Set((data ?? []).map((t: any) => t.insurer_id))];
        const { data: insurers } = await db.from('sp_insurers')
          .select('id, name')
          .in('id', insurerIds);
        const insurerMap: Record<string, string> = {};
        for (const ins of (insurers ?? [])) insurerMap[ins.id] = ins.name;
        const enriched = (data ?? []).map((t: any) => ({ ...t, insurer_name: insurerMap[t.insurer_id] ?? 'Unknown' }));
        return json({ data: enriched });
      }

      // ── Admin: revoke an insurer auth token (instant logout) ──────────────
      case 'admin_revoke_insurer_token': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const tokenId = String(params.token_id ?? '');
        if (!tokenId) return json({ error: 'token_id required' }, 400);
        const { error } = await db.from('sp_insurer_auth_tokens').delete().eq('id', tokenId);
        if (error) return json({ error: error.message }, 400);
        // Audit notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_TOKEN_REVOKED',
          title: 'Token Insurer Dihapus',
          body: `Admin menghapus token akses insurer.`,
          read: false,
          metadata: { token_id: tokenId, revoked_by: caller.authId },
        }).then(() => {}, () => {});
        return json({ data: { success: true } });
      }

      // ── Admin: generate a new insurer auth token + return magic link ──────
      case 'admin_generate_insurer_token': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        // Fetch insurer
        const { data: ins, error: insErr } = await db.from('sp_insurers')
          .select('id, name, pic_email, admin_email')
          .eq('id', insurerId)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        if (!ins) return json({ error: 'Insurer not found' }, 404);
        const email = ins.pic_email || ins.admin_email;
        if (!email) return json({ error: 'Insurer has no email configured (pic_email or admin_email)' }, 400);
        // Generate new token (7-day rolling)
        const newToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: tkErr } = await db.from('sp_insurer_auth_tokens').insert({
          insurer_id: insurerId,
          token: newToken,
          email,
          expires_at: expiresAt,
        });
        if (tkErr) return json({ error: tkErr.message }, 400);
        const magicLink = `https://myinsurepath.com/insurerapp?token=${newToken}`;
        // Audit notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_TOKEN_GENERATED',
          title: 'Token Insurer Baru Dibuat',
          body: `Token akses baru untuk ${ins.name}. Link: ${magicLink}`,
          read: false,
          metadata: { insurer_id: insurerId, token_id: newToken, generated_by: caller.authId },
        }).then(() => {}, () => {});
        return json({ data: { success: true, token: newToken, magic_link: magicLink, insurer_name: ins.name, email } });
      }

      // ── Admin: list all review tokens (for CMS review link management) ────
      case 'admin_list_review_tokens': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_review_tokens')
          .select('id, token, order_id, expires_at, insurer_action, insurer_notes, actioned_at, accessed_count, last_accessed_at, created_at, review_url')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        // Enrich with order info
        const orderIds = [...new Set((data ?? []).map((t: any) => t.order_id))];
        const { data: orders } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, insurer_name, status')
          .in('id', orderIds);
        const orderMap: Record<string, any> = {};
        for (const o of (orders ?? [])) orderMap[o.id] = o;
        const enriched = (data ?? []).map((t: any) => ({
          ...t,
          order_number: orderMap[t.order_id]?.order_number ?? null,
          client_name: orderMap[t.order_id]?.client_name ?? null,
          product_name: orderMap[t.order_id]?.product_name ?? null,
          insurer_name: orderMap[t.order_id]?.insurer_name ?? null,
          order_status: orderMap[t.order_id]?.status ?? null,
        }));
        return json({ data: enriched });
      }

      // ── Admin: list insurer activity log (audit trail) ────────────────────
      case 'admin_list_insurer_activity': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_insurer_activity_log')
          .select('id, insurer_id, order_id, action, details, ip_address, user_agent, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 100));
        if (params.insurer_id) q = q.eq('insurer_id', params.insurer_id);
        if (params.action) q = q.eq('action', params.action);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        // Enrich with insurer name + order number
        const insurerIds = [...new Set((data ?? []).map((l: any) => l.insurer_id).filter(Boolean))];
        const orderIds = [...new Set((data ?? []).map((l: any) => l.order_id).filter(Boolean))];
        const [insRes, ordRes] = await Promise.all([
          insurerIds.length > 0 ? db.from('sp_insurers').select('id, name').in('id', insurerIds) : Promise.resolve({ data: [] }),
          orderIds.length > 0 ? db.from('sp_policy_orders').select('id, order_number, client_name').in('id', orderIds) : Promise.resolve({ data: [] }),
        ]);
        const insMap: Record<string, string> = {};
        for (const i of (insRes.data ?? [])) insMap[i.id] = i.name;
        const ordMap: Record<string, any> = {};
        for (const o of (ordRes.data ?? [])) ordMap[o.id] = o;
        const enriched = (data ?? []).map((l: any) => ({
          ...l,
          insurer_name: l.insurer_id ? (insMap[l.insurer_id] ?? 'Unknown') : null,
          order_number: l.order_id ? (ordMap[l.order_id]?.order_number ?? null) : null,
          client_name: l.order_id ? (ordMap[l.order_id]?.client_name ?? null) : null,
        }));
        return json({ data: enriched });
      }

      // ── Admin: get/set insurer API config ─────────────────────────────────
      case 'admin_get_insurer_api_config': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        const { data, error } = await db.from('sp_insurer_api_configs')
          .select('*')
          .eq('insurer_id', insurerId)
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      case 'admin_save_insurer_api_config': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        const endpointUrl = String(params.endpoint_url ?? '');
        const apiKey = String(params.api_key ?? '');
        const webhookSecret = String(params.webhook_secret ?? '');
        const isActive = params.is_active !== false;
        if (!insurerId || !endpointUrl) return json({ error: 'insurer_id and endpoint_url required' }, 400);
        // SSRF guard: block private IPs + localhost
        const isPrivate = /^(https?:\/\/)(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1|fc00:|fe80:)/i.test(endpointUrl);
        if (isPrivate) return json({ error: 'Endpoint URL tidak boleh private/localhost' }, 400);
        const { data, error } = await db.from('sp_insurer_api_configs')
          .upsert({
            insurer_id: insurerId,
            endpoint_url: endpointUrl,
            api_key: apiKey || null,
            webhook_secret: webhookSecret || null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'insurer_id' })
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        logActivity(insurerId, null, 'API_CONFIG_SAVED', { endpoint_url: endpointUrl, is_active: isActive });
        return json({ data });
      }

      // Public: get order details by review token (for /review/:uuid page)
      case 'get_insurer_review': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        // Load token
        const { data: rt, error: rtErr } = await db.from('sp_review_tokens')
          .select('id, token, order_id, expires_at, insurer_action, insurer_notes, actioned_at, accessed_count, reminder_count')
          .eq('token', token)
          .maybeSingle();
        if (rtErr) return json({ error: rtErr.message }, 400);
        if (!rt) return json({ error: 'Invalid token' }, 404);
        if (new Date(rt.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Increment accessed_count (non-blocking)
        db.from('sp_review_tokens').update({ accessed_count: (rt.accessed_count ?? 0) + 1, last_accessed_at: new Date().toISOString() })
          .eq('id', rt.id).then(() => {}, () => {});
        // Load order
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('*')
          .eq('id', rt.order_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found' }, 404);
        // Load insurer info
        let insurer: any = null;
        if (order.insurer_id) {
          const { data: ins } = await db.from('sp_insurers')
            .select('id, name, logo_url, admin_name, admin_email, pic_name, pic_email, pic_phone')
            .eq('id', order.insurer_id)
            .maybeSingle();
          insurer = ins;
        }
        // ── Log activity (review page opened) ───────────────────────────────
        logActivity(order.insurer_id ?? null, rt.order_id, 'REVIEW_OPENED', { token_id: rt.id, accessed_count: (rt.accessed_count ?? 0) + 1 });
        return json({ data: { token: rt, order, insurer } });
      }

      // Public: submit insurer decision (APPROVED / REQUEST_INFO / DECLINED)
      case 'submit_insurer_decision': {
        const token = String(params.token ?? '');
        const action = String(params.action ?? '');
        const notes = String(params.notes ?? '');
        if (!token || !action) return json({ error: 'token and action required' }, 400);
        const VALID_ACTIONS = ['APPROVED', 'REQUEST_INFO', 'DECLINED'];
        if (!VALID_ACTIONS.includes(action)) return json({ error: 'Invalid action' }, 400);
        // Notes required for REQUEST_INFO and DECLINED
        if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
          return json({ error: 'Notes required (min 5 chars) for REQUEST_INFO and DECLINED' }, 400);
        }
        // Load token
        const { data: rt, error: rtErr } = await db.from('sp_review_tokens')
          .select('id, order_id, expires_at, insurer_action')
          .eq('token', token)
          .maybeSingle();
        if (rtErr) return json({ error: rtErr.message }, 400);
        if (!rt) return json({ error: 'Invalid token' }, 404);
        if (new Date(rt.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        if (rt.insurer_action) return json({ error: 'Token already acted on', existing_action: rt.insurer_action }, 409);
        // Update token
        const ts = new Date().toISOString();
        const { error: updTokenErr } = await db.from('sp_review_tokens').update({
          insurer_action: action,
          insurer_notes: notes,
          actioned_at: ts,
        }).eq('id', rt.id);
        if (updTokenErr) return json({ error: updTokenErr.message }, 400);
        // Map insurer action → order status
        const orderStatus = action === 'APPROVED' ? 'APPROVED'
          : action === 'REQUEST_INFO' ? 'UNDER_REVIEW'
          : 'REJECTED'; // DECLINED → REJECTED
        // Update order
        const { data: order, error: ordErr } = await db.from('sp_policy_orders').update({
          status: orderStatus,
          insurer_decision: action,
          insurer_decision_notes: notes,
          insurer_decision_at: ts,
          insurer_review_token_id: rt.id,
          reviewer_notes: `Insurer ${action}: ${notes}`,
          reviewed_at: ts,
          updated_at: ts,
        }).eq('id', rt.order_id).select('id, order_number, client_name, agent_id, product_name, insurer_id').maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        // Insert admin notification
        const decisionLabel = action === 'APPROVED' ? 'menyetujui' : action === 'REQUEST_INFO' ? 'meminta info tambahan untuk' : 'menolak';
        db.from('sp_admin_notifications').insert({
          type: `INSURER_${action}`,
          title: `Insurer ${decisionLabel} pengajuan`,
          body: `${order?.order_number ?? 'Order'} — ${order?.client_name ?? ''}: ${notes || '(tanpa catatan)'}`,
          order_id: rt.order_id,
          read: false,
          metadata: { order_id: rt.order_id, action, notes, insurer_id: order?.insurer_id },
        }).then(() => {}, () => {});
        // Insert user/agent notification
        if (order?.agent_id) {
          const userTitle = action === 'APPROVED' ? 'Pengajuan polis disetujui insurer'
            : action === 'REQUEST_INFO' ? 'Insurer meminta info tambahan'
            : 'Pengajuan polis ditolak insurer';
          const userBody = `${order?.order_number ?? ''}: ${notes || 'Mohon lengkapi persyaratan dari insurer.'}`;
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'CLAIM_UPDATE',
            title: userTitle,
            body: userBody,
            read: false,
            metadata: { order_id: rt.order_id, action, notes },
          }).then(() => {}, () => {});
        }
        // Send Telegram alert to admin team
        const tgTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        sendTelegram(
          `Insurer Decision - SurePath\n\n` +
          `Order: ${order?.order_number ?? rt.order_id}\n` +
          `Nasabah: ${order?.client_name ?? '-'}\n` +
          `Decision: ${action}\n` +
          `Notes: ${notes || '-'}\n` +
          `Waktu: ${tgTime} WIB`
        );
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(order?.insurer_id ?? null, rt.order_id, 'DECISION_SUBMITTED', { action, notes, via: 'review_token' });
        return json({ data: { success: true, order_status: orderStatus, action } });
      }

      // Public: get insurer dashboard data (multi-use auth token)
      case 'get_insurer_dashboard': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        // Validate insurer auth token (rolling 7-day, multi-use)
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, email, expires_at, used_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // ── Rate limit per insurer (200 req/hour) ───────────────────────────
        const insurerAllowed = await checkRateLimit(`insurer:${authToken.insurer_id}`, 200);
        if (!insurerAllowed) {
          return json({ error: 'Rate limit exceeded untuk insurer ini. Coba lagi dalam 1 jam.' }, 429);
        }
        // Load insurer
        const { data: insurer, error: insErr } = await db.from('sp_insurers')
          .select('id, name, logo_url, admin_name, admin_email, pic_name, pic_email, pic_phone')
          .eq('id', authToken.insurer_id)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        if (!insurer) return json({ error: 'Insurer not found' }, 404);
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, null, 'DASHBOARD_VIEWED', { email: authToken.email });
        // Load orders for this insurer
        const { data: orders, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, client_phone, product_name, product_code, coverage_type, sum_insured, total_premium, net_premium, status, insurer_decision, insurer_decision_notes, insurer_decision_at, policy_number, policy_document_url, vehicle_image_url, vehicle_details, created_at, reviewed_at, issued_at')
          .eq('insurer_id', insurer.id)
          .order('created_at', { ascending: false })
          .limit(200);
        if (ordErr) return json({ error: ordErr.message }, 400);
        // KPI counts
        const kpi = {
          total: orders?.length ?? 0,
          pending: (orders ?? []).filter((o: any) => !o.insurer_decision).length,
          approved: (orders ?? []).filter((o: any) => o.insurer_decision === 'APPROVED').length,
          request_info: (orders ?? []).filter((o: any) => o.insurer_decision === 'REQUEST_INFO').length,
          declined: (orders ?? []).filter((o: any) => o.insurer_decision === 'DECLINED').length,
          issued: (orders ?? []).filter((o: any) => o.status === 'ISSUED').length,
        };
        // Auto-renew token (rolling 7-day) — non-blocking
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        db.from('sp_insurer_auth_tokens').update({ expires_at: newExpiry, used_at: new Date().toISOString() })
          .eq('id', authToken.id).then(() => {}, () => {});
        return json({ data: { insurer, orders: orders ?? [], kpi, token_expires_at: newExpiry } });
      }

      // Public: insurer submits decision from dashboard (auth token, not review token)
      case 'insurer_submit_decision_authed': {
        const token = String(params.token ?? '');
        const orderId = String(params.order_id ?? '');
        const action = String(params.action ?? '');
        const notes = String(params.notes ?? '');
        if (!token || !orderId || !action) return json({ error: 'token, order_id, action required' }, 400);
        const VALID_ACTIONS = ['APPROVED', 'REQUEST_INFO', 'DECLINED'];
        if (!VALID_ACTIONS.includes(action)) return json({ error: 'Invalid action' }, 400);
        if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
          return json({ error: 'Notes required (min 5 chars) for REQUEST_INFO and DECLINED' }, 400);
        }
        // Validate auth token
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Verify order belongs to this insurer
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, agent_id, product_name, insurer_id, status, insurer_decision')
          .eq('id', orderId)
          .eq('insurer_id', authToken.insurer_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found or not assigned to your insurer' }, 404);
        if (order.insurer_decision) return json({ error: 'Order already has a decision', existing_action: order.insurer_decision }, 409);
        // Map action → order status
        const orderStatus = action === 'APPROVED' ? 'APPROVED'
          : action === 'REQUEST_INFO' ? 'UNDER_REVIEW' : 'REJECTED';
        const ts = new Date().toISOString();
        const { error: updErr } = await db.from('sp_policy_orders').update({
          status: orderStatus,
          insurer_decision: action,
          insurer_decision_notes: notes,
          insurer_decision_at: ts,
          reviewer_notes: `Insurer ${action}: ${notes}`,
          reviewed_at: ts,
          updated_at: ts,
        }).eq('id', orderId);
        if (updErr) return json({ error: updErr.message }, 400);
        // Notifications
        const decisionLabel = action === 'APPROVED' ? 'menyetujui' : action === 'REQUEST_INFO' ? 'meminta info tambahan untuk' : 'menolak';
        db.from('sp_admin_notifications').insert({
          type: `INSURER_${action}`,
          title: `Insurer ${decisionLabel} pengajuan`,
          body: `${order.order_number} — ${order.client_name}: ${notes || '(tanpa catatan)'}`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, action, notes, insurer_id: authToken.insurer_id },
        }).then(() => {}, () => {});
        if (order.agent_id) {
          const userTitle = action === 'APPROVED' ? 'Pengajuan polis disetujui insurer'
            : action === 'REQUEST_INFO' ? 'Insurer meminta info tambahan'
            : 'Pengajuan polis ditolak insurer';
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'CLAIM_UPDATE',
            title: userTitle,
            body: `${order.order_number}: ${notes || 'Mohon lengkapi persyaratan dari insurer.'}`,
            read: false,
            metadata: { order_id: orderId, action, notes },
          }).then(() => {}, () => {});
        }
        sendTelegram(
          `Insurer Decision (Dashboard) - SurePath\n\nOrder: ${order.order_number}\nNasabah: ${order.client_name}\nDecision: ${action}\nNotes: ${notes || '-'}`
        );
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, orderId, 'DECISION_SUBMITTED', { action, notes, via: 'dashboard' });
        return json({ data: { success: true, order_status: orderStatus, action } });
      }

      // Public: insurer lists payments for their orders (auth token)
      case 'insurer_list_payments': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Get all order IDs for this insurer
        const { data: orders } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, total_premium, insurer_id')
          .eq('insurer_id', authToken.insurer_id);
        const orderIds = (orders ?? []).map((o: any) => o.id);
        if (orderIds.length === 0) return json({ data: { payments: [], orders: [] } });
        // Fetch payments for these orders
        const { data: payments, error: payErr } = await db.from('sp_payments')
          .select('id, order_id, amount, currency, status, payment_method, payment_channel, paid_amount, paid_at, payer_email, created_at, updated_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(200);
        if (payErr) return json({ error: payErr.message }, 400);
        // Map order_id → order info for easy lookup
        const orderMap: Record<string, any> = {};
        for (const o of (orders ?? [])) orderMap[o.id] = o;
        const enrichedPayments = (payments ?? []).map((p: any) => ({
          ...p,
          order_number: orderMap[p.order_id]?.order_number ?? null,
          client_name: orderMap[p.order_id]?.client_name ?? null,
          product_name: orderMap[p.order_id]?.product_name ?? null,
          total_premium: orderMap[p.order_id]?.total_premium ?? null,
        }));
        return json({ data: { payments: enrichedPayments } });
      }

      // Public: insurer uploads policy PDF (sets status → ISSUED)
      case 'insurer_upload_policy': {
        const token = String(params.token ?? '');
        const orderId = String(params.order_id ?? '');
        const policyDocumentUrl = String(params.policy_document_url ?? '');
        const policyNumber = String(params.policy_number ?? '');
        if (!token || !orderId || !policyDocumentUrl) return json({ error: 'token, order_id, policy_document_url required' }, 400);
        // Validate insurer auth token
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Verify order belongs to this insurer
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, insurer_id, status, client_name, agent_id')
          .eq('id', orderId)
          .eq('insurer_id', authToken.insurer_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found or not assigned to your insurer' }, 404);
        // Update order
        const ts = new Date().toISOString();
        const { data: updated, error: updErr } = await db.from('sp_policy_orders').update({
          policy_document_url: policyDocumentUrl,
          policy_number: policyNumber || null,
          status: 'ISSUED',
          issued_at: ts,
          updated_at: ts,
        }).eq('id', orderId).select().maybeSingle();
        if (updErr) return json({ error: updErr.message }, 400);
        // Notifications
        db.from('sp_admin_notifications').insert({
          type: 'POLICY_ISSUED',
          title: 'Polis Diterbitkan oleh Insurer',
          body: `${order.order_number} — ${order.client_name}: polis ${policyNumber || '(no number)'} telah diterbitkan.`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, policy_number: policyNumber, insurer_id: authToken.insurer_id },
        }).then(() => {}, () => {});
        if (order.agent_id) {
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'SYSTEM',
            title: 'Polis Diterbitkan!',
            body: `${order.order_number}: polis ${policyNumber || ''} sudah diterbitkan oleh insurer.`,
            read: false,
            metadata: { order_id: orderId, policy_number: policyNumber },
          }).then(() => {}, () => {});
        }
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, orderId, 'POLICY_UPLOADED', { policy_number: policyNumber, document_url: policyDocumentUrl });
        return json({ data: { success: true, order: updated } });
      }

      // Update caller's own profile (safe fields only — role never changes here).
      case 'update_my_profile': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const SAFE = ['name', 'phone', 'address', 'profile_photo_url', 'ktp_document_url'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of SAFE) {
          if (k in params) updates[k] = params[k];
        }
        const { data, error } = await db.from('sp_users').update(updates).eq('id', caller.spUser.id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // Admin: create a new agent profile in sp_users.
      case 'admin_register_agent': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.name || !params.email || !params.phone) return json({ error: 'name, email, phone required' }, 400);
        const agentCode = 'SP-AGT-' + String(Math.floor(1000 + Math.random() * 9000));
        const { data, error } = await db.from('sp_users').insert({
          name: params.name, email: params.email, phone: params.phone,
          ktp: params.ktp ?? null, address: params.address ?? null,
          role: 'AGENT', agent_code: agentCode, commission_rate: 0.1,
          monthly_target: 50000000, trust_score: 80, verified: false,
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // Admin: invite a user to Supabase Auth (sends a magic-link email).
      case 'admin_invite_user': {
        if (caller.role !== 'MASTER_ADMIN') return json({ error: 'Forbidden: MASTER_ADMIN only' }, 403);
        if (!params.email) return json({ error: 'email required' }, 400);
        const invRole = String(params.role ?? 'ADMIN');
        const invName = params.name ? String(params.name) : String(params.email).split('@')[0];
        const { data: inv, error: invErr } = await db.auth.admin.inviteUserByEmail(String(params.email), {
          redirectTo: 'https://myinsurepath.com/admin',
        });
        if (invErr) return json({ error: invErr.message }, 400);
        if (inv.user?.id) {
          await db.from('sp_users').upsert({
            id: inv.user.id,
            email: String(params.email),
            name: invName,
            role: invRole,
          }, { onConflict: 'id' });
        }
        return json({ data: { id: inv.user?.id, email: inv.user?.email } });
      }

      // ── Agent stats — own data only; admins may pass agent_id ──────────────
      case 'get_agent_stats': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const agentId = caller.isAdmin && params.agent_id ? params.agent_id : caller.spUser.id;
        const [commRes, clientRes, policyRes] = await Promise.all([
          db.from('sp_commissions').select('commission_amount, status, created_at').eq('agent_id', agentId),
          db.from('sp_clients').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
          db.from('sp_policies').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('status', 'ACTIVE'),
        ]);
        return json({ data: { commissions: commRes.data ?? [], clientCount: clientRes.count ?? 0, activePolicies: policyRes.count ?? 0 } });
      }

      // ── Admin: update user fields (role, verified, tier, etc.) ──────────
      case 'admin_update_user': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.user_id) return json({ error: 'Missing user_id' }, 400);

        // ── Role escalation matrix ───────────────────────────────────────
        // Only MASTER_ADMIN can set MASTER_ADMIN or ADMIN roles.
        // ADMIN can set the other roles (FINANCE*, INSURANCE_ADMIN, AGENT, etc.)
        // No admin can change their own role (anti-self-escalation).
        // FINANCE_MANAGER / FINANCE / FINANCE_DIRECTOR / INSURANCE_ADMIN
        // cannot change role at all — they can only set tier/commission_rate.
        const VALID_ROLES = new Set([
          'CUSTOMER', 'AGENT', 'B2B_CLIENT',
          'INSURANCE_ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR',
          'OPERATOR', 'ADMIN', 'MASTER_ADMIN',
        ]);

        if ('role' in params) {
          const newRole = String(params.role);
          if (!VALID_ROLES.has(newRole)) {
            return json({ error: `Invalid role: ${newRole}` }, 400);
          }
          // Self-escalation check
          if (params.user_id === caller.authId) {
            return json({ error: 'Cannot change your own role' }, 403);
          }
          // Role hierarchy check
          const callerRole = caller.role ?? '';
          const PROTECTED_ROLES = ['MASTER_ADMIN', 'ADMIN'];
          if (PROTECTED_ROLES.includes(newRole) && callerRole !== 'MASTER_ADMIN') {
            return json({ error: 'Only MASTER_ADMIN can assign ADMIN or MASTER_ADMIN roles' }, 403);
          }
          // FINANCE* and INSURANCE_ADMIN cannot change roles at all
          const ROLE_CHANGE_ALLOWED = ['MASTER_ADMIN', 'ADMIN'];
          if (!ROLE_CHANGE_ALLOWED.includes(callerRole)) {
            return json({ error: 'Your role is not permitted to change user roles' }, 403);
          }
        }

        // ── Tier assignment restriction ──────────────────────────────────
        // Only MASTER_ADMIN, ADMIN, FINANCE_MANAGER can assign tiers.
        if ('tier' in params) {
          const callerRole = caller.role ?? '';
          const TIER_ASSIGNERS = ['MASTER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'];
          if (!TIER_ASSIGNERS.includes(callerRole)) {
            return json({ error: 'Your role is not permitted to assign tiers' }, 403);
          }
        }

        const ALLOWED = ['role', 'verified', 'tier', 'tier_assigned_by', 'tier_assigned_at', 'commission_rate', 'name', 'phone', 'allowed_apps', 'address', 'ktp', 'profile_photo_url', 'ktp_document_url'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) {
          if (k in params) updates[k] = params[k];
        }
        if (Object.keys(updates).length === 1) return json({ error: 'No valid fields to update' }, 400);
        const { data, error } = await db.from('sp_users').update(updates).eq('id', params.user_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list all clients; agent can list their own ────────────────
      case 'admin_list_clients': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        // Non-admins can only see their own clients; admins can see all
        let q = db.from('sp_clients').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (caller.isAdmin && params.agent_id) {
          q = q.eq('agent_id', params.agent_id);
        } else if (!caller.isAdmin) {
          q = q.eq('agent_id', caller.spUser.id);
        }
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list claims ────────────────────────────────────────────────
      case 'admin_list_claims': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_claims').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.status) q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list policies ──────────────────────────────────────────────
      case 'admin_list_policies': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_policies').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.agent_id) q = q.eq('agent_id', params.agent_id);
        if (params.status)   q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: update claim status ────────────────────────────────────────
      case 'admin_update_claim': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.claim_id || !params.status) return json({ error: 'claim_id and status required' }, 400);
        const VALID = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];
        if (!VALID.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const updates: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };
        if (params.adjuster_notes) updates.adjuster_notes = params.adjuster_notes;
        const { data, error } = await db.from('sp_claims').update(updates).eq('id', params.claim_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list withdrawal requests ──────────────────────────────────
      case 'admin_list_withdrawals': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_withdrawals')
          .select('*, sp_users!agent_id(name, email, phone)')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (params.status) q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: multi-level withdrawal approval ───────────────────────────
      case 'admin_approve_withdrawal': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.withdrawal_id || !params.level || !params.approver_id) {
          return json({ error: 'withdrawal_id, level, approver_id required' }, 400);
        }
        const level = Number(params.level);
        const ts = new Date().toISOString();
        const updates: Record<string, unknown> = { updated_at: ts };
        if (level === 1) {
          updates.l1_approved_by = params.approver_id; updates.l1_approved_at = ts;
          const { data: wd } = await db.from('sp_withdrawals').select('amount').eq('id', params.withdrawal_id).single();
          updates.status = (wd?.amount ?? 0) >= 10_000_000 ? 'PENDING_L2' : 'APPROVED';
        } else if (level === 2) {
          updates.l2_approved_by = params.approver_id; updates.l2_approved_at = ts;
          const { data: wd } = await db.from('sp_withdrawals').select('amount').eq('id', params.withdrawal_id).single();
          updates.status = (wd?.amount ?? 0) >= 25_000_000 ? 'PENDING_L3' : 'APPROVED';
        } else {
          updates.l3_approved_by = params.approver_id; updates.l3_approved_at = ts;
          updates.status = 'APPROVED';
        }
        const { data, error } = await db.from('sp_withdrawals').update(updates).eq('id', params.withdrawal_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: reject a withdrawal and reverse wallet deduction ──────────
      case 'admin_reject_withdrawal': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.withdrawal_id || !params.rejector_id || !params.reason) {
          return json({ error: 'withdrawal_id, rejector_id, reason required' }, 400);
        }
        const { data: wd, error: fetchErr } = await db.from('sp_withdrawals').select('agent_id, amount').eq('id', params.withdrawal_id).single();
        if (fetchErr || !wd) return json({ error: 'Withdrawal not found' }, 404);
        const { error: updErr } = await db.from('sp_withdrawals').update({
          status: 'REJECTED', rejected_by: params.rejector_id,
          rejected_at: new Date().toISOString(), rejection_reason: params.reason,
          updated_at: new Date().toISOString(),
        }).eq('id', params.withdrawal_id);
        if (updErr) return json({ error: updErr.message }, 400);
        await db.rpc('reverse_withdrawal', {
          p_withdrawal_id: params.withdrawal_id, p_agent_id: wd.agent_id,
          p_amount: wd.amount, p_reason: 'Penarikan ditolak: ' + String(params.reason),
        });
        return json({ data: { success: true } });
      }

      // ── Award coins to an agent (admin only) ─────────────────────────────
      case 'award_coins': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id || !params.coins || !params.order_id) return json({ error: 'agent_id, coins, order_id required' }, 400);
        const coins = Number(params.coins);
        const { error } = await db.from('sp_coin_ledger').insert({
          agent_id: params.agent_id,
          type: 'EARNED',
          coins,
          rp_value: coins * 1000,
          order_id: params.order_id,
          description: params.description ?? 'Komisi polis',
        });
        if (error) return json({ error: error.message }, 400);
        await db.rpc('increment_coins_balance', { p_agent_id: params.agent_id, p_delta: coins });
        return json({ data: { success: true } });
      }

      // ── Redeem coins (agent self-service) ────────────────────────────────
      case 'redeem_coins': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const coins = Number(params.coins);
        if (!coins || coins <= 0) return json({ error: 'coins must be positive' }, 400);
        const { data: ledger } = await db.from('sp_coin_ledger').select('type, coins').eq('agent_id', caller.spUser.id);
        const balance = (ledger ?? []).reduce((s: number, r: any) => s + (r.type === 'REDEEMED' ? -r.coins : r.coins), 0);
        if (balance < coins) return json({ error: 'Insufficient balance' }, 400);
        const { error } = await db.from('sp_coin_ledger').insert({
          agent_id: caller.spUser.id,
          type: 'REDEEMED',
          coins: -Math.abs(coins),
          rp_value: -(coins * 1000),
          description: params.description ?? 'Pencairan koin',
        });
        if (error) return json({ error: error.message }, 400);
        await db.rpc('increment_coins_balance', { p_agent_id: caller.spUser.id, p_delta: -coins });
        return json({ data: { success: true } });
      }

      // ── Get any user profile by id (admin or self) ───────────────────────
      case 'get_user_profile': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const targetId = params.user_id ? String(params.user_id) : caller.spUser.id;
        if (targetId !== caller.spUser.id && !caller.isAdmin) return json({ error: 'Forbidden' }, 403);
        const { data, error } = await db.from('sp_users').select('id, email, name, phone, role, agent_code, tier, verified, commission_rate, created_at').eq('id', targetId).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin notifications CRUD ─────────────────────────────────────────
      case 'admin_list_notifications': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_admin_notifications').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 50));
        if (params.unread_only) q = q.eq('read', false);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      case 'admin_mark_notification_read': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.notification_id) return json({ error: 'notification_id required' }, 400);
        await db.from('sp_admin_notifications').update({ read: true }).eq('id', params.notification_id);
        return json({ data: { success: true } });
      }

      case 'admin_create_notification': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_admin_notifications').insert({ ...params, read: false }).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Operator-friendly: mark ALL unread notifications as read ─────────
      case 'admin_mark_all_notifications_read': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { error: updErr } = await db.from('sp_admin_notifications').update({ read: true }).eq('read', false);
        if (updErr) return json({ error: updErr.message }, 400);
        return json({ data: { success: true } });
      }

      // ── Operator-friendly: aggregated queue summary for /operatorapp home ─
      // Returns counts of pending items across orders, claims, withdrawals,
      // agent verifications, and unread admin notifications — single round trip.
      case 'admin_queue_summary': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const [
          pendingOrdersRes, pendingClaimsRes, pendingWithdrawalsRes,
          pendingAgentsRes, unreadNotifsRes, paymentsRes,
        ] = await Promise.all([
          db.from('sp_policy_orders').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW']),
          db.from('sp_claims').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW']),
          db.from('sp_withdrawals').select('id', { count: 'exact', head: true }).in('status', ['PENDING_L1', 'PENDING_L2', 'PENDING_L3']),
          db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'AGENT').eq('verified', false),
          db.from('sp_admin_notifications').select('id', { count: 'exact', head: true }).eq('read', false),
          db.from('sp_payments').select('id, status, paid_amount').in('status', ['PENDING', 'PAID']),
        ]);
        const payments = (paymentsRes.data ?? []) as any[];
        const totalPaid = payments.filter((p: any) => p.status === 'PAID').length;
        const totalPendingPayments = payments.filter((p: any) => p.status === 'PENDING').length;
        return json({
          data: {
            pendingOrders:       pendingOrdersRes.count ?? 0,
            pendingClaims:       pendingClaimsRes.count ?? 0,
            pendingWithdrawals:  pendingWithdrawalsRes.count ?? 0,
            pendingAgents:       pendingAgentsRes.count ?? 0,
            unreadNotifications: unreadNotifsRes.count ?? 0,
            paidPayments:        totalPaid,
            pendingPayments:     totalPendingPayments,
          },
        });
      }

      // ── Admin: dashboard stats (cross-table aggregation) ─────────────────
      case 'admin_stats': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const [ordersRes, paymentsRes, agentsRes, commissionsRes] = await Promise.all([
          db.from('sp_policy_orders').select('status, total_premium, agent_id'),
          db.from('sp_payments').select('status, paid_amount'),
          db.from('sp_users').select('id, name').eq('role', 'AGENT'),
          db.from('sp_commissions').select('status, commission_amount').eq('status', 'PENDING'),
        ]);
        const orders = (ordersRes.data ?? []) as any[];
        const payments = (paymentsRes.data ?? []) as any[];
        const agents = (agentsRes.data ?? []) as any[];
        const commissions = (commissionsRes.data ?? []) as any[];
        const ordersByStatus: Record<string, number> = {};
        let totalPremiumIssued = 0;
        const agentPremiumMap: Record<string, { premium: number; orders: number }> = {};
        orders.forEach((o: any) => {
          ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
          if (o.status === 'ISSUED') totalPremiumIssued += o.total_premium ?? 0;
          if (o.agent_id) {
            if (!agentPremiumMap[o.agent_id]) agentPremiumMap[o.agent_id] = { premium: 0, orders: 0 };
            agentPremiumMap[o.agent_id].premium += o.total_premium ?? 0;
            agentPremiumMap[o.agent_id].orders += 1;
          }
        });
        const agentNameMap: Record<string, string> = {};
        agents.forEach((a: any) => { agentNameMap[a.id] = a.name; });
        const topAgents = Object.entries(agentPremiumMap)
          .map(([agent_id, v]) => ({ agent_id, name: agentNameMap[agent_id] ?? 'Agent', ...v }))
          .sort((a, b) => b.premium - a.premium).slice(0, 5);
        const totalPremiumPaid = payments.filter((p: any) => p.status === 'PAID').reduce((s: number, p: any) => s + (p.paid_amount ?? 0), 0);
        const pendingCommissions = commissions.reduce((s: number, c: any) => s + (c.commission_amount ?? 0), 0);
        return json({ data: { totalOrders: orders.length, ordersByStatus, totalPremiumIssued, totalPremiumPaid, activeAgents: agents.length, pendingCommissions, topAgents } });
      }

      // ── Admin: list all policy orders ────────────────────────────────────
      case 'admin_list_orders': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_policy_orders').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(Number(params.limit ?? 500));
        if (params.status) q = q.eq('status', String(params.status));
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: update policy order status ────────────────────────────────
      case 'admin_update_order': {
        if (!caller.isAdmin && caller.role !== 'INSURER') return json({ error: 'Forbidden' }, 403);
        if (!params.order_id || !params.status) return json({ error: 'order_id and status required' }, 400);
        const ALLOWED_STATUS = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED'];
        if (!ALLOWED_STATUS.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const ALLOWED = ['status', 'reviewer_notes', 'policy_number', 'policy_document_url', 'sp_policy_id', 'reviewed_at', 'issued_at'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) { if (k in params && k !== 'order_id') updates[k] = params[k]; }
        const s = String(params.status);
        if (['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(s) && !updates.reviewed_at) updates.reviewed_at = new Date().toISOString();
        if (s === 'ISSUED' && !updates.issued_at) updates.issued_at = new Date().toISOString();
        const { data, error } = await db.from('sp_policy_orders').update(updates).eq('id', params.order_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: financial report data (GWP, commissions, claims by period) ──
      case 'admin_financial_reports': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const year = Number(params.year ?? new Date().getFullYear());
        const fromDate = new Date(year, 0, 1).toISOString();
        const toDate = new Date(year + 1, 0, 1).toISOString();
        const [ordersRes, commissionsRes, claimsRes] = await Promise.all([
          db.from('sp_policy_orders').select('total_premium, created_at').eq('status', 'ISSUED').gte('created_at', fromDate).lt('created_at', toDate),
          db.from('sp_commissions').select('commission_amount, created_at').gte('created_at', fromDate).lt('created_at', toDate),
          db.from('sp_claims').select('amount_approved, created_at').in('status', ['APPROVED', 'PAID']).gte('created_at', fromDate).lt('created_at', toDate),
        ]);
        return json({
          data: {
            orders: ordersRes.data ?? [],
            commissions: commissionsRes.data ?? [],
            claims: claimsRes.data ?? [],
          }
        });
      }

      // ── Admin: list payments (joined with policy orders) ─────────────────
      case 'admin_list_payments': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_payments')
          .select('*, sp_policy_orders!order_id(order_number, client_name, product_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: transaksi overview stats ──────────────────────────────────
      case 'admin_transaksi_overview': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const [usersRes, ordersRes, paymentsRes, commissionsRes] = await Promise.all([
          db.from('sp_users').select('id', { count: 'exact', head: true }).in('role', ['CUSTOMER', 'B2B_CLIENT']),
          db.from('sp_policy_orders').select('id', { count: 'exact', head: true }),
          db.from('sp_payments').select('paid_amount').eq('status', 'PAID'),
          db.from('sp_commissions').select('commission_amount'),
        ]);
        const totalPembayaranMasuk = ((paymentsRes.data ?? []) as any[]).reduce((s: number, p: any) => s + (p.paid_amount ?? 0), 0);
        const totalKomisiAgen = ((commissionsRes.data ?? []) as any[]).reduce((s: number, c: any) => s + (c.commission_amount ?? 0), 0);
        return json({ data: { totalCustomers: usersRes.count ?? 0, totalOrders: ordersRes.count ?? 0, totalPembayaranMasuk, totalKomisiAgen } });
      }

      // ── Admin: list all commissions (with agent name) ─────────────────────
      case 'admin_list_commissions': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_commissions')
          .select('*, sp_users!agent_id(name)')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 1000));
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: update commission status ───────────────────────────────────
      case 'admin_update_commission': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.commission_id || !params.status) return json({ error: 'commission_id and status required' }, 400);
        const VALID = ['PENDING', 'PAID', 'CANCELLED'];
        if (!VALID.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const updates: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };
        if (params.status === 'PAID') updates.paid_at = new Date().toISOString();
        const { data, error } = await db.from('sp_commissions').update(updates).eq('id', params.commission_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: analytics dashboard data ──────────────────────────────────
      case 'admin_analytics_data': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
        const [ordersRes, agentsRes, claimsRes, paymentsRes] = await Promise.all([
          db.from('sp_policy_orders').select('status, total_premium, product_code, agent_id, created_at').gte('created_at', yearStart),
          db.from('sp_users').select('id, name').eq('role', 'AGENT').eq('verified', true),
          db.from('sp_claims').select('claim_amount, total_premium').gte('created_at', yearStart),
          db.from('sp_payments').select('status').gte('created_at', yearStart),
        ]);
        return json({ data: { orders: ordersRes.data ?? [], agents: agentsRes.data ?? [], claims: claimsRes.data ?? [], payments: paymentsRes.data ?? [] } });
      }

      // ── Admin: financial detail data ──────────────────────────────────────
      case 'admin_financial_detail': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const from = params.from ? String(params.from) : null;
        const to = params.to ? String(params.to) : null;
        let ordQ = db.from('sp_policy_orders').select('id, order_number, client_name, product_name, total_premium, discount_amount, net_premium, commission_amount, coin_reward, created_at, status').eq('status', 'ISSUED').order('created_at', { ascending: false });
        let comQ = db.from('sp_commissions').select('commission_amount, status, created_at');
        let payQ = db.from('sp_payments').select('paid_amount, status, created_at');
        let coinQ = db.from('sp_coin_ledger').select('coins, type, created_at');
        if (from && to) {
          ordQ = ordQ.gte('created_at', from).lte('created_at', to);
          comQ = comQ.gte('created_at', from).lte('created_at', to);
          payQ = payQ.gte('created_at', from).lte('created_at', to);
          coinQ = coinQ.gte('created_at', from).lte('created_at', to);
        }
        const { count: agentCount } = await db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'AGENT');
        const [ordRes, comRes, payRes, coinRes] = await Promise.all([ordQ, comQ, payQ, coinQ]);
        return json({ data: { orders: ordRes.data ?? [], commissions: comRes.data ?? [], payments: payRes.data ?? [], coins: coinRes.data ?? [], agent_count: agentCount ?? 0 } });
      }

      // ── Admin: security stats (cross-user session data) ──────────────────
      case 'admin_security_stats': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const since5m = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [activeSessRes, allSessRes, hourSessRes] = await Promise.all([
          db.from('sp_user_sessions').select('last_seen').gte('last_seen', since5m),
          db.from('sp_user_sessions').select('last_seen').order('last_seen', { ascending: false }).limit(1),
          db.from('sp_user_sessions').select('last_seen').gte('last_seen', since24h),
        ]);
        return json({ data: {
          activeSessionsCount: activeSessRes.data?.length ?? 0,
          lastLoginAt: (allSessRes.data?.[0] as any)?.last_seen ?? null,
          sessionsByHour: hourSessRes.data ?? [],
        }});
      }

      // ── Admin: traffic stats (cross-page analytics) ───────────────────────
      case 'admin_traffic_stats': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await db.from('sp_page_views').select('page, ts').gte('ts', since).order('ts', { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ data: data ?? [] });
      }

      // ── Admin: leaderboard (cross-agent commission aggregation) ──────────
      case 'get_leaderboard': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: commData, error: commErr } = await db.from('sp_commissions')
          .select('agent_id, commission_amount')
          .eq('status', 'PAID')
          .gte('created_at', startOfMonth);
        if (commErr) return json({ error: commErr.message }, 400);
        const map: Record<string, number> = {};
        (commData ?? []).forEach((r: any) => { map[r.agent_id] = (map[r.agent_id] ?? 0) + (r.commission_amount ?? 0); });
        const agentIds = Object.keys(map);
        if (agentIds.length === 0) return json({ data: [] });
        const { data: users } = await db.from('sp_users').select('id, name, agent_code').in('id', agentIds);
        const userMap: Record<string, { name: string; agent_code: string }> = {};
        (users ?? []).forEach((u: any) => { userMap[u.id] = { name: u.name, agent_code: u.agent_code ?? '' }; });
        const result = agentIds
          .map(id => ({ agent_id: id, agent_name: userMap[id]?.name ?? 'Agent', agent_code: userMap[id]?.agent_code ?? '', total_commission: map[id] }))
          .sort((a, b) => b.total_commission - a.total_commission)
          .slice(0, 10);
        return json({ data: result });
      }

      // ── Customer/agent: create a policy order (owner derived server-side) ──
      // SECURITY: the owner (agent_id) is ALWAYS the authenticated caller's
      // SurePath id — never a client-supplied value. This is the column
      // admin_list_orders / getAgentOrders filter on. For customer self-purchase
      // the client also supplies client_id === their own id; we preserve it so
      // the customer portal (get_my_orders, filtered on client_id) works.
      case 'create_policy_order': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const p = params as Record<string, any>;

        // Required fields.
        if (!p.client_name || !p.product_code || !p.product_name || !p.coverage_type || !p.status) {
          return json({ error: 'client_name, product_code, product_name, coverage_type, status required' }, 400);
        }

        // Server-side validation: core premium fields must be positive numbers.
        const POSITIVE_NUM = ['base_premium', 'total_premium'];
        for (const k of POSITIVE_NUM) {
          const v = Number(p[k]);
          if (!Number.isFinite(v) || v <= 0) {
            return json({ error: `${k} must be a positive number` }, 400);
          }
        }
        // Other numeric fields (when present) must be non-negative.
        const NON_NEGATIVE_NUM = ['addon_premium', 'admin_fee', 'stamp_duty', 'sum_insured', 'discount_amount', 'commission_amount', 'coin_reward', 'net_premium'];
        for (const k of NON_NEGATIVE_NUM) {
          if (k in p && p[k] != null) {
            const v = Number(p[k]);
            if (!Number.isFinite(v) || v < 0) {
              return json({ error: `${k} must be a non-negative number` }, 400);
            }
          }
        }

        // Server-side vehicle-age-vs-insurer-limit check. The client (agent
        // wizard) already filters this, but that's advisory only — re-verify
        // here so it can't be bypassed by calling the gateway directly with a
        // stale/edited payload. Silently skipped when no insurer is chosen yet
        // or the vehicle year isn't present (e.g. non-vehicle products).
        if (p.insurer_id && p.vehicle_type && p.vehicle_details?.year) {
          const vehicleAge = new Date().getFullYear() - Number(p.vehicle_details.year);
          const { data: matchingProducts } = await db
            .from('sp_insurer_products')
            .select('max_vehicle_age_years, vehicle_coverage')
            .eq('insurer_id', p.insurer_id)
            .eq('product_type', p.vehicle_type)
            .eq('is_active', true)
            .or(`vehicle_coverage.eq.${p.coverage_type},vehicle_coverage.eq.ALL`);
          // Prefer the exact coverage-type match over a generic "ALL" row.
          const matchingProduct = (matchingProducts ?? []).find((r: any) => r.vehicle_coverage === p.coverage_type)
            ?? (matchingProducts ?? [])[0];
          const maxAge = matchingProduct?.max_vehicle_age_years;
          if (maxAge && vehicleAge > maxAge) {
            return json({ error: `Kendaraan berusia ${vehicleAge} tahun melebihi batas maksimal ${maxAge} tahun untuk insurer ini.` }, 400);
          }
        }

        // Build the insert from the client payload, then OVERRIDE the owner.
        // Strip any client-supplied owner/identity fields that must be trusted.
        const { id: _omitId, order_number: _omitOrderNumber, created_at: _omitCreated, updated_at: _omitUpdated, agent_id: _omitAgent, ...rest } = p;
        const insertRow: Record<string, unknown> = {
          ...rest,
          agent_id: caller.spUser.id, // owner — never trust the client
        };

        // ── Server-side promo code validation ───────────────────────────────
        // SECURITY: The client sends discount_rate + discount_amount in the
        // payload. Without this check, a user could bypass the promo code UI
        // and just send discount_rate: 0.25 directly. We re-validate the code
        // server-side and override the discount fields with the authoritative
        // values from sp_promo_codes.
        //
        // If no promoCode is provided but discount_rate > 0, we zero it out
        // (no discount without a valid code).
        const clientDiscountRate = Number(p.discount_rate ?? 0);
        const clientPromoCode = String(p.promoCode ?? p.promo_code ?? '').trim().toUpperCase();

        if (clientPromoCode) {
          // Validate the code against sp_promo_codes
          const { data: promoRow } = await db
            .from('sp_promo_codes')
            .select('code, discount_type, discount_value, min_premium, usage_limit, used_count, valid_from, valid_to, is_active')
            .eq('code', clientPromoCode)
            .eq('is_active', true)
            .maybeSingle();

          if (!promoRow) {
            return json({ error: `Kode promo "${clientPromoCode}" tidak valid atau sudah tidak aktif` }, 400);
          }

          // Check date range (existing schema: valid_from / valid_to)
          const now = new Date();
          if (new Date(promoRow.valid_from) > now) {
            return json({ error: 'Kode promo belum berlaku' }, 400);
          }
          if (promoRow.valid_to && new Date(promoRow.valid_to) < now) {
            return json({ error: 'Kode promo sudah kedaluwarsa' }, 400);
          }
          // Check usage limit (existing schema: usage_limit / used_count)
          if (promoRow.usage_limit !== null && promoRow.used_count >= promoRow.usage_limit) {
            return json({ error: 'Kuota kode promo sudah habis' }, 400);
          }
          // Check minimum premium
          const orderTotal = Number(p.total_premium ?? 0);
          if (Number(promoRow.min_premium) > 0 && orderTotal < Number(promoRow.min_premium)) {
            return json({ error: `Minimum pembelian Rp ${Number(promoRow.min_premium).toLocaleString('id-ID')} untuk kode promo ini` }, 400);
          }

          // Override the discount fields with the authoritative values
          // SECURITY: fetch the insurer's max_discount_rate and clamp the
          // promo discount to it — prevents a malicious client from bypassing
          // the UI cap by sending a higher discount_rate directly.
          let insurerMaxDiscount = 1; // default: no cap (100%)
          if (p.insurer_id) {
            const { data: insurerProduct } = await db
              .from('sp_insurer_products')
              .select('max_discount_rate')
              .eq('insurer_id', p.insurer_id)
              .eq('product_type', p.vehicle_type ?? 'CAR')
              .eq('is_active', true)
              .or(`vehicle_coverage.eq.${p.coverage_type},vehicle_coverage.eq.ALL`)
              .maybeSingle();
            if (insurerProduct?.max_discount_rate != null) {
              insurerMaxDiscount = Number(insurerProduct.max_discount_rate);
            }
          }

          if (promoRow.discount_type === 'PERCENT') {
            // Cap at: min(promo_value, insurer_max_discount)
            const promoRate = Number(promoRow.discount_value) / 100;
            const validatedDiscountRate = Math.min(promoRate, insurerMaxDiscount);
            insertRow.discount_rate = validatedDiscountRate;
            insertRow.discount_amount = Math.round(orderTotal * validatedDiscountRate);
          } else {
            // NOMINAL — fixed IDR amount
            const nominalDiscount = Number(promoRow.discount_value);
            insertRow.discount_rate = orderTotal > 0 ? nominalDiscount / orderTotal : 0;
            insertRow.discount_amount = Math.min(nominalDiscount, orderTotal);
          }
          insertRow.promo_code = promoRow.code;
        } else if (clientDiscountRate > 0) {
          // No promo code but client sent a discount — zero it out
          console.warn(`[data-gateway] create_policy_order: caller ${caller.authId} sent discount_rate=${clientDiscountRate} without a promo code — zeroing out`);
          insertRow.discount_rate = 0;
          insertRow.discount_amount = 0;
        }

        const { data, error } = await db.from('sp_policy_orders').insert(insertRow).select().single();
        if (error) return json({ error: error.message }, 400);

        // Admin Telegram + insurer email alerts (non-blocking)
        const order     = data as Record<string, any>;
        const orderTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const premiumStr = order.total_premium
          ? `Rp ${Number(order.total_premium).toLocaleString('id-ID')}`
          : '-';
        // ── Operator/admin in-app notification (for /operatorapp realtime feed) ──
        db.from('sp_admin_notifications').insert({
          type: 'NEW_ORDER',
          title: 'Pengajuan Polis Baru',
          body: `${String(order.client_name ?? '-')} · ${String(order.product_name ?? '-')} · ${premiumStr}`,
          order_id: order.id,
          read: false,
          metadata: { order_id: order.id, order_number: order.order_number, status: order.status },
        }).then(() => {}, () => {});
        sendTelegram(
          `Order Polis Baru - SurePath\n\n` +
          `No. Order: ${order.order_number ?? order.id}\n` +
          `Nasabah: ${order.client_name ?? '-'}\n` +
          `Produk: ${order.product_name ?? '-'}\n` +
          `Premi: ${premiumStr}\n` +
          `Status: ${order.status ?? '-'}\n` +
          `Waktu: ${orderTime} WIB\n\n` +
          `Buka Admin Panel: https://myinsurepath.com/admin`
        );
        // NOTE: Insurer review link is NOT sent here. It's sent only after
        // operator approves the order (via admin_send_insurer_review_link
        // action called from OperatorOrders.handleApprove). Sending it here
        // would notify the insurer before SurePath has reviewed the order.

        return json({ data });
      }

      // ── Customer: my own policy orders (filtered by client_id = caller) ────
      // Mirrors getCustomerOrders, which scopes the customer portal by client_id.
      case 'get_my_orders': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { data, error } = await db
          .from('sp_policy_orders')
          .select('*')
          .eq('client_id', caller.spUser.id)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Customer: cancel my own order (only while still cancellable) ───────
      // Scoped to the caller's own orders (client_id = caller). Allowed only
      // before the insurer/admin acts, i.e. status SUBMITTED or UNDER_REVIEW.
      case 'cancel_my_order': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        if (!params.order_id) return json({ error: 'order_id required' }, 400);
        const { data: existing, error: findErr } = await db
          .from('sp_policy_orders')
          .select('id, status, client_id')
          .eq('id', params.order_id)
          .eq('client_id', caller.spUser.id)
          .maybeSingle();
        if (findErr) return json({ error: findErr.message }, 400);
        if (!existing) return json({ error: 'Order not found' }, 404);
        const CANCELLABLE = ['SUBMITTED', 'UNDER_REVIEW'];
        if (!CANCELLABLE.includes(String((existing as Record<string, unknown>).status))) {
          return json({ error: 'Order can no longer be cancelled' }, 409);
        }
        const { data, error } = await db
          .from('sp_policy_orders')
          .update({
            status: 'CANCELLED',
            reviewer_notes: 'Dibatalkan oleh nasabah',
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.order_id)
          .eq('client_id', caller.spUser.id)
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Customer: my own claims (filtered by user_id = caller) ─────────────
      // sp_claims links the customer via user_id (verified against the live
      // schema; the table has user_id + agent_id, no client_id).
      case 'get_my_claims': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { data, error } = await db
          .from('sp_claims')
          .select('*')
          .eq('user_id', caller.spUser.id)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Customer: my own payments (scoped to the caller's own orders) ──────
      // sp_payments has no direct owner column, so we scope by the caller's
      // own policy orders (order_id) to avoid exposing other users' payments.
      case 'get_my_payments': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { data: myOrders, error: ordErr } = await db
          .from('sp_policy_orders')
          .select('id')
          .eq('client_id', caller.spUser.id);
        if (ordErr) return json({ error: ordErr.message }, 400);
        const orderIds = (myOrders ?? []).map((o: any) => o.id);
        if (orderIds.length === 0) return json({ data: [] });
        const { data, error } = await db
          .from('sp_payments')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      case 'pathy_chat': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        if (!ANTHROPIC_KEY) return json({ error: 'AI not configured' }, 503);
        const message = (params?.message as string | undefined)?.trim() ?? '';
        if (!message) return json({ error: 'No message provided' }, 400);
        const [ordersRes, claimsRes] = await Promise.all([
          db.from('sp_policy_orders').select('order_number,product_name,status,created_at').eq('client_id', caller.spUser.id).limit(10),
          db.from('sp_claims').select('claim_number,status,created_at').eq('user_id', caller.spUser.id).limit(5),
        ]);
        const policySummary = (ordersRes.data ?? [])
          .map((o: any) => `- ${o.order_number}: ${o.product_name} (${o.status})`)
          .join('\n') || 'No active policies.';
        const claimSummary = (claimsRes.data ?? [])
          .map((c: any) => `- ${c.claim_number}: ${c.status}`)
          .join('\n') || 'No claims.';
        const systemPrompt = `You are Pathy, a friendly AI assistant for SurePath, an Indonesian InsurTech platform.
You are speaking with ${caller.spUser.name ?? 'a user'} (role: ${caller.role ?? 'CUSTOMER'}).
You have READ-ONLY access to their data. You CANNOT modify, create, or delete anything.

User's policies:
${policySummary}

User's claims:
${claimSummary}

Guidelines:
- Be warm, concise, helpful. Max 3 sentences unless detailed steps are needed.
- Reply in the same language the user writes in (Bahasa Indonesia or English).
- For billing changes, cancellations, or urgent matters, recommend contacting an agent via WhatsApp.
- Never fabricate policy numbers, amounts, or dates not shown above.`;
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        });
        if (!aiRes.ok) return json({ error: `AI service error: ${aiRes.status}` }, 502);
        const aiJson = await aiRes.json();
        const reply = aiJson.content?.[0]?.text ?? 'Maaf, tidak bisa memproses permintaan saat ini.';
        return json({ data: { reply } });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
