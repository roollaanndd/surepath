// admin.ts — 13 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleAdminAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
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

    case 'admin_get_user': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.user_id) return json({ error: 'user_id required' }, 400);
        const { data, error } = await db.from('sp_users').select('*').eq('id', String(params.user_id)).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

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

        // Tier changes go through the dedicated 'admin_assign_agent_tier' action
        // (actions/tiers.ts) so they run through the approval-request workflow —
        // block them here to prevent bypassing that gate.
        if ('tier' in params || 'tier_assigned_by' in params || 'tier_assigned_at' in params) {
          return json({ error: 'Use admin_assign_agent_tier to change an agent tier' }, 400);
        }

        const ALLOWED = ['role', 'verified', 'commission_rate', 'name', 'phone', 'allowed_apps', 'address', 'ktp', 'profile_photo_url', 'ktp_document_url'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) {
          if (k in params) updates[k] = params[k];
        }
        if (Object.keys(updates).length === 1) return json({ error: 'No valid fields to update' }, 400);
        const { data, error } = await db.from('sp_users').update(updates).eq('id', params.user_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

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

    case 'admin_list_commissions': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_commissions')
          .select('*, sp_users!agent_id(name)')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 1000));
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_update_commission': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.commission_id || !params.status) return json({ error: 'commission_id and status required' }, 400);
        const VALID = ['PENDING', 'PAID', 'CANCELLED'];
        if (!VALID.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const updates: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };
        if (params.status === 'PAID') updates.paid_at = new Date().toISOString();
        const { data, error } = await db.from('sp_commissions').update(updates).eq('id', params.commission_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);

        // FIX: when admin marks commission as PAID, also credit the agent wallet (previously skipped)
        if (params.status === 'PAID' && data) {
          const c = data as any;
          if (c.agent_id && c.commission_amount) {
            db.rpc('credit_agent_wallet', {
              p_agent_id: c.agent_id,
              p_amount: Number(c.commission_amount),
              p_reference_id: String(c.id),
              p_reference_type: 'COMMISSION',
              p_description: `Komisi ${c.product_type ?? ''} — ${c.client_name ?? 'Nasabah'}`,
            }).then(() => {}, (e: any) => console.warn('credit_agent_wallet failed:', e?.message));
          }
        }
        return json({ data });
      }

    // ─── New: admin_create_commission (fixes RLS block when admin credits commission) ──
    // Service_role bypasses RLS so admin can credit commission to ANY agent.
    // Mirrors the Xendit webhook's full side-effect set (commission row + wallet credit + notification).
    case 'admin_create_commission': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        if (!params.commission_amount) return json({ error: 'commission_amount required' }, 400);

        const insertRow: Record<string, unknown> = {
          agent_id:         String(params.agent_id),
          client_name:      params.client_name      ? String(params.client_name).slice(0, 200)    : null,
          client_id:        params.client_id        ? String(params.client_id)                    : null,
          policy_id:        params.policy_id        ? String(params.policy_id)                    : null,
          order_id:         params.order_id         ? String(params.order_id)                     : null,
          order_number:     params.order_number     ? String(params.order_number).slice(0, 100)   : null,
          product_type:     params.product_type     ? String(params.product_type).slice(0, 50)    : 'CAR',
          premium_amount:   Number(params.premium_amount ?? 0),
          commission_amount:Number(params.commission_amount),
          commission_rate:  Number(params.commission_rate ?? 0),
          discount_rate:    params.discount_rate != null ? Number(params.discount_rate) : 0,
          coin_reward:      params.coin_reward != null ? Number(params.coin_reward) : 0,
          status:           String(params.status ?? 'PENDING'),
          created_at:       new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        };
        if (params.status === 'PAID') insertRow.paid_at = new Date().toISOString();

        const { data, error } = await db.from('sp_commissions').insert(insertRow).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);

        // If status PAID, credit the wallet
        if (params.status === 'PAID' && data) {
          const c = data as any;
          db.rpc('credit_agent_wallet', {
            p_agent_id: c.agent_id,
            p_amount: Number(c.commission_amount),
            p_reference_id: String(c.id),
            p_reference_type: 'COMMISSION',
            p_description: `Komisi ${c.product_type ?? ''} — ${c.client_name ?? 'Nasabah'}`,
          }).then(() => {}, (e: any) => console.warn('credit_agent_wallet failed:', e?.message));
        }

        // Notify the agent
        if (data) {
          const c = data as any;
          db.from('sp_notifications').insert({
            agent_id: String(c.agent_id),
            type: 'COMMISSION_EARNED',
            title: 'Komisi Diperoleh',
            body: `Komisi Rp ${Number(c.commission_amount ?? 0).toLocaleString('id-ID')} untuk polis ${c.product_type ?? ''} ${c.client_name ?? ''} telah ditambahkan ke dompet Anda.`,
            read: false,
            metadata: { commission_id: c.id, amount: c.commission_amount, status: c.status },
          }).then(() => {}, () => {});
        }
        return json({ data });
      }

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

    case 'admin_traffic_stats': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await db.from('sp_page_views').select('page, ts').gte('ts', since).order('ts', { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ data: data ?? [] });
      }

    // ─── New: admin_backup_export (fixes broken backup system) ──────────────
    // Previously backupService.ts used anon-key client which returned empty results
    // after RLS tightening. This action uses service_role to export ALL rows from
    // ~35 critical tables. Admin-only. Returns JSON payload for client-side encryption.
    case 'admin_backup_export': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const tables = [
          // Core entities
          'sp_users', 'sp_clients', 'sp_insurers', 'sp_insurer_products',
          // Orders & policies
          'sp_policy_orders', 'sp_policies', 'sp_quotes',
          // Financial
          'sp_payments', 'sp_commissions', 'sp_wallet_transactions',
          'sp_withdrawals', 'sp_agent_wallets', 'sp_coin_ledger', 'sp_transactions',
          // Claims
          'sp_claims', 'sp_endorsements', 'sp_renewals',
          // Agent network
          'sp_agent_agreements', 'sp_referral_rewards', 'sp_tier_config',
          // Notifications
          'sp_notifications', 'sp_admin_notifications',
          // Config
          'sp_insurer_api_configs', 'sp_insurer_activity_log',
          'sp_ojk_rate_sets', 'sp_promo_codes', 'sp_vehicle_overrides',
          'sp_product_configs',
          // Review tokens (expiring)
          'sp_review_tokens', 'sp_insurer_auth_tokens',
          // Audit & compliance
          'sp_audit_log', 'sp_tnc_records',
          // B2B & Life
          'sp_b2b_submissions', 'sp_b2b_quotes', 'sp_life_applications',
          // Sessions (for forensic analysis)
          'sp_user_sessions',
        ];
        const result: Record<string, any[]> = {};
        for (const t of tables) {
          try {
            const { data, error } = await db.from(t).select('*').order('created_at', { ascending: false }).limit(5000);
            if (!error) result[t] = data ?? [];
            else console.warn(`backup_export: skip ${t}:`, error.message);
          } catch (e) {
            console.warn(`backup_export: error on ${t}:`, e);
            result[t] = [];
          }
        }
        return json({ data: { tables: result, exportedAt: new Date().toISOString() } });
      }

    default:
      return null; // Not handled by this module
  }
}
