import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uyjgeteelnswphyzkjwi.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5amdldGVlbG5zd3BoeXprandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzEzNzUsImV4cCI6MjA5NDc0NzM3NX0.igFT0ExEh-RDn_eMvBi0HzAhCWD1G7jYVRFNOL4TFSU';

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
  type: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR';
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
  product_type: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR';
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
  product_type: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR';
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
  const { data, error } = await supabase
    .from('sp_users')
    .select('*')
    .eq('id', agentId)
    .single();
  if (error) return null;
  return data as SpUser;
}

export async function getAgentByEmail(email: string): Promise<SpUser | null> {
  const { data, error } = await supabase
    .from('sp_users')
    .select('*')
    .eq('email', email)
    .eq('role', 'AGENT')
    .single();
  if (error) return null;
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
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('sp_commissions')
    .select('agent_id, commission_amount')
    .eq('status', 'PAID')
    .gte('created_at', startOfMonth);

  if (error) {
    console.error('getLeaderboard error:', error);
    return [];
  }

  // Aggregate by agent_id
  const map: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    map[row.agent_id] = (map[row.agent_id] ?? 0) + (row.commission_amount ?? 0);
  });

  // Fetch agent names
  const agentIds = Object.keys(map);
  if (agentIds.length === 0) return [];

  const { data: users } = await supabase
    .from('sp_users')
    .select('id, name, agent_code')
    .in('id', agentIds);

  const userMap: Record<string, { name: string; agent_code: string }> = {};
  (users ?? []).forEach((u: any) => {
    userMap[u.id] = { name: u.name, agent_code: u.agent_code ?? '' };
  });

  return agentIds
    .map((id) => ({
      agent_id: id,
      agent_name: userMap[id]?.name ?? 'Agent',
      agent_code: userMap[id]?.agent_code ?? '',
      total_commission: map[id],
    }))
    .sort((a, b) => b.total_commission - a.total_commission)
    .slice(0, 10);
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

  let clientMap: Record<string, string> = {};

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
  const payload: any = { status };
  if (admin_notes !== undefined) payload.admin_notes = admin_notes;
  const { error } = await supabase.from('sp_claims').update(payload).eq('id', id);
  if (error) { console.error('updateClaimStatus:', error); return false; }
  return true;
}

export async function getAllClaims(): Promise<SpClaim[]> {
  const { data, error } = await supabase
    .from('sp_claims')
    .select('*')
    .order('created_at', { ascending: false });
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

// ─── Admin: Agent Management ──────────────────────────────────────────────────

export async function getAllAgents(): Promise<SpUser[]> {
  const { data, error } = await supabase
    .from('sp_users')
    .select('*')
    .eq('role', 'AGENT')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllAgents:', error); return []; }
  return (data ?? []) as SpUser[];
}

export async function updateAgentVerification(agentId: string, verified: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('sp_users')
    .update({ verified, updated_at: new Date().toISOString() })
    .eq('id', agentId);
  if (error) { console.error('updateAgentVerification:', error); return false; }
  return true;
}

export async function updateAgentCommissionRate(agentId: string, rate: number): Promise<boolean> {
  const { error } = await supabase
    .from('sp_users')
    .update({ commission_rate: rate, updated_at: new Date().toISOString() })
    .eq('id', agentId);
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
  const agentCode =
    'SP-AGT-' + String(Math.floor(1000 + Math.random() * 9000));

  const payload = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    ktp: data.ktp ?? null,
    address: data.address ?? null,
    role: 'AGENT',
    agent_code: agentCode,
    commission_rate: 0.1,
    monthly_target: 50000000,
    trust_score: 80,
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
  coverage_type: 'COMPREHENSIVE' | 'TLO';
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
  net_premium?: number;
  commission_rate?: number;
  commission_amount?: number;
  coin_reward?: number;
  start_date?: string;
  end_date?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ISSUED' | 'REJECTED';
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
  const { data: result, error } = await supabase
    .from('sp_policy_orders')
    .insert(data)
    .select()
    .single();
  if (error) { console.error('createPolicyOrder:', error); return null; }
  return result as SpPolicyOrder;
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

export async function getAllOrders(): Promise<SpPolicyOrder[]> {
  const { data, error } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

export async function updateOrderStatus(
  id: string,
  status: SpPolicyOrder['status'],
  extras?: { reviewer_notes?: string; policy_number?: string; policy_document_url?: string; sp_policy_id?: string }
): Promise<boolean> {
  const payload: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'UNDER_REVIEW' || status === 'APPROVED' || status === 'REJECTED') {
    payload.reviewed_at = new Date().toISOString();
  }
  if (status === 'ISSUED') {
    payload.issued_at = new Date().toISOString();
  }
  if (extras) Object.assign(payload, extras);

  const { error } = await supabase.from('sp_policy_orders').update(payload).eq('id', id);
  if (error) { console.error('updateOrderStatus:', error); return false; }
  return true;
}

// ─── Storage: Upload vehicle image ────────────────────────────────────────────

export async function uploadVehicleImage(file: File, orderId: string): Promise<string | null> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `${orderId}/vehicle.${ext}`;
  const { error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadVehicleImage:', error); return null; }
  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPolicyDocument(file: File, orderNumber: string): Promise<string | null> {
  const path = `${orderNumber}/policy.pdf`;
  const { error } = await supabase.storage
    .from('policy-documents')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (error) { console.error('uploadPolicyDocument:', error); return null; }
  const { data } = supabase.storage.from('policy-documents').getPublicUrl(path);
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
  await supabase.from('sp_coin_ledger').insert({
    agent_id: agentId,
    type: 'EARNED',
    coins,
    rp_value: coins * 1000,
    order_id: orderId,
    description,
  });
  // Update cached balance on sp_users
  await supabase.rpc('increment_coins_balance', { p_agent_id: agentId, p_delta: coins }).then(() => {});
}

export async function redeemCoins(
  agentId: string, coins: number, description: string
): Promise<boolean> {
  const balance = await getAgentCoinBalance(agentId);
  if (balance < coins) return false;
  const { error } = await supabase.from('sp_coin_ledger').insert({
    agent_id: agentId,
    type: 'REDEEMED',
    coins: -Math.abs(coins),
    rp_value: -(coins * 1000),
    description,
  });
  if (error) { console.error('redeemCoins:', error); return false; }
  await supabase.rpc('increment_coins_balance', { p_agent_id: agentId, p_delta: -coins }).then(() => {});
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
  const [ordersRes, paymentsRes, agentsRes, commissionsRes] = await Promise.all([
    supabase.from('sp_policy_orders').select('status, total_premium, agent_id'),
    supabase.from('sp_payments').select('status, paid_amount'),
    supabase.from('sp_users').select('id, name').eq('role', 'AGENT'),
    supabase.from('sp_commissions').select('status, commission_amount').eq('status', 'PENDING'),
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
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 5);

  const totalPremiumPaid = payments
    .filter((p: any) => p.status === 'PAID')
    .reduce((sum: number, p: any) => sum + (p.paid_amount ?? 0), 0);

  const pendingCommissions = commissions
    .reduce((sum: number, c: any) => sum + (c.commission_amount ?? 0), 0);

  return {
    totalOrders: orders.length,
    ordersByStatus,
    totalPremiumIssued,
    totalPremiumPaid,
    activeAgents: agents.length,
    pendingCommissions,
    topAgents,
  };
}

// ─── Insurer & Product Terms ──────────────────────────────────────────────────

export interface SpInsurer {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
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

export async function getAvailableInsurerProducts(
  vehicleType: string,
  coverageType: string,
  vehicleAgeYears: number,
): Promise<SpInsurerProduct[]> {
  const { data, error } = await supabase
    .from('sp_insurer_products')
    .select('*, sp_insurers!inner(name, code, is_active)')
    .eq('product_type', vehicleType)
    .eq('is_active', true)
    .or(`vehicle_coverage.eq.${coverageType},vehicle_coverage.eq.ALL`);
  if (error) { console.error('getAvailableInsurerProducts:', error); return []; }
  return (data ?? [])
    .filter((r: any) => r.sp_insurers?.is_active)
    .filter((r: any) => !r.max_vehicle_age_years || vehicleAgeYears <= r.max_vehicle_age_years)
    .map((r: any) => ({
      ...r,
      insurer_name: r.sp_insurers?.name,
      insurer_code: r.sp_insurers?.code,
    })) as SpInsurerProduct[];
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
