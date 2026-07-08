// wallet.ts — 7 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleWalletAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
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
      return null; // Not handled by this module
  }
}
