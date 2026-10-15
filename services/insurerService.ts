// ─────────────────────────────────────────────────────────────────────────────
// insurerService.ts — typed API wrappers for the Insurer App.
//
// All calls go through the data-gateway edge function using the insurer's
// auth token (NOT a Supabase JWT). The token is passed in the params, not
// the Authorization header — the gateway's insurer_* actions validate it
// server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './db';

const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-gateway`;

// Token-based gateway call (no JWT required)
async function callGatewayToken<T = any>(action: string, params: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    return await res.json();
  } catch (e: any) {
    return { error: e?.message ?? 'Network error' };
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface InsurerProfile {
  id: string;
  name: string;
  logo_url?: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  pic_name?: string | null;
  pic_email?: string | null;
  pic_phone?: string | null;
}

export interface InsurerOrder {
  id: string;
  order_number: string | null;
  client_name: string;
  client_phone: string | null;
  product_name: string;
  product_code: string;
  coverage_type: string;
  sum_insured: number | null;
  total_premium: number | null;
  net_premium: number | null;
  status: string;
  insurer_decision?: 'APPROVED' | 'REQUEST_INFO' | 'DECLINED' | null;
  insurer_decision_notes?: string | null;
  insurer_decision_at?: string | null;
  policy_number: string | null;
  policy_document_url: string | null;
  // SLA v1.50.0: batas waktu upload softcopy polis setelah insurer APPROVED
  policy_upload_deadline?: string | null;
  vehicle_image_url: string | null;
  vehicle_details: Record<string, any> | null;
  created_at: string;
  reviewed_at: string | null;
  issued_at: string | null;
}

export interface InsurerKpi {
  total: number;
  pending: number;
  approved: number;
  request_info: number;
  declined: number;
  issued: number;
  awaiting_policy?: number;
}

export interface InsurerDashboard {
  insurer: InsurerProfile;
  orders: InsurerOrder[];
  kpi: InsurerKpi;
  token_expires_at?: string;
}

export interface InsurerPayment {
  id: string;
  order_id: string;
  order_number: string | null;
  client_name: string | null;
  product_name: string | null;
  total_premium: number | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_channel: string | null;
  paid_amount: number | null;
  paid_at: string | null;
  payer_email: string | null;
  created_at: string;
  updated_at: string | null;
}

// ── API ──────────────────────────────────────────────────────────────────────

export async function getInsurerDashboard(token: string): Promise<InsurerDashboard> {
  const { data, error } = await callGatewayToken<InsurerDashboard>('get_insurer_dashboard', { token });
  if (error) throw new Error(error);
  return data as InsurerDashboard;
}

export async function submitInsurerDecisionAuthed(
  token: string,
  orderId: string,
  action: 'APPROVED' | 'REQUEST_INFO' | 'DECLINED',
  notes: string,
): Promise<void> {
  const { error } = await callGatewayToken('insurer_submit_decision_authed', { token, order_id: orderId, action, notes });
  if (error) throw new Error(error);
}

export async function listInsurerPayments(token: string): Promise<InsurerPayment[]> {
  const { data, error } = await callGatewayToken<{ payments: InsurerPayment[] }>('insurer_list_payments', { token });
  if (error) throw new Error(error);
  return data?.payments ?? [];
}

export async function uploadInsurerPolicy(
  token: string,
  orderId: string,
  file: File,
  policyNumber: string,
): Promise<void> {
  // Step 1: upload PDF to policy-documents bucket
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const path = `${orderId}/policy-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('policy-documents')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (upErr) throw new Error(`Upload gagal: ${upErr.message}`);

  // Step 2: get public URL (gateway will resolve to signed URL when serving)
  const { data: urlData } = supabase.storage.from('policy-documents').getPublicUrl(path);
  const policyDocumentUrl = urlData.publicUrl;

  // Step 3: call gateway to update order + send notifications
  const { error } = await callGatewayToken('insurer_upload_policy', {
    token,
    order_id: orderId,
    policy_document_url: policyDocumentUrl,
    policy_number: policyNumber,
  });
  if (error) throw new Error(error);
}
