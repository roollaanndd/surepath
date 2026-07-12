// ─────────────────────────────────────────────────────────────────────────────
// operatorService.ts — typed wrappers around data-gateway admin_* actions for
// the Operator App (/operatorapp).
//
// All mutations route through callGateway() which carries the operator's
// Supabase JWT. The gateway resolves role → ADMIN_ROLES.includes('OPERATOR')
// (since v1.18.0) and enforces the role-escalation matrix server-side, so
// operators can approve/reject but cannot elevate privileges.
// ─────────────────────────────────────────────────────────────────────────────

import { callGateway } from './db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QueueSummary {
  pendingOrders:       number;
  pendingClaims:       number;
  pendingWithdrawals:  number;
  pendingAgents:       number;
  unreadNotifications: number;
  paidPayments:        number;
  pendingPayments:     number;
}

export interface OperatorOrder {
  id: string;
  order_number: string | null;
  agent_id: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_ktp: string | null;
  product_code: string;
  product_name: string;
  vehicle_type: string | null;
  vehicle_details: Record<string, any> | null;
  vehicle_image_url: string | null;
  coverage_type: string;
  sum_insured: number | null;
  zone: number | null;
  vehicle_category: number | null;
  addons: Record<string, any> | null;
  base_premium: number | null;
  addon_premium: number | null;
  admin_fee: number | null;
  stamp_duty: number | null;
  total_premium: number | null;
  net_premium: number | null;
  application_fee: number | null;
  discount_rate: number | null;
  discount_amount: number | null;
  promo_code: string | null;
  ojk_rate: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  policy_number: string | null;
  policy_document_url: string | null;
  issued_at: string | null;
  sp_policy_id: string | null;
  insurer_id: string | null;
  insurer_name: string | null;
  ai_score: number | null;
  ai_verdict: string | null;
  ai_findings: Record<string, any> | null;
  ai_admin_recommendation: string | null;
  ai_admin_confidence: number | null;
  ai_admin_risk_level: string | null;
  ai_admin_reasoning: string | null;
  ai_admin_flags: Record<string, any> | null;
  ai_admin_reviewed_at: string | null;
  commission_rate: number | null;
  commission_amount: number | null;
  coin_reward: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface OperatorClaim {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  claim_type: string | null;
  description: string | null;
  location: string | null;
  amount_estimated: number | null;
  amount_approved: number | null;
  status: string;
  adjuster_notes: string | null;
  created_at: string;
}

export interface OperatorWithdrawal {
  id: string;
  agent_id: string;
  amount: number;
  xendit_fee: number;
  net_amount: number;
  bank_code: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  status: string;
  l1_approved_by: string | null;
  l1_approved_at: string | null;
  l2_approved_by: string | null;
  l2_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  scheduled_disburse_at: string | null;
  created_at: string;
  sp_users?: { name: string; email: string; phone: string } | null;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
}

export interface OperatorAgent {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  agent_code: string | null;
  verified: boolean;
  commission_rate: number | null;
  tier: string | null;
  trust_score: number | null;
  created_at: string;
  // New fields for verification UI
  ktp?: string | null;
  address?: string | null;
  profile_photo_url?: string | null;
  ktp_document_url?: string | null;
  agreement?: {
    agent_id: string;
    agreement_no: string;
    full_name: string;
    ktp_number: string;
    accepted_at: string;
    user_agent: string | null;
  } | null;
}

export interface OperatorNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  order_id: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export async function getQueueSummary(): Promise<QueueSummary> {
  const { data, error } = await callGateway('admin_queue_summary');
  if (error) throw new Error(error);
  return data as QueueSummary;
}

export async function listOrders(status?: string, limit = 100): Promise<OperatorOrder[]> {
  const { data, error } = await callGateway('admin_list_orders', { status, limit });
  if (error) throw new Error(error);
  return (data ?? []) as OperatorOrder[];
}

export async function updateOrderStatus(
  orderId: string,
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'CANCELLED',
  reviewerNotes?: string,
  policyNumber?: string,
): Promise<OperatorOrder> {
  const payload: Record<string, unknown> = { order_id: orderId, status };
  if (reviewerNotes !== undefined) payload.reviewer_notes = reviewerNotes;
  if (policyNumber !== undefined) payload.policy_number = policyNumber;
  const { data, error } = await callGateway('admin_update_order', payload);
  if (error) throw new Error(error);
  return data as OperatorOrder;
}

// Trigger insurer review flow: generates secure review token + sends email
// to insurer PIC with link to /review/:token page where they can approve,
// request additional info, or decline the policy application.
export async function sendInsurerReviewLink(orderId: string): Promise<{ reviewUrl: string; insurerEmail: string }> {
  const { data, error } = await callGateway('admin_send_insurer_review_link', { order_id: orderId });
  if (error) throw new Error(error);
  return { reviewUrl: data.review_url, insurerEmail: data.insurer_email };
}

export async function listClaims(status?: string, limit = 100): Promise<OperatorClaim[]> {
  const { data, error } = await callGateway('admin_list_claims', { status, limit });
  if (error) throw new Error(error);
  return (data ?? []) as OperatorClaim[];
}

export async function updateClaimStatus(
  claimId: string,
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID',
  adjusterNotes?: string,
): Promise<OperatorClaim> {
  const payload: Record<string, unknown> = { claim_id: claimId, status };
  if (adjusterNotes !== undefined) payload.adjuster_notes = adjusterNotes;
  const { data, error } = await callGateway('admin_update_claim', payload);
  if (error) throw new Error(error);
  return data as OperatorClaim;
}

export async function listWithdrawals(status?: string, limit = 100): Promise<OperatorWithdrawal[]> {
  const { data, error } = await callGateway('admin_list_withdrawals', { status, limit });
  if (error) throw new Error(error);
  return ((data ?? []) as OperatorWithdrawal[]).map(w => ({
    ...w,
    agent_name:  w.sp_users?.name,
    agent_email: w.sp_users?.email,
    agent_phone: w.sp_users?.phone,
  }));
}

export async function approveWithdrawalL1(
  withdrawalId: string,
  approverId: string,
): Promise<OperatorWithdrawal> {
  const { data, error } = await callGateway('admin_approve_withdrawal', {
    withdrawal_id: withdrawalId, level: 1, approver_id: approverId,
  });
  if (error) throw new Error(error);
  return data as OperatorWithdrawal;
}

export async function rejectWithdrawal(
  withdrawalId: string,
  rejectorId: string,
  reason: string,
): Promise<void> {
  const { error } = await callGateway('admin_reject_withdrawal', {
    withdrawal_id: withdrawalId, rejector_id: rejectorId, reason,
  });
  if (error) throw new Error(error);
}

// ─── New: status-aware agent list (fixes Operator agent visibility bug) ──
// Returns agents filtered by status (PENDING | VERIFIED | ALL) + agreement info.
export async function listAgents(
  status: 'PENDING' | 'VERIFIED' | 'ALL' = 'ALL',
): Promise<OperatorAgent[]> {
  const { data, error } = await callGateway('admin_list_agents', { status, limit: 200 });
  if (error) throw new Error(error);
  return (data ?? []) as OperatorAgent[];
}

// Backward-compat alias — dashboard preview still wants pending only.
export async function listPendingAgents(): Promise<OperatorAgent[]> {
  try {
    const { data, error } = await callGateway('admin_list_agents', { status: 'PENDING', limit: 100 });
    if (!error && data) return data as OperatorAgent[];
  } catch (e) {
    console.warn('listAgents PENDING failed, falling back to legacy admin_list_pending_agents', e);
  }
  // Last-resort fallback: legacy action (pending only, no agreement info)
  const { data, error } = await callGateway('admin_list_pending_agents', { limit: 100 });
  if (error) throw new Error(error);
  return (data ?? []) as OperatorAgent[];
}

export interface AgentDetail {
  agent: OperatorAgent & {
    allowed_apps?: string[] | null;
    referral_code?: string | null;
    upline_id?: string | null;
  };
  agreements: Array<{
    id: string;
    agreement_no: string;
    doc_version: string;
    full_name: string;
    ktp_number: string;
    accepted_at: string;
    user_agent: string | null;
  }>;
}

export async function getAgentDetail(agentId: string): Promise<AgentDetail> {
  const { data, error } = await callGateway('admin_get_agent_detail', { agent_id: agentId });
  if (error) throw new Error(error);
  return data as AgentDetail;
}

export async function verifyAgent(agentId: string): Promise<void> {
  const { error } = await callGateway('admin_verify_agent', { agent_id: agentId, approve: true });
  if (error) throw new Error(error);
}

export async function rejectAgent(agentId: string): Promise<void> {
  const { error } = await callGateway('admin_verify_agent', { agent_id: agentId, approve: false });
  if (error) throw new Error(error);
}

export async function listNotifications(unreadOnly = false, limit = 50): Promise<OperatorNotification[]> {
  const { data, error } = await callGateway('admin_list_notifications', { unread_only: unreadOnly, limit });
  if (error) throw new Error(error);
  return (data ?? []) as OperatorNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await callGateway('admin_mark_notification_read', { notification_id: id });
  if (error) throw new Error(error);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await callGateway('admin_mark_all_notifications_read');
  if (error) throw new Error(error);
}
