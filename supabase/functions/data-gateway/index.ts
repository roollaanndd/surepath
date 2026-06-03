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

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'INSURANCE_ADMIN', 'OPERATIONS', 'SUPERVISOR'];

interface Caller {
  authId: string;
  email: string;
  spUser: Record<string, any> | null;
  role: string | null;
  isAdmin: boolean;
}

serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY          = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

    // ── 1) Authenticate the caller via their Supabase JWT ──────────────────────
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

    // ── 2) Resolve the caller's SurePath identity + role (service_role) ────────
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: spUser } = await db
      .from('sp_users')
      .select('*')
      .or(`id.eq.${authId},email.eq.${email}`)
      .maybeSingle();

    const caller: Caller = {
      authId,
      email,
      spUser: spUser ?? null,
      role: spUser?.role ?? null,
      isAdmin: ADMIN_ROLES.includes(spUser?.role ?? ''),
    };

    const { action, params = {} } = await req.json().catch(() => ({ action: null }));
    if (!action) return json({ error: 'Missing action' }, 400);

    // ── 3) Authorized operations ───────────────────────────────────────────────
    switch (action) {
      // Caller's own profile — never exposes other users' PII.
      case 'get_my_profile': {
        if (!caller.spUser) return json({ error: 'No SurePath profile linked to this account' }, 404);
        return json({ data: caller.spUser });
      }

      // An agent's own clients only. Admins may pass an explicit agent_id.
      case 'list_my_clients': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const agentId = caller.isAdmin && params.agent_id ? params.agent_id : caller.spUser.id;
        const { data, error } = await db.from('sp_clients').select('*').eq('agent_id', agentId);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // Admin-only: list users. Rejected for non-admins and (by design) for
      // any caller without a verifiable Supabase Auth admin identity.
      case 'admin_list_users': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db
          .from('sp_users')
          .select('id, email, name, phone, role, agent_code, tier, verified, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
