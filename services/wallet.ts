// Agent wallet, withdrawals, coin ledger, downline/referral network, tier
// config and override transactions.

import { supabase, callGateway } from './db';
import type {
  SpUser,
  DownlineNode,
  SpCoinLedger,
  AgentWallet,
  WalletTransaction,
  Withdrawal,
  SpAgentTier,
  SpTierChangeRequest,
  TierProgress,
} from './dbTypes';

// ─── Coin Ledger ──────────────────────────────────────────────────────────────

export async function getAgentCoinLedger(agentId: string): Promise<SpCoinLedger[]> {
  const { data, error } = await supabase
    .from('sp_coin_ledger')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) { console.error('getAgentCoinLedger:', error); return []; }
  return (data ?? []) as SpCoinLedger[];
}

export async function getAgentCoinBalance(agentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('sp_coin_ledger')
    .select('type, coins')
    .eq('agent_id', agentId);
  if (error) { console.error('getAgentCoinBalance:', error); return 0; }
  return (data ?? []).reduce((sum: number, row: any) => {
    return sum + (row.type === 'REDEEMED' ? -row.coins : row.coins);
  }, 0);
}

export async function awardCoins(
  agentId: string, coins: number, orderId: string, description: string
): Promise<void> {
  await callGateway('award_coins', { agent_id: agentId, coins, order_id: orderId, description }).catch(e => console.error('awardCoins:', e));
}

export async function redeemCoins(
  _agentId: string, coins: number, description: string
): Promise<boolean> {
  const { error } = await callGateway('redeem_coins', { coins, description });
  if (error) { console.error('redeemCoins:', error); return false; }
  return true;
}

// ─── Agent Wallet ─────────────────────────────────────────────────────────────

export async function getMyWallet(): Promise<AgentWallet | null> {
  const { data, error } = await supabase
    .from('sp_agent_wallets')
    .select('*')
    .single();
  if (error) return null;
  return data as AgentWallet;
}

export async function getMyWalletTransactions(limit = 50): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('sp_wallet_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getMyWalletTransactions:', error); return []; }
  return (data ?? []) as WalletTransaction[];
}

export async function getMyWithdrawals(limit = 20): Promise<Withdrawal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('sp_withdrawals')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getMyWithdrawals:', error); return []; }
  return (data ?? []) as Withdrawal[];
}

export async function requestWithdrawal(params: {
  amount: number;
  bank_code: string;
  account_number: string;
  account_holder_name: string;
}): Promise<{ success: boolean; withdrawal_id?: string; error?: string }> {
  // FIX v1.42.0: route through gateway to enforce verified check.
  // Previously called supabase directly with user JWT, bypassing the verified gate
  // added in create_policy_order — unverified agents could drain their wallet.
  const { data, error } = await callGateway('agent_request_withdrawal', {
    amount: params.amount,
    bank_code: params.bank_code,
    account_number: params.account_number,
    account_holder_name: params.account_holder_name,
  });
  if (error) return { success: false, error };
  return (data as any) ?? { success: false, error: 'Gagal membuat penarikan' };
}

export async function getAdminWithdrawals(limit = 200): Promise<Array<Withdrawal & {
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
}>> {
  const { data, error } = await callGateway('admin_list_withdrawals', { limit });
  if (error) { console.error('getAdminWithdrawals:', error); return []; }
  return (data ?? []).map((w: any) => ({
    ...w,
    agent_name:  w.sp_users?.name,
    agent_email: w.sp_users?.email,
    agent_phone: w.sp_users?.phone,
  }));
}

export async function approveWithdrawal(
  withdrawal_id: string,
  level: 1 | 2 | 3,
  approver_id: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await callGateway('admin_approve_withdrawal', { withdrawal_id, level, approver_id });
  if (error) return { success: false, error };
  return { success: true, ...data };
}

export async function rejectWithdrawal(
  withdrawal_id: string,
  rejector_id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await callGateway('admin_reject_withdrawal', { withdrawal_id, rejector_id, reason });
  if (error) return { success: false, error };
  return { success: true, ...data };
}

export async function triggerDisbursement(withdrawal_id: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('xendit-disburse', {
    body: { withdrawal_id },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, ...data };
}

// ─── Downline / Referral Network ──────────────────────────────────────────────

export async function getAgentDownlines(agentId: string): Promise<SpUser[]> {
  const { data, error } = await supabase
    .from('sp_users')
    .select('*')
    .eq('upline_id', agentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAgentDownlines:', error); return []; }
  return (data ?? []) as SpUser[];
}

export async function getAgentDownlineTree(agentId: string): Promise<DownlineNode[]> {
  const l1 = await getAgentDownlines(agentId);
  if (l1.length === 0) return [];
  const l2Results = await Promise.all(l1.map(a => getAgentDownlines(a.id)));
  return l1.map((agent, i) => ({ ...agent, l2: l2Results[i] }));
}

export async function updateAgentTier(
  agentId: string,
  tierCode: string,
  reason?: string,
): Promise<{ success: boolean; pending?: boolean; error?: string }> {
  const res = await callGateway('admin_assign_agent_tier', { agent_id: agentId, tier_code: tierCode, reason }) as { data?: any; error?: string; pending?: boolean };
  if (res.error) { console.error('updateAgentTier:', res.error); return { success: false, error: res.error }; }
  return { success: true, pending: !!res.pending };
}

export async function getAgentReferralCode(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sp_users')
    .select('referral_code')
    .eq('id', agentId)
    .single();
  if (error) { console.error('getAgentReferralCode:', error); return null; }
  return (data as any)?.referral_code ?? null;
}

// Sets the caller's own upline via the gateway (server resolves the code
// against agent_code OR referral_code; RLS-safe; never self-referral).
export async function applyReferralCode(_newAgentId: string, referralCode: string): Promise<boolean> {
  const { error } = await callGateway('apply_referral', { code: referralCode });
  if (error) { console.error('applyReferralCode:', error); return false; }
  return true;
}

export async function getOverrideTransactions(agentId: string): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('sp_wallet_transactions')
    .select('*')
    .eq('agent_id', agentId)
    .eq('reference_type', 'OVERRIDE')
    .order('created_at', { ascending: false });
  if (error) { console.error('getOverrideTransactions:', error); return []; }
  return (data ?? []) as WalletTransaction[];
}

// ─── Agent Tiers (CMS-configurable) ──────────────────────────────────────────

export async function getTierDefinitions(): Promise<SpAgentTier[]> {
  const { data, error } = await callGateway('get_tier_definitions', {});
  if (error) { console.error('getTierDefinitions:', error); return []; }
  return (data ?? []) as SpAgentTier[];
}

export async function getMyTierProgress(): Promise<TierProgress | null> {
  const { data, error } = await callGateway('get_my_tier_progress', {});
  if (error) { console.error('getMyTierProgress:', error); return null; }
  return (data ?? null) as TierProgress | null;
}

export async function getAdminTiers(): Promise<SpAgentTier[]> {
  const { data, error } = await callGateway('admin_list_tiers', {});
  if (error) { console.error('getAdminTiers:', error); return []; }
  return (data ?? []) as SpAgentTier[];
}

export async function createTier(tier: Partial<SpAgentTier>): Promise<SpAgentTier | null> {
  const { data, error } = await callGateway('admin_create_tier', tier);
  if (error) { console.error('createTier:', error); return null; }
  return (data ?? null) as SpAgentTier | null;
}

export async function updateTier(code: string, updates: Partial<SpAgentTier>): Promise<boolean> {
  const { error } = await callGateway('admin_update_tier', { code, ...updates });
  if (error) { console.error('updateTier:', error); return false; }
  return true;
}

export async function deleteTier(code: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await callGateway('admin_delete_tier', { code });
  if (error) return { success: false, error };
  return { success: true };
}

export async function reorderTiers(order: Array<{ code: string; rank: number }>): Promise<boolean> {
  const { error } = await callGateway('admin_reorder_tiers', { order });
  if (error) { console.error('reorderTiers:', error); return false; }
  return true;
}

export async function getTierChangeRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<SpTierChangeRequest[]> {
  const { data, error } = await callGateway('admin_list_tier_requests', { status });
  if (error) { console.error('getTierChangeRequests:', error); return []; }
  return (data ?? []) as SpTierChangeRequest[];
}

export async function approveTierRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await callGateway('admin_approve_tier_request', { request_id: requestId });
  if (error) return { success: false, error };
  return { success: true };
}

export async function rejectTierRequest(requestId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await callGateway('admin_reject_tier_request', { request_id: requestId, reason });
  if (error) return { success: false, error };
  return { success: true };
}

export async function evaluateAgentTier(agentId: string, apply = false): Promise<{ data?: any; error?: string; pending?: boolean }> {
  return callGateway('admin_evaluate_agent_tier', { agent_id: agentId, apply });
}

export async function evaluateAllAgentTiers(): Promise<{ data?: any; error?: string }> {
  return callGateway('admin_evaluate_all_agents', {});
}
