// marketing.ts — CRM & KPI marketing/sales (Fase 1).
//
// Semua lewat data-gateway: tabel sp_marketing_activities dan
// sp_agent_handler_history deny-all RLS, jadi browser tidak pernah
// menyentuhnya langsung. Otorisasi subtree ada di sisi server
// (data-gateway/actions/marketing.ts), bukan di sini — UI tidak boleh jadi
// satu-satunya yang membatasi apa yang terlihat.
import { callGateway } from './db';

export type PipelineStage = 'DAFTAR' | 'DOKUMEN' | 'TERVERIFIKASI' | 'PRODUKTIF';
export type ActivityKind = 'CALL' | 'WA' | 'VISIT' | 'TRAINING' | 'OTHER';

export interface MarketingAgentRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  agent_code: string | null;
  tier: string | null;
  verified: boolean | null;
  identity_status: string | null;
  created_at: string | null;
  handler_id: string | null;
  handler_assigned_at: string | null;
  stage: PipelineStage;
  pernah_produksi: boolean;
  hari_sejak_order_terakhir: number | null;
  hari_sejak_aktivitas: number | null;
  umur_hari: number | null;
}

export interface MarketingActivity {
  id: string;
  marketing_id: string;
  agent_id: string | null;
  prospect_name: string | null;
  kind: ActivityKind;
  outcome: string | null;
  note: string | null;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
}

export interface MarketingSummary {
  pipeline: Record<PipelineStage, { jumlah: number; mandek_14h: number }>;
  total_agen: number;
  belum_pernah_produksi: number;
  follow_up_telat: number;
  agen_tanpa_handler: number;
  catatan_produksi: string;
}

export async function fetchMarketingSummary(): Promise<MarketingSummary | null> {
  const { data } = await callGateway('marketing_dashboard_summary');
  return data ?? null;
}

export async function fetchMarketingAgents(handlerId?: string): Promise<MarketingAgentRow[]> {
  const { data } = await callGateway('marketing_list_agents', handlerId ? { handler_id: handlerId } : undefined);
  return Array.isArray(data) ? data : [];
}

export async function fetchMarketingAgentDetail(agentId: string) {
  const { data, error } = await callGateway('marketing_agent_detail', { agent_id: agentId });
  if (error) throw new Error(error);
  return data;
}

export async function fetchMarketingActivities(opts: { agentId?: string; hanyaTelat?: boolean } = {}): Promise<MarketingActivity[]> {
  const { data } = await callGateway('marketing_list_activities', {
    agent_id: opts.agentId,
    hanya_telat: opts.hanyaTelat === true,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchUnassignedAgents(): Promise<MarketingAgentRow[]> {
  const { data } = await callGateway('marketing_list_unassigned');
  return Array.isArray(data) ? data : [];
}

export async function logMarketingActivity(input: {
  kind: ActivityKind;
  agentId?: string;
  prospectName?: string;
  outcome?: string;
  note?: string;
  nextAction?: string;
  nextActionAt?: string;
}): Promise<MarketingActivity> {
  const { data, error } = await callGateway('marketing_log_activity', {
    kind: input.kind,
    agent_id: input.agentId,
    prospect_name: input.prospectName,
    outcome: input.outcome,
    note: input.note,
    next_action: input.nextAction,
    next_action_at: input.nextActionAt,
  });
  if (error) throw new Error(error);
  return data;
}

/** CMS/admin: tugaskan atau lepas handler seorang agen. */
export async function assignAgentHandler(agentId: string, handlerId: string | null) {
  const { data, error } = await callGateway('marketing_assign_agent', { agent_id: agentId, handler_id: handlerId });
  if (error) throw new Error(error);
  return data;
}

export async function fetchMarketingOverview() {
  const { data } = await callGateway('admin_marketing_overview');
  return Array.isArray(data) ? data : [];
}

/**
 * Pendamping marketing seorang agen, dibaca dari apps agen.
 * Hanya kontak publik; agen tidak bisa mengubah handler-nya sendiri.
 */
export interface AgentHandler {
  id: string;
  name: string | null;
  phone: string | null;
  profile_photo_url: string | null;
}

export async function fetchMyHandler(): Promise<AgentHandler | null> {
  const { data } = await callGateway('get_my_handler');
  return data ?? null;
}
