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

export async function getCustomerClaims(_userId: string): Promise<SpClaim[]> {
  // Routed through the gateway, which scopes results to the authenticated
  // caller's own claims (user_id = caller). The param is kept for signature
  // stability but the server derives ownership; it is not trusted.
  const { data, error } = await callGateway('get_my_claims');
  if (error) { console.error('getCustomerClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}
