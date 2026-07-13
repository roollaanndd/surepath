// Commissions, quotes, leaderboard, agent stats and demo data seeding.

import { supabase, callGateway } from './db';
import type { SpCommission, SpQuote, AgentStats } from './dbTypes';

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
  // FIX: previously used supabase (user-JWT) client which fails RLS when admin credits
  // commission to an agent (RLS requires auth.uid() = agent_id).
  // Now routes through gateway admin_create_commission (service_role bypasses RLS).
  const { data: result, error } = await callGateway('admin_create_commission', {
    agent_id:         data.agent_id,
    client_name:      (data as any).client_name,
    client_id:        (data as any).client_id,
    policy_id:        (data as any).policy_id,
    order_id:         (data as any).order_id,
    product_type:     data.product_type,
    premium_amount:   data.premium_amount,
    commission_amount:data.commission_amount,
    commission_rate:  (data as any).commission_rate,
    status:           data.status,
  });
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

export async function getLeaderboard(): Promise<Array<{ agent_id: string; agent_name: string; agent_code: string; tier: string | null; total_commission: number }>> {
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

  // Demo data insert — low priority for gateway migration (seed function only)
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
