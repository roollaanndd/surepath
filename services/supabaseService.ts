import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface SpUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  agent_code?: string;
  monthly_target?: number;
  trust_score?: number;
  created_at?: string;
  ktp?: string;
  address?: string;
  verified?: boolean;
  commission_rate?: number;
  upline_id?: string;
  referral_code?: string | null;
  tier?: 'STAR' | 'ELITE' | null;
  tier_assigned_by?: string | null;
  tier_assigned_at?: string | null;
  profile_photo_url?: string | null;
  ktp_document_url?: string | null;
  is_suspended?: boolean;
  // B2B corporate fields
  company_name?: string | null;
  company_reg_no?: string | null;
  company_industry?: string | null;
}

export interface DownlineNode extends SpUser {
  l2: SpUser[];
}

export interface SpClient {
  id: string;
  agent_id: string;
  name: string;
  phone: string;
  email?: string;
  ktp?: string;
  address?: string;
  occupation?: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpPolicy {
  id: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  premium: number;
  start_date: string;
  end_date: string;
  policy_number?: string;
  coverage_details?: any;
  created_at?: string;
}

export interface SpCommission {
  id: string;
  agent_id: string;
  policy_id?: string;
  order_id?: string;
  order_number?: string;
  client_name: string;
  product_type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  premium_amount: number;
  commission_amount: number;
  discount_rate?: number;
  coin_reward?: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  created_at?: string;
  paid_at?: string;
}

export interface SpQuote {
  id: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  product_type: 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
  status: 'DRAFT' | 'SENT' | 'CONVERTED' | 'EXPIRED';
  premium_estimate: number;
  details: any;
  created_at?: string;
  updated_at?: string;
}

export interface AgentStats {
  totalCommissionMonth: number;
  totalCommissionAllTime: number;
  clientsCount: number;
  policiesCount: number;
  pendingCommission: number;
}

// ─── Agent Profile ────────────────────────────────────────────────────────────

export async function getAgentProfile(agentId: string): Promise<SpUser | null> {
  const { data, error } = await callGateway('get_user_profile', { user_id: agentId });
  if (error) return null;
  return (data as SpUser) ?? null;
}

export async function updateAgentProfile(
  _agentId: string,
  updates: { name?: string; phone?: string; address?: string },
): Promise<boolean> {
  const { error } = await callGateway('update_my_profile', updates);
  if (error) { console.error('updateAgentProfile:', error); return false; }
  return true;
}

export async function getAgentByEmail(_email: string): Promise<SpUser | null> {
  // Always called with the current user's own email after Supabase Auth sign-in.
  // Route through the gateway so the result is always the authenticated caller's
  // own profile, avoiding a direct open query on sp_users.
  const { data, error } = await callGateway('get_my_profile');
  if (error || !data) return null;
  return data as SpUser;
}

// Returns the current user's profile, creating it server-side (from the
// verified JWT identity) if it doesn't exist yet. Safe to call repeatedly.
export async function ensureProfile(params?: {
  name?: string;
  phone?: string;
  role?: 'CUSTOMER' | 'AGENT';
  ktp?: string | null;
  address?: string | null;
  referral_code?: string | null;
}): Promise<SpUser | null> {
  const { data, error } = await callGateway('ensure_profile', params);
  if (error || !data) return null;
  return data as SpUser;
}

export async function getUserByEmail(_email: string): Promise<SpUser | null> {
  // Same as above — always fetches the current authenticated user's own profile.
  const { data, error } = await callGateway('get_my_profile');
  if (error || !data) return null;
  return data as SpUser;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getAgentClients(agentId: string): Promise<SpClient[]> {
  const { data, error } = await supabase
    .from('sp_clients')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAgentClients error:', error);
    return [];
  }
  return (data ?? []) as SpClient[];
}

export async function addClient(data: Omit<SpClient, 'id' | 'created_at' | 'updated_at'>): Promise<SpClient | null> {
  const { data: result, error } = await supabase
    .from('sp_clients')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('addClient error:', error);
    return null;
  }
  return result as SpClient;
}

export async function updateClient(id: string, updates: Partial<SpClient>): Promise<SpClient | null> {
  const { data, error } = await supabase
    .from('sp_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateClient error:', error);
    return null;
  }
  return data as SpClient;
}

export async function deleteClient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sp_clients')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteClient error:', error);
    return false;
  }
  return true;
}

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

// ─── Commissions ──────────────────────────────────────────────────────────────

export async function getAgentCommissions(agentId: string): Promise<SpCommission[]> {
  const { data, error } = await supabase
    .from('sp_commissions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAgentCommissions error:', error);
    return [];
  }
  return (data ?? []) as SpCommission[];
}

export async function addCommission(data: Omit<SpCommission, 'id' | 'created_at'>): Promise<SpCommission | null> {
  const { data: result, error } = await supabase
    .from('sp_commissions')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('addCommission error:', error);
    return null;
  }
  return result as SpCommission;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export async function getAgentQuotes(agentId: string): Promise<SpQuote[]> {
  const { data, error } = await supabase
    .from('sp_quotes')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAgentQuotes error:', error);
    return [];
  }
  return (data ?? []) as SpQuote[];
}

export async function saveQuote(data: Omit<SpQuote, 'id' | 'created_at' | 'updated_at'>): Promise<SpQuote | null> {
  const { data: result, error } = await supabase
    .from('sp_quotes')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('saveQuote error:', error);
    return null;
  }
  return result as SpQuote;
}

export async function updateQuoteStatus(id: string, status: SpQuote['status']): Promise<boolean> {
  const { error } = await supabase
    .from('sp_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('updateQuoteStatus error:', error);
    return false;
  }
  return true;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<Array<{ agent_id: string; agent_name: string; agent_code: string; total_commission: number }>> {
  const { data, error } = await callGateway('get_leaderboard', {});
  if (error) { console.error('getLeaderboard:', error); return []; }
  return (data as any) ?? [];
}

// ─── Agent Stats ──────────────────────────────────────────────────────────────

export async function getAgentStats(agentId: string): Promise<AgentStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [commissionsRes, clientsRes, policiesRes] = await Promise.all([
    supabase.from('sp_commissions').select('commission_amount, status, created_at').eq('agent_id', agentId),
    supabase.from('sp_clients').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    supabase.from('sp_policies').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('status', 'ACTIVE'),
  ]);

  const commissions: SpCommission[] = (commissionsRes.data ?? []) as SpCommission[];

  const totalCommissionMonth = commissions
    .filter((c) => c.status === 'PAID' && (c.created_at ?? '') >= startOfMonth)
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const totalCommissionAllTime = commissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const pendingCommission = commissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  return {
    totalCommissionMonth,
    totalCommissionAllTime,
    clientsCount: clientsRes.count ?? 0,
    policiesCount: policiesRes.count ?? 0,
    pendingCommission,
  };
}

// ─── Seed Demo Data ───────────────────────────────────────────────────────────

export async function seedDemoAgentData(agentId: string): Promise<void> {
  const demoClients = [
    { name: 'Budi Santoso', phone: '081234567890', email: 'budi@email.com', occupation: 'Wirausaha', status: 'ACTIVE' as const, notes: 'Nasabah loyal sejak 2022' },
    { name: 'Siti Rahayu', phone: '081234567891', email: 'siti@email.com', occupation: 'PNS', status: 'ACTIVE' as const, notes: 'Interested in travel insurance' },
    { name: 'Ahmad Fauzi', phone: '081234567892', email: 'ahmad@email.com', occupation: 'Karyawan Swasta', status: 'ACTIVE' as const, notes: '' },
    { name: 'Dewi Lestari', phone: '081234567893', email: 'dewi@email.com', occupation: 'Dokter', status: 'ACTIVE' as const, notes: 'High-value client' },
    { name: 'Eko Prasetyo', phone: '081234567894', email: 'eko@email.com', occupation: 'Guru', status: 'PROSPECT' as const, notes: 'Referred by Budi' },
    { name: 'Fitri Handayani', phone: '081234567895', email: 'fitri@email.com', occupation: 'Ibu Rumah Tangga', status: 'PROSPECT' as const, notes: 'Menanyakan asuransi PA' },
    { name: 'Ganteng Saputra', phone: '081234567896', email: 'ganteng@email.com', occupation: 'Pengacara', status: 'INACTIVE' as const, notes: 'Polis habis Maret' },
    { name: 'Hani Puspita', phone: '081234567897', email: 'hani@email.com', occupation: 'Arsitek', status: 'ACTIVE' as const, notes: 'Minta renewal reminder' },
  ];

  const { data: insertedClients } = await supabase
    .from('sp_clients')
    .insert(demoClients.map((c) => ({ ...c, agent_id: agentId })))
    .select();

  const clients = insertedClients ?? [];
  const types: Array<'CAR' | 'TRAVEL' | 'PA' | 'MPAR'> = ['CAR', 'TRAVEL', 'PA', 'MPAR'];
  const now = new Date();

  // 15 commissions over 3 months
  const commissions = Array.from({ length: 15 }, (_, i) => {
    const monthsAgo = Math.floor(i / 5);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
    const productType = types[i % 4];
    const premiums: Record<string, number> = { CAR: 4500000, TRAVEL: 800000, PA: 300000, MPAR: 600000 };
    const rates: Record<string, number> = { CAR: 0.12, TRAVEL: 0.15, PA: 0.2, MPAR: 0.15 };
    const premium = premiums[productType];
    const commission = Math.round(premium * rates[productType]);
    const clientObj = clients[i % clients.length] as any;
    return {
      agent_id: agentId,
      client_name: clientObj?.name ?? `Client ${i + 1}`,
      product_type: productType,
      premium_amount: premium,
      commission_amount: commission,
      status: i < 10 ? 'PAID' as const : 'PENDING' as const,
      created_at: date.toISOString(),
    };
  });

  await supabase.from('sp_commissions').insert(commissions);

  // 10 policies
  const policies = Array.from({ length: 10 }, (_, i) => {
    const productType = types[i % 4];
    const premiums: Record<string, number> = { CAR: 4500000, TRAVEL: 800000, PA: 300000, MPAR: 600000 };
    const clientObj = clients[i % clients.length] as any;
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    return {
      agent_id: agentId,
      client_id: clientObj?.id ?? null,
      client_name: clientObj?.name ?? `Client ${i + 1}`,
      type: productType,
      status: i < 8 ? 'ACTIVE' as const : 'PENDING' as const,
      premium: premiums[productType],
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      policy_number: `SP-${productType}-${Date.now().toString(36).toUpperCase()}-${i}`,
      coverage_details: {},
    };
  });

  await supabase.from('sp_policies').insert(policies);
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

// ─── Claims ───────────────────────────────────────────────────────────────────

export interface SpClaim {
  id: string;
  policy_id?: string;
  user_id?: string;
  agent_id?: string;
  claim_number?: string;
  client_name?: string;
  policy_number?: string;
  product_type?: string;
  date?: string;
  location?: string;
  chronology?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  amount_estimated?: number;
  amount_approved?: number;
  photos?: string[];
  admin_notes?: string;
  created_at?: string;
}

export async function getAgentClaims(agentId: string): Promise<SpClaim[]> {
  const { data, error } = await supabase
    .from('sp_claims')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAgentClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}

export async function submitClaim(data: Omit<SpClaim, 'id' | 'created_at' | 'claim_number'>): Promise<SpClaim | null> {
  const { data: result, error } = await supabase
    .from('sp_claims')
    .insert(data)
    .select()
    .single();
  if (error) { console.error('submitClaim:', error); return null; }
  return result as SpClaim;
}

export async function updateClaimStatus(id: string, status: SpClaim['status'], admin_notes?: string): Promise<boolean> {
  const { error } = await callGateway('admin_update_claim', { claim_id: id, status, adjuster_notes: admin_notes });
  if (error) { console.error('updateClaimStatus:', error); return false; }
  return true;
}

export async function getAllClaims(): Promise<SpClaim[]> {
  const { data, error } = await callGateway('admin_list_claims', { limit: 500 });
  if (error) { console.error('getAllClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface SpNotification {
  id: string;
  agent_id: string;
  type: 'COMMISSION_EARNED' | 'CLAIM_UPDATE' | 'RENEWAL_ALERT' | 'QUOTE_ACCEPTED' | 'SYSTEM';
  title: string;
  body: string;
  read: boolean;
  metadata?: any;
  created_at?: string;
}

export async function getNotifications(agentId: string): Promise<SpNotification[]> {
  const { data, error } = await supabase
    .from('sp_notifications')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('getNotifications:', error); return []; }
  return (data ?? []) as SpNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('sp_notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(agentId: string): Promise<void> {
  await supabase.from('sp_notifications').update({ read: true }).eq('agent_id', agentId).eq('read', false);
}

export async function addNotification(data: Omit<SpNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  await supabase.from('sp_notifications').insert({ ...data, read: false });
}

// ─── Admin: Agent Management (via data-gateway) ───────────────────────────────

export async function getAllAgents(): Promise<SpUser[]> {
  const { data, error } = await callGateway('admin_list_users', { role: 'AGENT', limit: 500 });
  if (error) { console.error('getAllAgents:', error); return []; }
  return (data ?? []) as SpUser[];
}

export async function getAdminUser(userId: string): Promise<SpUser | null> {
  const { data, error } = await callGateway('admin_get_user', { user_id: userId });
  if (error) { console.error('getAdminUser:', error); return null; }
  return data as SpUser ?? null;
}

export async function updateAgentVerification(agentId: string, verified: boolean): Promise<boolean> {
  const { error } = await callGateway('admin_update_user', { user_id: agentId, verified });
  if (error) { console.error('updateAgentVerification:', error); return false; }
  return true;
}

export async function updateAgentCommissionRate(agentId: string, rate: number): Promise<boolean> {
  const { error } = await callGateway('admin_update_user', { user_id: agentId, commission_rate: rate });
  if (error) { console.error('updateAgentCommissionRate:', error); return false; }
  return true;
}

// ─── Agent Registration ───────────────────────────────────────────────────────

export async function registerAgent(data: {
  name: string;
  email: string;
  phone: string;
  ktp?: string;
  address?: string;
}): Promise<SpUser | null> {
  const { data: result, error } = await callGateway('admin_register_agent', data);
  if (error) { console.error('registerAgent:', error); return null; }
  return result as SpUser;
}

export async function createCustomerProfile(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
}): Promise<SpUser | null> {
  const payload = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'CUSTOMER',
    trust_score: 85,
    verified: true,
  };
  const { data: result, error } = await supabase
    .from('sp_users')
    .insert(payload)
    .select()
    .single();
  if (error) return null;
  return result as SpUser;
}

export async function createB2BClientProfile(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
}): Promise<SpUser | null> {
  const payload = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'B2B_CLIENT',
    address: data.company_name ?? null,
    trust_score: 85,
    verified: false,
  };
  const { data: result, error } = await supabase
    .from('sp_users')
    .insert(payload)
    .select()
    .single();
  if (error) return null;
  return result as SpUser;
}

// ─── Policy Orders ────────────────────────────────────────────────────────────

export interface SpPolicyOrder {
  id: string;
  order_number?: string;
  agent_id: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_ktp?: string;
  product_code: string;
  product_name: string;
  vehicle_type?: 'CAR' | 'MOTORCYCLE';
  vehicle_details: any;
  vehicle_image_url?: string;
  ai_score?: number;
  ai_verdict?: string;
  ai_findings?: any[];
  coverage_type: 'COMPREHENSIVE' | 'TLO' | 'CUSTOM' | 'MPAR' | 'PA' | 'TRAVEL' | 'LIFE';
  sum_insured: number;
  zone: number;
  vehicle_category: number;
  addons: any;
  base_premium: number;
  addon_premium: number;
  admin_fee: number;
  stamp_duty: number;
  total_premium: number;
  ojk_rate?: number;
  discount_rate?: number;
  discount_amount?: number;
  promo_code?: string;
  net_premium?: number;
  commission_rate?: number;
  commission_amount?: number;
  coin_reward?: number;
  start_date?: string;
  end_date?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'CANCELLED';
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  policy_number?: string;
  policy_document_url?: string;
  issued_at?: string;
  sp_policy_id?: string;
  insurer_id?: string;
  insurer_name?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createPolicyOrder(data: Omit<SpPolicyOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>): Promise<SpPolicyOrder | null> {
  // Route through the gateway: the owner (agent_id) is derived server-side from
  // the authenticated caller, so any client-supplied agent_id is ignored.
  const { data: result, error } = await callGateway('create_policy_order', data as unknown as Record<string, unknown>);
  if (error) { console.error('createPolicyOrder:', error); throw new Error(error); }
  return (result as SpPolicyOrder) ?? null;
}

export async function getAgentOrders(agentId: string): Promise<SpPolicyOrder[]> {
  const { data, error } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
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

export async function getCustomerClaims(_userId: string): Promise<SpClaim[]> {
  // Routed through the gateway, which scopes results to the authenticated
  // caller's own claims (user_id = caller). The param is kept for signature
  // stability but the server derives ownership; it is not trusted.
  const { data, error } = await callGateway('get_my_claims');
  if (error) { console.error('getCustomerClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
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

// ─── Storage: Upload vehicle image ────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const ALLOWED_PDF_TYPES   = ['pdf'];

function safeExt(filename: string, allowed: string[], fallback: string): string {
  const raw = filename.split('.').pop()?.toLowerCase() ?? fallback;
  return allowed.includes(raw) ? raw : fallback;
}

export async function uploadVehicleImage(file: File, orderId: string): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'jpg');
  const path = `${orderId}/vehicle.${ext}`;
  const { error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadVehicleImage:', error); return null; }
  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPolicyDocument(file: File, orderNumber: string): Promise<string | null> {
  const ext = safeExt(file.name, ALLOWED_PDF_TYPES, 'pdf');
  const path = `${orderNumber}/policy.${ext}`;
  const { error } = await supabase.storage
    .from('policy-documents')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (error) { console.error('uploadPolicyDocument:', error); return null; }
  const { data } = supabase.storage.from('policy-documents').getPublicUrl(path);
  return data.publicUrl;
}

// policy-documents and agent-docs are private buckets — the *_url fields
// still hold the old-style public URL string, so this swaps it for a
// short-lived signed URL at view time (RLS still scopes who may sign one).
const SIGNED_URL_BUCKETS = new Set(['policy-documents', 'agent-docs']);

export async function resolveDocumentUrl(rawUrl: string | null | undefined, expiresIn = 300): Promise<string | null> {
  if (!rawUrl) return null;
  const match = rawUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return rawUrl;
  const [, bucket, encodedPath] = match;
  if (!SIGNED_URL_BUCKETS.has(bucket)) return rawUrl;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(decodeURIComponent(encodedPath), expiresIn);
  if (error) { console.error('resolveDocumentUrl:', error); return null; }
  return data.signedUrl;
}

export async function uploadInsurerLogo(insurerId: string, file: File): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'png');
  const path = `${insurerId}/logo.${ext}`;
  const { error } = await supabase.storage
    .from('insurer-logos')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadInsurerLogo:', error); return null; }
  const { data } = supabase.storage.from('insurer-logos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadLogoImage(file: File): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'png');
  const path = `logo/logo.${ext}`;
  const { error } = await supabase.storage
    .from('website-assets')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadLogoImage:', error); return null; }
  const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSectionImage(file: File, sectionKey: string): Promise<string | null> {
  const ext  = safeExt(file.name, ALLOWED_IMAGE_TYPES, 'jpg');
  const path = `sections/${sectionKey}.${ext}`;
  const { error } = await supabase.storage
    .from('website-assets')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadSectionImage:', error); return null; }
  const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Product Commission & Coin Configs ───────────────────────────────────────

export interface SpProductConfig {
  id: string;
  product_code: string;
  product_name: string;
  vehicle_type: string;
  coverage_type: string;
  base_commission_rate: number; // 0.0 – 0.25
  max_discount_rate: number;    // 0.0 – base_commission_rate
  coin_rate: number;            // 0.05 – 0.25
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getProductConfigs(): Promise<SpProductConfig[]> {
  const { data, error } = await supabase
    .from('sp_product_configs')
    .select('*')
    .order('product_code');
  if (error) { console.error('getProductConfigs:', error); return []; }
  return (data ?? []) as SpProductConfig[];
}

export async function getProductConfig(productCode: string): Promise<SpProductConfig | null> {
  const { data, error } = await supabase
    .from('sp_product_configs')
    .select('*')
    .eq('product_code', productCode)
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('getProductConfig:', error); return null; }
  return data as SpProductConfig | null;
}

export async function updateProductConfig(id: string, updates: Partial<SpProductConfig>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_product_configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateProductConfig:', error); return false; }
  return true;
}

export async function createProductConfig(
  data: Omit<SpProductConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<SpProductConfig | null> {
  const { data: result, error } = await supabase
    .from('sp_product_configs')
    .insert(data)
    .select()
    .single();
  if (error) { console.error('createProductConfig:', error); return null; }
  return result as SpProductConfig;
}

// ─── Coin Ledger ─────────────────────────────────────────────────────────────

export interface SpCoinLedger {
  id: string;
  agent_id: string;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
  coins: number;
  rp_value: number;
  order_id?: string;
  description?: string;
  created_at?: string;
}

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

export interface SpPayment {
  id: string;
  order_id: string;
  external_id: string;
  xendit_invoice_id?: string;
  invoice_url?: string;
  amount: number;
  currency: string;
  status: string; // PENDING | PAID | EXPIRED | FAILED
  payment_method?: string;
  payment_channel?: string;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getOrderPayment(orderId: string): Promise<SpPayment | null> {
  const { data, error } = await supabase
    .from('sp_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('getOrderPayment:', error); return null; }
  return data as SpPayment | null;
}

export async function getPaymentsByOrderIds(orderIds: string[]): Promise<SpPayment[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await supabase
    .from('sp_payments')
    .select('*')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });
  if (error) { console.error('getPaymentsByOrderIds:', error); return []; }
  return (data ?? []) as SpPayment[];
}

// ─── Admin Analytics ──────────────────────────────────────────────────────────

export interface AdminStats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalPremiumIssued: number;
  totalPremiumPaid: number;
  activeAgents: number;
  pendingCommissions: number;
  topAgents: Array<{ agent_id: string; name: string; premium: number; orders: number }>;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await callGateway('admin_stats', {});
  if (error) { console.error('getAdminStats:', error); return { totalOrders: 0, ordersByStatus: {}, totalPremiumIssued: 0, totalPremiumPaid: 0, activeAgents: 0, pendingCommissions: 0, topAgents: [] }; }
  return (data as any) as AdminStats;
}

// ─── Insurer & Product Terms ──────────────────────────────────────────────────

export interface SpInsurer {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  admin_name?: string;
  admin_email?: string;
  pic_name?: string;
  pic_phone?: string;
  logo_url?: string;
  created_at?: string;
}

export interface SpInsurerAuthToken {
  id: string;
  insurer_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at?: string;
  created_at?: string;
}

export interface SpInsurerProduct {
  id: string;
  insurer_id: string;
  product_type: string;
  vehicle_coverage: string;
  max_vehicle_age_years?: number | null;
  base_commission_rate: number;
  max_discount_rate: number;
  coin_rate: number;
  stamp_duty: number;
  policy_cost: number;
  authorized_garage_rate: number;
  authorized_garage_max_age_years: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  insurer_name?: string;
  insurer_code?: string;
  insurer_logo_url?: string;
}

// ─── Vehicle Overrides ────────────────────────────────────────────────────────

export interface SpVehicleOverride {
  id: string;
  brand: string;
  model: string;
  ref_year: number;
  list_price_m: number;
  market_value_rp: number;
  discount_rate: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Insurer Portal Auth ──────────────────────────────────────────────────────

export async function createInsurerAuthToken(insurer_id: string, email: string): Promise<string | null> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
  const { error } = await supabase.from('sp_insurer_auth_tokens').insert({
    insurer_id, token, email, expires_at,
  });
  if (error) {
    // Table may not exist yet — gracefully degrade
    console.warn('createInsurerAuthToken:', error.message);
    return token; // return token anyway so URL still works when table exists
  }
  return token;
}

export async function validateInsurerAuthToken(token: string): Promise<SpInsurer | null> {
  const { data, error } = await supabase
    .from('sp_insurer_auth_tokens')
    .select('*, sp_insurers(*)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  // Mark as used
  await supabase.from('sp_insurer_auth_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);
  return (data.sp_insurers as SpInsurer) ?? null;
}

export async function getInsurerOrders(insurerId: string): Promise<SpPolicyOrder[]> {
  const { data, error } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .eq('insurer_id', insurerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getInsurerOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

// ─── Insurer CRUD ─────────────────────────────────────────────────────────────

export async function getInsurers(): Promise<SpInsurer[]> {
  const { data, error } = await supabase
    .from('sp_insurers')
    .select('*')
    .order('name');
  if (error) { console.error('getInsurers:', error); return []; }
  return (data ?? []) as SpInsurer[];
}

export async function createInsurer(payload: Omit<SpInsurer, 'id' | 'created_at'>): Promise<SpInsurer | null> {
  const { data, error } = await supabase
    .from('sp_insurers')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createInsurer:', error); return null; }
  return data as SpInsurer;
}

export async function updateInsurer(id: string, payload: Partial<SpInsurer>): Promise<boolean> {
  const { error } = await supabase.from('sp_insurers').update(payload).eq('id', id);
  if (error) { console.error('updateInsurer:', error); return false; }
  return true;
}

export async function deleteInsurer(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_insurers').delete().eq('id', id);
  if (error) { console.error('deleteInsurer:', error); return false; }
  return true;
}

// ─── Insurer Product CRUD ─────────────────────────────────────────────────────

export async function getInsurerProducts(insurer_id?: string): Promise<SpInsurerProduct[]> {
  let q = supabase
    .from('sp_insurer_products')
    .select('*, sp_insurers(name, code)');
  if (insurer_id) q = q.eq('insurer_id', insurer_id);
  const { data, error } = await q.order('product_type').order('vehicle_coverage');
  if (error) { console.error('getInsurerProducts:', error); return []; }
  return (data ?? []).map((r: any) => ({
    ...r,
    insurer_name: r.sp_insurers?.name,
    insurer_code: r.sp_insurers?.code,
  })) as SpInsurerProduct[];
}

export interface AvailableInsurerProductsResult {
  products: SpInsurerProduct[];
  excludedByAgeCount: number;
}

export async function getAvailableInsurerProducts(
  vehicleType: string,
  coverageType: string,
  vehicleAgeYears: number,
): Promise<AvailableInsurerProductsResult> {
  const { data, error } = await supabase
    .from('sp_insurer_products')
    .select('*, sp_insurers!inner(name, code, is_active, logo_url)')
    .eq('product_type', vehicleType)
    .eq('is_active', true)
    .or(`vehicle_coverage.eq.${coverageType},vehicle_coverage.eq.ALL`);
  if (error) { console.error('getAvailableInsurerProducts:', error); return { products: [], excludedByAgeCount: 0 }; }
  const activeRows = (data ?? []).filter((r: any) => r.sp_insurers?.is_active);
  const products = activeRows
    .filter((r: any) => !r.max_vehicle_age_years || vehicleAgeYears <= r.max_vehicle_age_years)
    .map((r: any) => ({
      ...r,
      insurer_name: r.sp_insurers?.name,
      insurer_code: r.sp_insurers?.code,
      insurer_logo_url: r.sp_insurers?.logo_url,
    })) as SpInsurerProduct[];
  return { products, excludedByAgeCount: activeRows.length - products.length };
}

export async function createInsurerProduct(payload: Omit<SpInsurerProduct, 'id' | 'created_at' | 'updated_at' | 'insurer_name' | 'insurer_code'>): Promise<boolean> {
  const { error } = await supabase.from('sp_insurer_products').insert(payload);
  if (error) { console.error('createInsurerProduct:', error); return false; }
  return true;
}

export async function updateInsurerProduct(id: string, payload: Partial<SpInsurerProduct>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_insurer_products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateInsurerProduct:', error); return false; }
  return true;
}

export async function deleteInsurerProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_insurer_products').delete().eq('id', id);
  if (error) { console.error('deleteInsurerProduct:', error); return false; }
  return true;
}

// ─── OJK Rate Set CRUD (services/ojkRates.ts CMS) ─────────────────────────────

export interface SpOjkRateSet {
  id: string;
  version: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  province_zones: Record<string, number>;
  category_bands: Record<string, number>;
  car_comp_min: Record<string, Record<string, number>>;
  car_comp_mid: Record<string, Record<string, number>>;
  car_comp_max: Record<string, Record<string, number>>;
  car_tlo_min: Record<string, Record<string, number>>;
  car_tlo_mid: Record<string, Record<string, number>>;
  car_tlo_max: Record<string, Record<string, number>>;
  moto_comp_min: number;
  moto_comp_mid: number;
  moto_comp_max: number;
  moto_tlo_min: Record<string, number>;
  moto_tlo_mid: Record<string, number>;
  moto_tlo_max: Record<string, number>;
  addon_rates: Record<string, number>;
  non_vehicle_rates: Record<string, any>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getActiveOjkRateSet(): Promise<SpOjkRateSet | null> {
  const { data, error } = await supabase
    .from('sp_ojk_rate_sets')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('getActiveOjkRateSet:', error); return null; }
  return data as SpOjkRateSet | null;
}

export async function getAllOjkRateSets(): Promise<SpOjkRateSet[]> {
  const { data, error } = await supabase
    .from('sp_ojk_rate_sets')
    .select('*')
    .order('effective_date', { ascending: false });
  if (error) { console.error('getAllOjkRateSets:', error); return []; }
  return (data ?? []) as SpOjkRateSet[];
}

export async function createOjkRateSet(payload: Omit<SpOjkRateSet, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  const { error } = await supabase.from('sp_ojk_rate_sets').insert(payload);
  if (error) { console.error('createOjkRateSet:', error); return false; }
  return true;
}

export async function updateOjkRateSet(id: string, payload: Partial<SpOjkRateSet>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_ojk_rate_sets')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateOjkRateSet:', error); return false; }
  return true;
}

// Activates one rate set and deactivates all others (partial unique index
// only allows a single is_active=true row, so the old one must be turned
// off first in the same round-trip).
export async function activateOjkRateSet(id: string): Promise<boolean> {
  const { error: offErr } = await supabase.from('sp_ojk_rate_sets').update({ is_active: false }).eq('is_active', true);
  if (offErr) { console.error('activateOjkRateSet (deactivate):', offErr); return false; }
  const { error } = await supabase.from('sp_ojk_rate_sets').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.error('activateOjkRateSet:', error); return false; }
  return true;
}

export async function deleteOjkRateSet(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_ojk_rate_sets').delete().eq('id', id);
  if (error) { console.error('deleteOjkRateSet:', error); return false; }
  return true;
}

// ─── Vehicle Override CRUD ────────────────────────────────────────────────────

export async function getVehicleOverrides(): Promise<SpVehicleOverride[]> {
  const { data, error } = await supabase
    .from('sp_vehicle_overrides')
    .select('*')
    .order('brand')
    .order('model');
  if (error) { console.error('getVehicleOverrides:', error); return []; }
  return (data ?? []) as SpVehicleOverride[];
}

export async function upsertVehicleOverride(payload: Omit<SpVehicleOverride, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_vehicle_overrides')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'brand,model' });
  if (error) { console.error('upsertVehicleOverride:', error); return false; }
  return true;
}

export async function getVehicleMarketValue(brand: string, model: string, year: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('sp_vehicle_overrides')
    .select('market_value_rp, list_price_m, ref_year, discount_rate, is_active')
    .ilike('brand', brand)
    .ilike('model', model)
    .eq('is_active', true)
    .order('ref_year', { ascending: false })
    .limit(5);
  if (error || !data || data.length === 0) return null;
  const closest = (data as SpVehicleOverride[]).reduce((best, row) => {
    return Math.abs(row.ref_year - year) < Math.abs(best.ref_year - year) ? row : best;
  }, data[0] as SpVehicleOverride);
  if (closest.market_value_rp && closest.market_value_rp > 0) return closest.market_value_rp;
  if (closest.list_price_m && closest.list_price_m > 0) {
    const yearDiff = Math.max(0, new Date().getFullYear() - year);
    const dep = closest.discount_rate > 0 ? closest.discount_rate : 0.15;
    return Math.round(closest.list_price_m * 1_000_000 * Math.pow(1 - dep, yearDiff));
  }
  return null;
}

// ─── Review Tokens ────────────────────────────────────────────────────────────

export interface SpReviewToken {
  id: string;
  token: string;
  order_id: string;
  created_by?: string;
  expires_at: string;
  accessed_count: number;
  last_accessed_at?: string;
  insurer_action?: 'APPROVED' | 'REJECTED';
  insurer_notes?: string;
  actioned_at?: string;
  created_at: string;
}

export async function createReviewToken(orderId: string, createdBy?: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sp_review_tokens')
    .insert({
      order_id: orderId,
      created_by: createdBy ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('token')
    .single();
  if (error) { console.error('createReviewToken:', error); return null; }
  return (data as any).token as string;
}

export async function getOrderByToken(
  token: string
): Promise<{ order: SpPolicyOrder; tokenRecord: SpReviewToken } | null> {
  const { data: tokenData, error: tokenError } = await supabase
    .from('sp_review_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (tokenError || !tokenData) return null;
  const tr = tokenData as SpReviewToken;
  if (new Date(tr.expires_at) < new Date()) return null;

  const { data: orderData, error: orderError } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .eq('id', tr.order_id)
    .maybeSingle();
  if (orderError || !orderData) return null;

  supabase
    .from('sp_review_tokens')
    .update({ accessed_count: tr.accessed_count + 1, last_accessed_at: new Date().toISOString() })
    .eq('id', tr.id)
    .then(() => {});

  return { order: orderData as SpPolicyOrder, tokenRecord: tr };
}

export async function submitInsurerReview(
  tokenId: string,
  orderId: string,
  action: 'APPROVED' | 'REJECTED',
  notes: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const [tokenRes, orderRes] = await Promise.all([
    supabase.from('sp_review_tokens').update({
      insurer_action: action,
      insurer_notes: notes,
      actioned_at: now,
    }).eq('id', tokenId),
    supabase.from('sp_policy_orders').update({
      status: action,
      reviewer_notes: notes,
      reviewed_at: now,
      updated_at: now,
    }).eq('id', orderId),
  ]);
  if (tokenRes.error) { console.error('submitInsurerReview (token):', tokenRes.error); return false; }
  if (orderRes.error) { console.error('submitInsurerReview (order):', orderRes.error); return false; }

  // Fetch order details to notify agent and admin
  const { data: order } = await supabase
    .from('sp_policy_orders')
    .select('agent_id, order_number, client_name')
    .eq('id', orderId)
    .maybeSingle();

  const label = action === 'APPROVED' ? 'Disetujui' : 'Ditolak';
  const orderRef = order?.order_number ?? orderId;
  const clientName = order?.client_name ?? 'Nasabah';

  if (order?.agent_id) {
    await supabase.from('sp_notifications').insert({
      agent_id: order.agent_id,
      type: `POLICY_${action}`,
      title: `Polis ${label}: ${orderRef}`,
      body: `Pengajuan polis ${clientName} (${orderRef}) telah ${label.toLowerCase()} oleh penanggung.${notes ? ` Catatan: ${notes}` : ''}`,
      order_id: orderId,
      read: false,
    });
  }

  await supabase.from('sp_admin_notifications').insert({
    type: `POLICY_${action}`,
    title: `Polis ${label}: ${orderRef}`,
    body: `Penanggung telah ${label.toLowerCase()} pengajuan polis ${clientName} (${orderRef}).${notes ? ` Catatan: ${notes}` : ''}`,
    order_id: orderId,
    read: false,
  });

  return true;
}

// ─── Admin Notifications ──────────────────────────────────────────────────────

export interface SpAdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  order_id?: string;
  review_url?: string;
  metadata?: any;
  read: boolean;
  created_at: string;
}

export async function createAdminNotification(data: Omit<SpAdminNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  await callGateway('admin_create_notification', data).catch(() => {});
}

export async function getAdminNotifications(unreadOnly = false): Promise<SpAdminNotification[]> {
  const { data, error } = await callGateway('admin_list_notifications', { unread_only: unreadOnly, limit: 50 });
  if (error) { console.error('getAdminNotifications:', error); return []; }
  return (data ?? []) as SpAdminNotification[];
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await callGateway('admin_mark_notification_read', { notification_id: id }).catch(() => {});
}

// ─── Auto-send review link on order submission ────────────────────────────────

export async function autoSendReviewLink(
  orderId: string,
  orderNumber: string,
  clientName: string,
  insurerWa?: string,
  insurerEmail?: string
): Promise<string | null> {
  const token = await createReviewToken(orderId);
  if (!token) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://surepath.app';
  const reviewUrl = `${origin}/review/${token}`;

  // Update token with the review URL
  await supabase.from('sp_review_tokens').update({ review_url: reviewUrl }).eq('token', token);

  // Send email to insurer admin if email is configured
  try {
    if (insurerEmail) {
      // Create a dashboard auth token for the insurer
      const { data: insurerRow } = await supabase
        .from('sp_policy_orders')
        .select('insurer_id, insurer_name')
        .eq('id', orderId)
        .maybeSingle();

      let dashboardUrl = reviewUrl; // fallback
      if (insurerRow?.insurer_id) {
        const dashToken = await createInsurerAuthToken(insurerRow.insurer_id, insurerEmail);
        if (dashToken) {
          const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://surepath.app';
          dashboardUrl = `${appOrigin}/insurer-portal?token=${dashToken}`;
        }
      }

      const { data: orderRow } = await supabase
        .from('sp_policy_orders')
        .select('order_number, client_name, product_name, total_premium, insurer_name')
        .eq('id', orderId)
        .maybeSingle();

      await supabase.functions.invoke('send-insurer-email', {
        body: {
          to: insurerEmail,
          order_number: orderRow?.order_number ?? orderId,
          client_name: orderRow?.client_name ?? clientName,
          product_name: orderRow?.product_name ?? 'Asuransi',
          total_premium: orderRow?.total_premium ?? 0,
          insurer_name: orderRow?.insurer_name ?? 'Penanggung',
          review_url: reviewUrl,
          dashboard_url: dashboardUrl,
        },
      });
    }
  } catch (emailErr) {
    console.warn('autoSendReviewLink: email send failed (non-fatal):', emailErr);
  }

  // Create admin notification with the link
  await createAdminNotification({
    type: 'NEW_ORDER',
    title: `Order Baru: ${orderNumber}`,
    body: `Order dari ${clientName} siap ditinjau. Salin link dan kirimkan ke penanggung.`,
    order_id: orderId,
    review_url: reviewUrl,
    metadata: { insurer_wa: insurerWa ?? null },
  });

  return reviewUrl;
}

// ─── AI Policy Review ─────────────────────────────────────────────────────────

export interface AIPolicyReview {
  recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  flags: string[];
  suggested_notes: string;
  order_id?: string;
}

export async function runAIPolicyReview(orderId: string): Promise<AIPolicyReview | null> {
  const { data: order, error } = await supabase.from('sp_policy_orders').select('*').eq('id', orderId).single();
  if (error || !order) return null;

  const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-policy-review', {
    body: { order_id: orderId, order },
  });
  if (fnError) { console.error('runAIPolicyReview:', fnError); return null; }
  return fnData as AIPolicyReview;
}

// ─── AI Finance Review ────────────────────────────────────────────────────────

export interface AIFinanceReview {
  health_score: number;
  summary: {
    total_gwp: number;
    total_commissions: number;
    total_claims: number;
    commission_ratio: number;
    claim_ratio: number;
    net_revenue: number;
  };
  anomalies: Array<{ severity: string; description: string; amount: number | null }>;
  recommendations: Array<{ priority: string; action: string; impact: string }>;
  insights: string;
  alerts: string[];
  period_days?: number;
  generated_at?: string;
  raw_metrics?: any;
}

export async function runAIFinanceReview(periodDays = 30): Promise<AIFinanceReview | null> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-finance-review', {
    body: { period_days: periodDays },
  });
  if (fnError) { console.error('runAIFinanceReview:', fnError); return null; }
  return fnData as AIFinanceReview;
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

// ─── Agent Wallet ─────────────────────────────────────────────────────────────

export interface AgentWallet {
  id: string;
  agent_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  agent_id: string;
  type: 'COMMISSION_CREDIT' | 'COIN_CREDIT' | 'WITHDRAWAL_DEBIT' | 'WITHDRAWAL_REVERSAL';
  amount: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  agent_id: string;
  amount: number;
  xendit_fee: number;
  net_amount: number;
  bank_code: string;
  account_number: string;
  account_holder_name: string;
  status: 'PENDING_L1' | 'PENDING_L2' | 'PENDING_L3' | 'APPROVED' | 'PROCESSING' | 'DISBURSED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  xendit_disbursement_id: string | null;
  l1_approved_by: string | null;
  l1_approved_at: string | null;
  l2_approved_by: string | null;
  l2_approved_at: string | null;
  l3_approved_by: string | null;
  l3_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  disbursed_at: string | null;
  scheduled_disburse_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

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
  const XENDIT_FEE = 5000;
  const net_amount = params.amount - XENDIT_FEE;
  if (net_amount <= 0) return { success: false, error: 'Jumlah terlalu kecil setelah biaya transfer' };

  // Determine required approval level
  let initial_status: string;
  if (params.amount >= 25_000_000) initial_status = 'PENDING_L3';
  else if (params.amount >= 10_000_000) initial_status = 'PENDING_L2';
  else initial_status = 'PENDING_L1';

  // Schedule 24hr delay for >25M
  const scheduled_disburse_at = params.amount >= 25_000_000
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: 'Tidak terautentikasi' };

  const { data: wd, error: wdErr } = await supabase
    .from('sp_withdrawals')
    .insert({
      ...params,
      agent_id: authUser.id,
      xendit_fee: XENDIT_FEE,
      net_amount,
      status: initial_status,
      scheduled_disburse_at,
    })
    .select('id')
    .single();

  if (wdErr || !wd) return { success: false, error: wdErr?.message ?? 'Gagal membuat penarikan' };

  // Atomically deduct wallet via RPC (SECURITY DEFINER)
  const { error: deductErr } = await supabase.rpc('request_withdrawal_deduct', {
    p_withdrawal_id: wd.id,
    p_agent_id:      authUser.id,
    p_amount:        params.amount,
  });

  if (deductErr) {
    // Rollback withdrawal insert
    await supabase.from('sp_withdrawals').update({ status: 'CANCELLED' }).eq('id', wd.id);
    return { success: false, error: deductErr.message };
  }

  return { success: true, withdrawal_id: wd.id };
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

// ─── Renewal Engine ───────────────────────────────────────────────────────────

export interface SpRenewal {
  id: string;
  original_order_id: string;
  agent_id: string;
  client_name: string;
  client_phone?: string;
  product_name: string;
  expiry_date: string;
  reminder_sent_at?: string;
  renewal_order_id?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getExpiringOrders(agentId: string, days: number): Promise<SpPolicyOrder[]> {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + days);

  const todayStr  = today.toISOString().split('T')[0];
  const futureStr = future.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'ISSUED')
    .gte('end_date', todayStr)
    .lte('end_date', futureStr)
    .order('end_date', { ascending: true });

  if (error) { console.error('getExpiringOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
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
  tier: 'STAR' | 'ELITE' | null,
  assignedBy: string,
): Promise<boolean> {
  const { error } = await callGateway('admin_update_user', {
    user_id: agentId,
    tier,
    tier_assigned_by: tier ? assignedBy : null,
    tier_assigned_at: tier ? new Date().toISOString() : null,
  });
  if (error) { console.error('updateAgentTier:', error); return false; }
  return true;
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

// ─── Endorsements ─────────────────────────────────────────────────────────────

export interface SpEndorsement {
  id: string;
  order_id: string;
  agent_id: string;
  type: 'ADDRESS' | 'PLATE' | 'SUM_INSURED' | 'ADDON' | 'DRIVER' | 'OTHER';
  description: string;
  old_value?: string;
  new_value?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  fee: number;
  created_at?: string;
}

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

// ─── B2B Submissions & Quotes ─────────────────────────────────────────────────

export interface SpB2BSubmission {
  id: string;
  client_id: string;
  product_type: 'FLEET_MV' | 'BONDING' | 'GROUP_HEALTH';
  company_name: string;
  pic_name?: string;
  pic_phone?: string;
  pic_email?: string;
  submission_data: Record<string, any>;
  status: 'SUBMITTED' | 'REVIEWING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  admin_notes?: string;
  insurer_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface SpB2BQuote {
  id: string;
  submission_id: string;
  client_id: string;
  insurer_name?: string;
  premium_amount: number;
  coverage_details: Record<string, any>;
  valid_until?: string;
  terms?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export async function getB2BSubmissions(clientId: string): Promise<SpB2BSubmission[]> {
  const { data, error } = await supabase
    .from('sp_b2b_submissions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getB2BSubmissions:', error); return []; }
  return (data ?? []) as SpB2BSubmission[];
}

export async function getAllB2BSubmissions(): Promise<SpB2BSubmission[]> {
  const { data, error } = await supabase
    .from('sp_b2b_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllB2BSubmissions:', error); return []; }
  return (data ?? []) as SpB2BSubmission[];
}

export async function updateB2BSubmissionStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<boolean> {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) payload.admin_notes = notes;
  const { error } = await supabase.from('sp_b2b_submissions').update(payload).eq('id', id);
  if (error) { console.error('updateB2BSubmissionStatus:', error); return false; }
  return true;
}

export async function getB2BQuotes(clientId: string): Promise<SpB2BQuote[]> {
  const { data, error } = await supabase
    .from('sp_b2b_quotes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getB2BQuotes:', error); return []; }
  return (data ?? []) as SpB2BQuote[];
}

export async function createB2BQuote(
  data: Omit<SpB2BQuote, 'id' | 'created_at' | 'updated_at'>,
): Promise<boolean> {
  const { error } = await supabase.from('sp_b2b_quotes').insert(data);
  if (error) { console.error('createB2BQuote:', error); return false; }
  return true;
}

// ─── Life Insurance Applications ──────────────────────────────────────────────

export interface SpLifeApplication {
  id: string;
  order_number: string;
  agent_id: string;
  client_name: string;
  client_dob: string;
  client_gender: 'M' | 'F';
  client_phone: string;
  client_email: string;
  smoker: boolean;
  product_code: 'TERM_LIFE' | 'WHOLE_LIFE' | 'UNIT_LINK' | 'ENDOWMENT';
  sum_assured: number;
  payment_frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  policy_term_years: number;
  riders: string[];
  health_declaration: Record<string, boolean>;
  beneficiary_name: string;
  beneficiary_relation: string;
  beneficiary_percentage: number;
  indicative_premium: number;
  status: string;
  policy_number?: string;
  insurer_notes?: string;
  created_at: string;
  updated_at: string;
}

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
  const { error } = await supabase.from('sp_life_applications').update(payload).eq('id', id);
  if (error) { console.error('updateLifeApplicationStatus:', error); return false; }
  return true;
}

export async function createB2BSubmission(
  data: Omit<SpB2BSubmission, 'id' | 'created_at' | 'updated_at'>
): Promise<SpB2BSubmission | null> {
  const { data: row, error } = await supabase
    .from('sp_b2b_submissions')
    .insert({ ...data, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error('createB2BSubmission:', error); return null; }
  return row;
}

export async function updateB2BQuoteStatus(
  quoteId: string,
  status: 'ACCEPTED' | 'REJECTED'
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_b2b_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (error) { console.error('updateB2BQuoteStatus:', error); return false; }
  return true;
}

export async function uploadB2BDocument(
  submissionId: string,
  clientId: string,
  file: File,
  docType: string
): Promise<string | null> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${clientId}/${submissionId}/${docType}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('b2b-documents')
    .upload(path, file, { upsert: true });
  if (upErr) { console.error('uploadB2BDocument storage:', upErr); return null; }

  const { error: dbErr } = await supabase.from('sp_b2b_documents').insert({
    submission_id: submissionId,
    doc_type:      docType,
    file_name:     file.name,
    file_path:     path,
    file_size:     file.size,
    mime_type:     file.type,
  });
  if (dbErr) console.warn('sp_b2b_documents insert:', dbErr);

  return path;
}

export async function getB2BProfile(clientId: string): Promise<SpUser | null> {
  return getAgentProfile(clientId);
}

export async function updateB2BProfile(
  clientId: string,
  data: Partial<SpUser>
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_users')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', clientId);
  if (error) { console.error('updateB2BProfile:', error); return false; }
  return true;
}

// ─── Tier Config (DB-driven rates) ───────────────────────────────────────────

export interface SpTierConfig {
  tier: 'STANDARD' | 'STAR' | 'ELITE';
  coin_bonus_rate: number;
  l1_override_rate: number;
  l2_override_rate: number;
  updated_by?: string | null;
  updated_at?: string;
}

export async function getTierConfig(): Promise<SpTierConfig[]> {
  const { data, error } = await supabase
    .from('sp_tier_config')
    .select('*')
    .order('tier', { ascending: true });
  if (error) { console.error('getTierConfig:', error); return []; }
  return (data ?? []) as SpTierConfig[];
}

export async function updateTierConfig(
  tier: 'STANDARD' | 'STAR' | 'ELITE',
  rates: Pick<SpTierConfig, 'coin_bonus_rate' | 'l1_override_rate' | 'l2_override_rate'>,
  updatedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_tier_config')
    .update({ ...rates, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('tier', tier);
  if (error) { console.error('updateTierConfig:', error); return false; }
  return true;
}

// ─── Promo Codes ─────────────────────────────────────────────────────────────

export interface SpPromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  applicable_products: string[];
  valid_from: string;
  valid_to: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getPromoCodes(): Promise<SpPromoCode[]> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getPromoCodes:', error); return []; }
  return (data ?? []) as SpPromoCode[];
}

export async function createPromoCode(
  payload: Omit<SpPromoCode, 'id' | 'used_count' | 'created_at' | 'updated_at'>,
): Promise<SpPromoCode | null> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .insert({ ...payload, used_count: 0 })
    .select()
    .single();
  if (error) { console.error('createPromoCode:', error); return null; }
  return data as SpPromoCode;
}

export async function updatePromoCode(id: string, updates: Partial<SpPromoCode>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_promo_codes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updatePromoCode:', error); return false; }
  return true;
}

export async function validatePromoCode(
  code: string,
  productType: string,
): Promise<{ valid: boolean; promo?: SpPromoCode; message?: string }> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (error || !data) return { valid: false, message: 'Kode promo tidak ditemukan.' };
  const p = data as SpPromoCode;
  const now = new Date().toISOString();
  if (now < p.valid_from) return { valid: false, message: 'Kode promo belum aktif.' };
  if (now > p.valid_to)   return { valid: false, message: 'Kode promo sudah kadaluarsa.' };
  if (p.used_count >= p.usage_limit) return { valid: false, message: 'Kuota kode promo habis.' };
  if (!p.applicable_products.includes('ALL') && !p.applicable_products.includes(productType)) {
    return { valid: false, message: 'Kode promo tidak berlaku untuk produk ini.' };
  }
  return { valid: true, promo: p };
}

// ─── Terms & Conditions ───────────────────────────────────────────────────────

import { TNC_VERSION, buildTncText } from '../src/tnc-content';

function generateTncRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SP-TNC-${date}-${rand}`;
}

export async function recordTcAcceptance(userId: string): Promise<string> {
  const refNumber = generateTncRef();
  const now = new Date().toISOString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  await Promise.all([
    supabase.from('sp_tnc_records').insert({
      user_id: userId,
      reference_number: refNumber,
      tnc_version: TNC_VERSION,
      tnc_content: buildTncText(),
      accepted_at: now,
      user_agent: userAgent,
    }),
    supabase.from('sp_users').update({
      tc_accepted: true,
      tc_accepted_at: now,
      tnc_ref_number: refNumber,
    }).eq('id', userId),
  ]);

  return refNumber;
}

export async function getUserTcStatus(userId: string): Promise<boolean> {
  // Primary: sp_users flag
  const { data } = await supabase.from('sp_users').select('tc_accepted').eq('id', userId).single();
  if (data?.tc_accepted === true) return true;
  // Fallback: a row in sp_tnc_records means they accepted even if sp_users update
  // failed silently due to RLS (common when policies restrict self-UPDATE).
  const { data: rec } = await supabase
    .from('sp_tnc_records')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return !!rec;
}

export interface TncRecord {
  reference_number: string;
  tnc_version: string;
  accepted_at: string;
}

export async function getTncRecord(userId: string): Promise<TncRecord | null> {
  const { data } = await supabase
    .from('sp_tnc_records')
    .select('reference_number, tnc_version, accepted_at')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

// ─── Online Users / Heartbeat (Task 2) ───────────────────────────────────────

export async function recordUserHeartbeat(userId: string, role: string): Promise<void> {
  await supabase.from('sp_user_sessions').upsert(
    { user_id: userId, role, last_seen: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

export interface OnlineUsersResult {
  total: number;
  byRole: Record<string, number>;
}

export async function getOnlineUsers(): Promise<OnlineUsersResult> {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sp_user_sessions')
    .select('role')
    .gte('last_seen', since);
  if (error || !data) return { total: 0, byRole: {} };
  const byRole: Record<string, number> = {};
  for (const row of data as { role: string }[]) {
    byRole[row.role] = (byRole[row.role] ?? 0) + 1;
  }
  return { total: data.length, byRole };
}

// ─── Security real data (Task 3) ─────────────────────────────────────────────

export interface SecurityStats {
  failedLogins24h: number;
  activeSessionsCount: number;
  lastLoginAt: string | null;
  blockedEntries: Array<{ email: string; attempts: number; until: number }>;
}

export function getFailedLoginAttempts(): number {
  let total = 0;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('sp_rate_limit_')) continue;
    try {
      const val = JSON.parse(localStorage.getItem(key) ?? '{}');
      if (val.resetAt && val.resetAt > cutoff) total += val.count ?? 0;
    } catch { /* ignore */ }
  }
  return total;
}

export function getRateLimitBlocks(): Array<{ email: string; attempts: number; until: number }> {
  const entries: Array<{ email: string; attempts: number; until: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('sp_rate_limit_')) continue;
    try {
      const val = JSON.parse(localStorage.getItem(key) ?? '{}');
      const email = key.replace('sp_rate_limit_', '');
      entries.push({ email, attempts: val.count ?? 0, until: val.resetAt ?? 0 });
    } catch { /* ignore */ }
  }
  return entries.sort((a, b) => b.attempts - a.attempts);
}

export async function getSecurityStats(): Promise<SecurityStats> {
  const { data } = await callGateway('admin_security_stats', {});
  const d = (data as any) ?? {};
  return {
    failedLogins24h: getFailedLoginAttempts(),
    activeSessionsCount: d.activeSessionsCount ?? 0,
    lastLoginAt: d.lastLoginAt ?? null,
    blockedEntries: getRateLimitBlocks(),
  };
}

export async function getSessionActivityByHour(): Promise<Array<{ hour: number; count: number }>> {
  const { data } = await callGateway('admin_security_stats', {});
  const rows: Array<{ last_seen: string }> = (data as any)?.sessionsByHour ?? [];
  const buckets: Record<number, number> = {};
  for (const row of rows) {
    const h = new Date(row.last_seen).getHours();
    buckets[h] = (buckets[h] ?? 0) + 1;
  }
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: buckets[h] ?? 0 }));
}

// ─── Page views / traffic (Task 4) ───────────────────────────────────────────

export async function recordPageView(page: string): Promise<void> {
  await supabase.from('sp_page_views').insert({
    page,
    ts: new Date().toISOString(),
    user_agent: navigator.userAgent.slice(0, 200),
  });
}

export interface TrafficStats {
  daily: Array<{ date: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
}

// ─── Agent Avatar & KTP Upload ────────────────────────────────────────────────

export async function uploadAgentAvatar(agentId: string, base64: string): Promise<string | null> {
  const parts = base64.split(',');
  const byteStr = atob(parts[1] ?? parts[0]);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/jpeg' });
  const path = `${agentId}/avatar.jpg`;
  const { error } = await supabase.storage.from('agent-profiles').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) { console.error('uploadAgentAvatar:', error); return null; }
  const { data } = supabase.storage.from('agent-profiles').getPublicUrl(path);
  await callGateway('update_my_profile', { profile_photo_url: data.publicUrl }).catch(() => {});
  return data.publicUrl;
}

export async function uploadAgentKtp(agentId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${agentId}/ktp.${ext}`;
  const { error } = await supabase.storage.from('agent-docs').upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadAgentKtp:', error); return null; }
  const { data } = supabase.storage.from('agent-docs').getPublicUrl(path);
  await callGateway('update_my_profile', { ktp_document_url: data.publicUrl }).catch(() => {});
  return data.publicUrl;
}

export async function getTrafficStats(): Promise<TrafficStats> {
  const { data, error } = await callGateway('admin_traffic_stats', {});
  if (error || !data) return { daily: [], topPages: [] };
  const rows = (data as any[]);
  const dailyMap: Record<string, number> = {};
  const pageMap: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of rows) {
    const date = (row.ts as string).slice(0, 10);
    if (date in dailyMap) dailyMap[date]++;
    pageMap[row.page] = (pageMap[row.page] ?? 0) + 1;
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
  const topPages = Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count }));
  return { daily, topPages };
}

// ─── Data Gateway Client ─────────────────────────────────────────────────────
// Calls the data-gateway edge function with the current Supabase Auth session JWT.
// All sensitive table reads/writes should go through here instead of direct DB calls.

export async function callGateway(
  action: string,
  params?: Record<string, unknown>,
): Promise<{ data?: any; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'Not authenticated' };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/data-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, params }),
    });
    return res.json();
  } catch (e) {
    return { error: String((e as Error)?.message ?? e) };
  }
}

// ─── Pathy AI Chat ───────────────────────────────────────────────────────────

export async function pathyChat(message: string): Promise<string> {
  const { data, error } = await callGateway('pathy_chat', { message });
  if (error) throw new Error(error);
  return (data as { reply: string }).reply;
}

// ─── Website CMS Config (sp_website_config) ──────────────────────────────────

export interface SpWebsiteConfig {
  id?: number;
  section_key: string;
  headline?: string | null;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_secondary_text?: string | null;
  bg_type: 'animated-mesh' | 'gradient' | 'solid' | 'image' | 'none';
  bg_value?: string | null;
  is_visible: boolean;
  extra_json?: Record<string, any>;
  updated_at?: string;
  created_at?: string;
}

export async function fetchWebsiteSection(sectionKey: string): Promise<SpWebsiteConfig | null> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .select('*')
    .eq('section_key', sectionKey)
    .single();
  if (error) return null;
  return data as SpWebsiteConfig;
}

export async function fetchAllWebsiteSections(): Promise<SpWebsiteConfig[]> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .select('*')
    .order('section_key');
  if (error) return [];
  return (data ?? []) as SpWebsiteConfig[];
}

export async function upsertWebsiteSection(payload: Partial<SpWebsiteConfig> & { section_key: string }): Promise<SpWebsiteConfig | null> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'section_key' })
    .select()
    .single();
  if (error) { console.error('upsertWebsiteSection:', error); return null; }
  return data as SpWebsiteConfig;
}

export async function resetWebsiteSection(sectionKey: string): Promise<void> {
  await supabase
    .from('sp_website_config')
    .update({ headline: null, subtitle: null, cta_text: null, cta_secondary_text: null, bg_type: 'none', bg_value: null, is_visible: true, extra_json: {}, updated_at: new Date().toISOString() })
    .eq('section_key', sectionKey);
}

// ─── Agent Legal Agreement (sp_agent_agreements) ────────────────────────────
export const AGREEMENT_DOC_VERSION = 'v1.0-2026';

export interface SpAgentAgreement {
  id: string;
  agent_id: string;
  agreement_no: string;
  doc_version: string;
  full_name: string;
  ktp_number: string;
  accepted_at: string;
  user_agent?: string | null;
  created_at?: string;
}

// Returns the current agent's signed agreement for the active doc version, or null.
export async function getMyAgreement(): Promise<SpAgentAgreement | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('sp_agent_agreements')
    .select('*')
    .eq('agent_id', user.id)
    .eq('doc_version', AGREEMENT_DOC_VERSION)
    .maybeSingle();
  if (error) { console.error('getMyAgreement:', error); return null; }
  return (data as SpAgentAgreement) ?? null;
}

// Records the agent's acceptance. Server enforces agent_id = auth.uid() via RLS.
//
// Returns { rec, error } so callers can show a more specific message to the
// agent when the insert fails (e.g. unique violation = "already accepted",
// schema error = "table missing — run migrations", RLS denial = "auth issue").
// The UI still falls back to a generic message; this just makes the actual
// Postgres error code reachable for debugging.
export interface AcceptAgreementResult {
  rec: SpAgentAgreement | null;
  error: { code: string; message: string } | null;
}

export async function acceptAgreement(
  fullName: string,
  ktpNumber: string,
): Promise<AcceptAgreementResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { rec: null, error: { code: 'NO_USER', message: 'Not authenticated' } };
  }
  const { data, error } = await supabase
    .from('sp_agent_agreements')
    .insert({
      agent_id: user.id,
      doc_version: AGREEMENT_DOC_VERSION,
      full_name: fullName.trim(),
      ktp_number: ktpNumber.trim(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 255) : null,
    })
    .select()
    .single();
  if (error) {
    console.error('acceptAgreement:', error);
    return { rec: null, error: { code: error.code ?? 'UNKNOWN', message: error.message } };
  }
  return { rec: data as SpAgentAgreement, error: null };
}

// Admin/CMS: list all signed agreements with agent contact info for audit.
export async function getAllAgreements(): Promise<Array<SpAgentAgreement & { agent_email?: string; agent_phone?: string }>> {
  const { data, error } = await supabase
    .from('sp_agent_agreements')
    .select('*, sp_users(email, phone)')
    .order('accepted_at', { ascending: false });
  if (error) { console.error('getAllAgreements:', error); return []; }
  return (data ?? []).map((r: any) => ({
    ...r,
    agent_email: r.sp_users?.email,
    agent_phone: r.sp_users?.phone,
  }));
}
