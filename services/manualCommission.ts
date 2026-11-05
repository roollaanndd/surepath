// Client wrapper untuk aksi four-eyes manual commission (v2.7.58).
//
// Semua panggilan melalui data-gateway. Role gate ada di sisi server;
// UI cukup menyembunyikan tombol/view yang tidak relevan.
import { callGateway } from './db';

export interface SpManualCommissionRequest {
  id: string;
  agent_id: string;
  commission_amount: number;
  coin_amount: number;
  policy_ref: string | null;
  reason: string;
  requested_by: string;
  requested_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  applied_wallet_tx_id: string | null;
  applied_at: string | null;
  created_at: string;
  agent?: { id: string; name: string | null; email: string | null; agent_code: string | null } | null;
  requester?: { id: string; name: string | null; email: string | null } | null;
  decider?: { id: string; name: string | null; email: string | null } | null;
}

export interface RequestManualCommissionInput {
  agent_id: string;
  commission_amount: number;
  coin_amount: number;
  reason: string;
  policy_ref?: string | null;
}

export async function requestManualCommission(
  input: RequestManualCommissionInput,
): Promise<{ request?: SpManualCommissionRequest; error?: string }> {
  const res = await callGateway('finance_request_manual_commission', input as unknown as Record<string, unknown>);
  if (res.error) return { error: res.error };
  return { request: res.data as SpManualCommissionRequest };
}

export async function listManualCommissionRequests(options: {
  scope?: 'all' | 'pending' | 'mine';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  limit?: number;
} = {}): Promise<SpManualCommissionRequest[]> {
  const res = await callGateway('admin_list_manual_commission_requests', options as Record<string, unknown>);
  if (res.error) {
    console.error('listManualCommissionRequests:', res.error);
    return [];
  }
  return (res.data as SpManualCommissionRequest[]) ?? [];
}

export async function decideManualCommissionRequest(
  requestId: string,
  approve: boolean,
  decisionNote?: string,
): Promise<{ request?: SpManualCommissionRequest; error?: string; code?: string }> {
  const res = await callGateway('master_decide_manual_commission', {
    request_id: requestId,
    approve,
    decision_note: decisionNote ?? null,
  });
  if (res.error) return { error: res.error, code: res.code as string | undefined };
  return { request: res.data as SpManualCommissionRequest };
}
