// Client (sp_clients) CRUD operations.

import { supabase } from './db';
import type { SpClient } from './dbTypes';

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
