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

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN'];

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

      // Admin-only: list users. Optional role filter via params.role.
      case 'admin_list_users': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db
          .from('sp_users')
          .select('id, email, name, phone, role, agent_code, tier, verified, commission_rate, is_suspended, tc_accepted, tc_accepted_at, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (params.role) q = q.eq('role', params.role);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
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

      // ── Admin: single user with full PII ─────────────────────────────────
      case 'admin_get_user': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.user_id) return json({ error: 'Missing user_id' }, 400);
        const { data, error } = await db.from('sp_users').select('*').eq('id', params.user_id).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'User not found' }, 404);
        return json({ data });
      }

      // ── Admin: update user fields (role, verified, tier, etc.) ──────────
      case 'admin_update_user': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.user_id) return json({ error: 'Missing user_id' }, 400);
        const ALLOWED = ['role', 'verified', 'is_suspended', 'tier', 'tier_assigned_by', 'tier_assigned_at', 'commission_rate', 'name', 'phone'];
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

      // ── Admin: list commissions ───────────────────────────────────────────
      case 'admin_list_commissions': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_commissions').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.agent_id) q = q.eq('agent_id', params.agent_id);
        if (params.status)   q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: approve / reject commission ───────────────────────────────
      case 'admin_update_commission': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.commission_id || !params.status) return json({ error: 'Missing commission_id or status' }, 400);
        const VALID_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
        if (!VALID_STATUSES.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const { data, error } = await db.from('sp_commissions').update({ status: params.status }).eq('id', params.commission_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list claims ────────────────────────────────────────────────
      case 'admin_list_claims': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_claims').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.status) q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      // ── Admin: list payments ──────────────────────────────────────────────
      case 'admin_list_payments': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_payments').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
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
        let q = db.from('sp_policy_orders').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 500));
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
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
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

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
