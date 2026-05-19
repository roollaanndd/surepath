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
  client_name: string;
  product_type: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR';
  premium_amount: number;
  commission_amount: number;
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
  if (error) {
    console.error('getAgentProfile error:', error);
    return null;
  }
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
