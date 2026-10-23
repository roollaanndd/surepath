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
        // FIX v2.6.17 (audit 2026-10-23, C2): the approval level is derived from
        // the withdrawal row, never from the request.
        //
        // This used to read `level` out of params and fall through an `else`
        // branch that set status: 'APPROVED' unconditionally — so level 3, 0 or
        // "x" (NaN) all approved any amount in one call, with no check that the
        // row was even awaiting approval and no check that L1/L2 had happened.
        // The <10jt/>=10jt/>=25jt ladder was effectively not enforced at all.
        //
        // On roles (owner's call, 2026-10-23): *every* tier is finance-only.
        // OPERATOR sits in ADMIN_ROLES but not FINANCE_ROLES, so an operator can
        // no longer sign any tier, not even L1 on a <10jt request. The operator
        // portal's L1 button was removed in the same change
        // (components/operator/OperatorWithdrawals.tsx); operators keep read
        // access to the queue and keep rejecting, which only reverses a
        // deduction the agent already made.
        if (!caller.isFinanceAdmin) {
          return json({ error: 'Forbidden: withdrawal approval requires a finance admin' }, 403);
        }
        if (!params.withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);

        const { data: wd, error: fetchErr } = await db.from('sp_withdrawals')
          .select('amount, status, l1_approved_by, l2_approved_by')
          .eq('id', params.withdrawal_id)
          .single();
        if (fetchErr || !wd) return json({ error: 'Withdrawal not found' }, 404);

        const STAGE_OF: Record<string, number> = { PENDING_L1: 1, PENDING_L2: 2, PENDING_L3: 3 };
        const stage = STAGE_OF[String(wd.status)];
        if (!stage) return json({ error: 'Withdrawal is not awaiting approval' }, 409);

        // Tiers required by amount, mirroring agent_request_withdrawal below.
        const required = (wd.amount ?? 0) >= 25_000_000 ? 3 : (wd.amount ?? 0) >= 10_000_000 ? 2 : 1;

        // Four-eyes: nobody may sign the same withdrawal twice.
        if ([wd.l1_approved_by, wd.l2_approved_by].includes(caller.authId)) {
          return json({ error: 'Approval requires a different approver' }, 403);
        }

        const ts = new Date().toISOString();
        const updates: Record<string, unknown> = {
          updated_at: ts,
          [`l${stage}_approved_by`]: caller.authId,
          [`l${stage}_approved_at`]: ts,
          status: stage >= required ? 'APPROVED' : `PENDING_L${stage + 1}`,
        };

        // .eq('status', wd.status) makes this an atomic claim of the stage we
        // read, so two approvers racing cannot both advance the same step.
        const { data, error } = await db.from('sp_withdrawals')
          .update(updates)
          .eq('id', params.withdrawal_id)
          .eq('status', wd.status)
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'Withdrawal state changed, please retry' }, 409);
        return json({ data });
      }

    case 'admin_reject_withdrawal': {
        // Left on isAdmin deliberately: rejecting only reverses a deduction the
        // agent already made, it cannot release funds, and the operator portal
        // owns this queue (services/operatorService.ts `rejectWithdrawal`).
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        // FIX v1.44.0 (pentest M5): use caller.authId instead of client-supplied rejector_id.
        if (!params.withdrawal_id || !params.reason) {
          return json({ error: 'withdrawal_id, reason required' }, 400);
        }
        const { data: wd, error: fetchErr } = await db.from('sp_withdrawals').select('agent_id, amount').eq('id', params.withdrawal_id).single();
        if (fetchErr || !wd) return json({ error: 'Withdrawal not found' }, 404);
        const { error: updErr } = await db.from('sp_withdrawals').update({
          status: 'REJECTED', rejected_by: caller.authId,
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
        // FIX v1.42.0: add verified check (consistent with create_policy_order + agent_request_withdrawal)
        if (caller.spUser.role === 'AGENT' && caller.spUser.verified === false) {
          return json({ error: 'Akun agen Anda belum diverifikasi.' }, 403);
        }
        const coins = Number(params.coins);
        if (!coins || coins <= 0) return json({ error: 'coins must be positive' }, 400);
        const { data: ledger } = await db.from('sp_coin_ledger').select('type, coins').eq('agent_id', caller.spUser.id);
        const balance = (ledger ?? []).reduce((s: number, r: any) => s + (r.type === 'REDEEMED' ? -Math.abs(Number(r.coins) || 0) : Number(r.coins) || 0), 0);
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
        const { data: users } = await db.from('sp_users').select('id, name, agent_code, tier').in('id', agentIds);
        const userMap: Record<string, { name: string; agent_code: string; tier: string | null }> = {};
        (users ?? []).forEach((u: any) => { userMap[u.id] = { name: u.name, agent_code: u.agent_code ?? '', tier: u.tier ?? null }; });
        const result = agentIds
          .map(id => ({ agent_id: id, agent_name: userMap[id]?.name ?? 'Agent', agent_code: userMap[id]?.agent_code ?? '', tier: userMap[id]?.tier ?? null, total_commission: map[id] }))
          .sort((a, b) => b.total_commission - a.total_commission)
          .slice(0, 10);
        return json({ data: result });
      }

    // ─── New: agent_request_withdrawal (fixes withdrawal bypass + verified check) ──
    // Previously services/wallet.ts requestWithdrawal() called supabase directly with user JWT,
    // bypassing the gateway entirely. RLS on sp_withdrawals only checks auth.uid() = agent_id,
    // NOT verified status — so unverified agents could submit withdrawal requests.
    // This action enforces: (1) caller is AGENT, (2) caller is verified, (3) amount > Xendit fee,
    // (4) atomic wallet deduction via request_withdrawal_deduct RPC.
    case 'agent_request_withdrawal': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        if (caller.spUser.role !== 'AGENT') return json({ error: 'Hanya agen yang dapat melakukan penarikan' }, 403);
        if (caller.spUser.verified === false) {
          return json({ error: 'Akun agen Anda belum diverifikasi. Penarikan tidak diizinkan.' }, 403);
        }

        const amount = Number(params.amount ?? 0);
        const bankCode = String(params.bank_code ?? '').slice(0, 20);
        const accountNumber = String(params.account_number ?? '').slice(0, 50);
        const accountHolderName = String(params.account_holder_name ?? '').slice(0, 200);

        if (amount <= 0) return json({ error: 'Jumlah harus lebih besar dari 0' }, 400);
        if (!bankCode || !accountNumber || !accountHolderName) {
          return json({ error: 'bank_code, account_number, account_holder_name wajib diisi' }, 400);
        }

        const XENDIT_FEE = 5000;
        const net_amount = amount - XENDIT_FEE;
        if (net_amount <= 0) return json({ error: 'Jumlah terlalu kecil setelah biaya transfer' }, 400);

        // Determine required approval level
        let initial_status: string;
        if (amount >= 25_000_000) initial_status = 'PENDING_L3';
        else if (amount >= 10_000_000) initial_status = 'PENDING_L2';
        else initial_status = 'PENDING_L1';

        const scheduled_disburse_at = amount >= 25_000_000
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: wd, error: wdErr } = await db
          .from('sp_withdrawals')
          .insert({
            agent_id: caller.authId,
            amount,
            bank_code: bankCode,
            account_number: accountNumber,
            account_holder_name: accountHolderName,
            xendit_fee: XENDIT_FEE,
            net_amount,
            status: initial_status,
            scheduled_disburse_at,
          })
          .select('id')
          .single();

        if (wdErr || !wd) return json({ error: wdErr?.message ?? 'Gagal membuat penarikan' }, 400);

        // Atomically deduct wallet via RPC (SECURITY DEFINER)
        const { error: deductErr } = await db.rpc('request_withdrawal_deduct', {
          p_withdrawal_id: wd.id,
          p_agent_id:      caller.authId,
          p_amount:        amount,
        });

        if (deductErr) {
          // Rollback withdrawal insert
          await db.from('sp_withdrawals').update({ status: 'CANCELLED' }).eq('id', wd.id);
          return json({ error: deductErr.message }, 400);
        }

        return json({ data: { success: true, withdrawal_id: wd.id } });
      }

    default:
      return null; // Not handled by this module
  }
}
