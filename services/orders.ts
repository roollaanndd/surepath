// Policy orders, policies, renewals, endorsements, life applications,
// payments and admin order/payment stats.
//
// Anything tied to `sp_policy_orders`, `sp_policies`, `sp_renewals`,
// `sp_endorsements`, `sp_life_applications`, `sp_payments` or admin overviews
// of those tables lives here.

import { supabase, callGateway } from './db';
import type {
  SpPolicy,
  SpPolicyOrder,
  SpRenewal,
  SpEndorsement,
  SpLifeApplication,
  SpPayment,
  AdminStats,
} from './dbTypes';

// ─── Policies ─────────────────────────────────────────────────────────────────

export async function getAgentPolicies(agentId: string): Promise<SpPolicy[]> {
  const { data, error } = await supabase
    .from('sp_policies')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAgentPolicies error:', error);
    return [];
  }
  return (data ?? []) as SpPolicy[];
}

export async function createPolicy(data: Omit<SpPolicy, 'id' | 'created_at'>): Promise<SpPolicy | null> {
  const policyNumber = `SP-${data.type}-${Date.now().toString(36).toUpperCase()}`;
  const { data: result, error } = await supabase
    .from('sp_policies')
    .insert({ ...data, policy_number: policyNumber })
    .select()
    .single();
  if (error) {
    console.error('createPolicy error:', error);
    return null;
  }
  return result as SpPolicy;
}

// ─── Expiring Policies ────────────────────────────────────────────────────────

export async function getExpiringPolicies(
  agentId: string,
  daysAhead = 30,
): Promise<Array<SpPolicy & { client_name_resolved: string }>> {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + daysAhead);

  const todayStr = today.toISOString().split('T')[0];
  const futureStr = future.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sp_policies')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'ACTIVE')
    .gte('end_date', todayStr)
    .lte('end_date', futureStr)
    .order('end_date', { ascending: true });

  if (error) return [];

  const policies = (data ?? []) as SpPolicy[];

  const clientIds = policies
    .map((p) => p.client_id)
    .filter((id): id is string => !!id);

  const clientMap: Record<string, string> = {};

  if (clientIds.length > 0) {
    const { data: clientRows } = await supabase
      .from('sp_clients')
      .select('id, name')
      .in('id', clientIds);

    (clientRows ?? []).forEach((c: any) => {
      clientMap[c.id] = c.name;
    });
  }

  return policies.map((p) => ({
    ...p,
    client_name_resolved: p.client_id
      ? (clientMap[p.client_id] ?? p.client_name)
      : p.client_name,
  }));
}

// ─── Policy Orders ────────────────────────────────────────────────────────────

export async function createPolicyOrder(data: Omit<SpPolicyOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>): Promise<SpPolicyOrder | null> {
  // Route through the gateway: the owner (agent_id) is derived server-side from
  // the authenticated caller, so any client-supplied agent_id is ignored.
  const { data: result, error } = await callGateway('create_policy_order', data as unknown as Record<string, unknown>);
  if (error) { console.error('createPolicyOrder:', error); throw new Error(error); }
  return (result as SpPolicyOrder) ?? null;
}

export async function getAgentOrders(_agentId: string): Promise<SpPolicyOrder[]> {
  // FIX v1.50.0: sp_policy_orders is deny-all (gateway only) — the old direct
  // read always returned an empty list, so agents never saw their own orders
  // ("pengajuan tidak tersimpan"). Ownership is derived server-side; the
  // param is kept for signature stability.
  const { data, error } = await callGateway('get_my_orders');
  if (error) { console.error('getAgentOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

export async function getCustomerOrders(_clientId: string): Promise<SpPolicyOrder[]> {
  // Routed through the gateway, which scopes results to the authenticated
  // caller's own orders (client_id = caller). The param is kept for signature
  // stability but the server derives ownership; it is not trusted.
  const { data, error } = await callGateway('get_my_orders');
  if (error) { console.error('getCustomerOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

export async function cancelMyOrder(orderId: string): Promise<SpPolicyOrder | null> {
  // Customer-scoped cancel; the gateway verifies ownership (client_id = caller)
  // and that the order is still cancellable (SUBMITTED / UNDER_REVIEW).
  const { data, error } = await callGateway('cancel_my_order', { order_id: orderId });
  if (error) { console.error('cancelMyOrder:', error); return null; }
  return (data as SpPolicyOrder) ?? null;
}

export async function getAllOrders(): Promise<SpPolicyOrder[]> {
  const { data, error } = await callGateway('admin_list_orders', { limit: 500 });
  if (error) { console.error('getAllOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

export async function updateOrderStatus(
  id: string,
  status: SpPolicyOrder['status'],
  extras?: { reviewer_notes?: string; policy_number?: string; policy_document_url?: string; sp_policy_id?: string }
): Promise<boolean> {
  const { error } = await callGateway('admin_update_order', { order_id: id, status, ...extras });
  if (error) { console.error('updateOrderStatus:', error); return false; }
  return true;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getOrderPayment(orderId: string): Promise<SpPayment | null> {
  // FIX v1.50.0: sp_payments is deny-all (gateway only) — direct reads always
  // returned nothing. The gateway scopes results to the caller's own orders
  // (admins may pass arbitrary order_ids).
  const { data, error } = await callGateway('get_my_payments', { order_ids: [orderId] });
  if (error) { console.error('getOrderPayment:', error); return null; }
  const rows = (data ?? []) as SpPayment[];
  return rows[0] ?? null;
}

export async function getPaymentsByOrderIds(orderIds: string[]): Promise<SpPayment[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await callGateway('get_my_payments', { order_ids: orderIds });
  if (error) { console.error('getPaymentsByOrderIds:', error); return []; }
  return (data ?? []) as SpPayment[];
}

// ─── Admin Analytics ──────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await callGateway('admin_stats', {});
  if (error) { console.error('getAdminStats:', error); return { totalOrders: 0, ordersByStatus: {}, totalPremiumIssued: 0, totalPremiumPaid: 0, activeAgents: 0, pendingCommissions: 0, topAgents: [] }; }
  return (data as any) as AdminStats;
}

export async function getAdminPayments(limit = 200): Promise<Array<SpPayment & {
  order_number?: string;
  client_name?: string;
  product_name?: string;
}>> {
  const { data, error } = await callGateway('admin_list_payments', { limit });
  if (error) { console.error('getAdminPayments:', error); return []; }
  return (data ?? []) as SpPayment[];
}

export async function getAdminFinancialReports(year: number): Promise<{
  orders: Array<{ total_premium: number; created_at: string }>;
  commissions: Array<{ commission_amount: number; created_at: string }>;
  claims: Array<{ amount_approved: number; created_at: string }>;
}> {
  const { data, error } = await callGateway('admin_financial_reports', { year });
  if (error) { console.error('getAdminFinancialReports:', error); return { orders: [], commissions: [], claims: [] }; }
  return (data as any) ?? { orders: [], commissions: [], claims: [] };
}

// ─── Renewal Engine ───────────────────────────────────────────────────────────

export async function getExpiringOrders(_agentId: string, days: number): Promise<SpPolicyOrder[]> {
  // FIX v1.50.0: sp_policy_orders is deny-all (gateway only) — fetch own
  // orders via the gateway and filter the expiry window client-side.
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + days);

  const todayStr  = today.toISOString().split('T')[0];
  const futureStr = future.toISOString().split('T')[0];

  const { data, error } = await callGateway('get_my_orders');
  if (error) { console.error('getExpiringOrders:', error); return []; }
  return ((data ?? []) as SpPolicyOrder[])
    .filter(o => o.status === 'ISSUED' && !!o.end_date && o.end_date >= todayStr && o.end_date <= futureStr)
    .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''));
}

export async function upsertRenewal(data: {
  original_order_id: string;
  agent_id: string;
  client_name: string;
  client_phone?: string;
  product_name: string;
  expiry_date: string;
}): Promise<void> {
  const { error } = await supabase
    .from('sp_renewals')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'original_order_id' },
    );
  if (error) console.error('upsertRenewal:', error);
}

export async function markRenewalReminderSent(originalOrderId: string): Promise<void> {
  const { error } = await supabase
    .from('sp_renewals')
    .update({ reminder_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('original_order_id', originalOrderId);
  if (error) console.error('markRenewalReminderSent:', error);
}

export async function getRenewalsByAgent(agentId: string): Promise<SpRenewal[]> {
  const { data, error } = await supabase
    .from('sp_renewals')
    .select('*')
    .eq('agent_id', agentId)
    .order('expiry_date', { ascending: true });
  if (error) { console.error('getRenewalsByAgent:', error); return []; }
  return (data ?? []) as SpRenewal[];
}

// ─── Endorsements ─────────────────────────────────────────────────────────────

export async function createEndorsement(
  data: Omit<SpEndorsement, 'id' | 'status' | 'created_at'>,
): Promise<SpEndorsement | null> {
  const { data: result, error } = await supabase
    .from('sp_endorsements')
    .insert({ ...data, status: 'PENDING' })
    .select()
    .single();
  if (error) { console.error('createEndorsement:', error); return null; }
  return result as SpEndorsement;
}

export async function getAgentEndorsements(agentId: string): Promise<SpEndorsement[]> {
  const { data, error } = await supabase
    .from('sp_endorsements')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAgentEndorsements:', error); return []; }
  return (data ?? []) as SpEndorsement[];
}

export async function getAdminEndorsements(): Promise<SpEndorsement[]> {
  const { data, error } = await supabase
    .from('sp_endorsements')
    .select('*, sp_policy_orders!order_id(order_number, client_name), sp_users!agent_id(name, agent_code)')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAdminEndorsements:', error); return []; }
  return (data ?? []) as SpEndorsement[];
}

export async function reviewEndorsement(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  notes?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_endorsements')
    .update({
      status,
      reviewer_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) { console.error('reviewEndorsement:', error); return false; }
  return true;
}

// ─── Life Insurance Applications ──────────────────────────────────────────────

export async function createLifeApplication(
  data: Omit<SpLifeApplication, 'id' | 'order_number' | 'created_at' | 'updated_at'>,
): Promise<SpLifeApplication | null> {
  const { data: result, error } = await supabase
    .from('sp_life_applications')
    .insert({ ...data, order_number: `LIFE-${Date.now().toString(36).toUpperCase()}`, status: data.status ?? 'SUBMITTED' })
    .select()
    .single();
  if (error) { console.error('createLifeApplication:', error); return null; }
  return result as SpLifeApplication;
}

export async function getAgentLifeApplications(agentId: string): Promise<SpLifeApplication[]> {
  const { data, error } = await supabase
    .from('sp_life_applications')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAgentLifeApplications:', error); return []; }
  return (data ?? []) as SpLifeApplication[];
}

export async function getAllLifeApplications(): Promise<SpLifeApplication[]> {
  const { data, error } = await supabase
    .from('sp_life_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllLifeApplications:', error); return []; }
  return (data ?? []) as SpLifeApplication[];
}

export async function updateLifeApplicationStatus(
  id: string,
  status: string,
  notes?: string,
  policyNumber?: string,
): Promise<boolean> {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) payload.insurer_notes = notes;
  if (policyNumber !== undefined) payload.policy_number = policyNumber;
  const { error } = await callGateway('admin_update_life_application', { application_id: id, ...payload }).then(r => r.error ? { error: r.error } : { error: null });
  if (error) { console.error('updateLifeApplicationStatus:', error); return false; }
  return true;
}
