// Claims (sp_claims) — agent submission, admin review, customer-scoped reads.

import { supabase, callGateway } from './db';
import type { SpClaim } from './dbTypes';

// ─── Claims ───────────────────────────────────────────────────────────────────

export async function getAgentClaims(agentId: string): Promise<SpClaim[]> {
  const { data, error } = await supabase
    .from('sp_claims')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAgentClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}

export async function submitClaim(claimData: Omit<SpClaim, 'id' | 'created_at' | 'claim_number'>): Promise<SpClaim | null> {
  // Routed through the gateway (service_role bypasses RLS on sp_claims)
  const { data, error } = await callGateway('submit_claim', {
    claim_type: (claimData as any).claim_type,
    description: (claimData as any).description,
    location: (claimData as any).location,
    amount_estimated: (claimData as any).amount_estimated,
  });
  if (error) { console.error('submitClaim:', error); return null; }
  return data as SpClaim;
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

export async function getCustomerClaims(_userId: string): Promise<SpClaim[]> {
  const { data, error } = await callGateway('get_my_claims');
  if (error) { console.error('getCustomerClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}
