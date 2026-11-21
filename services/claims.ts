// Claims (sp_claims) — agent submission, admin review, customer-scoped reads.

import { supabase, callGateway } from './db';
import type { SpClaim, ClaimPhotoForensicReport } from './dbTypes';

// ─── Claims ───────────────────────────────────────────────────────────────────

export interface ClaimPhotoAnalysisResult {
  success: boolean;
  error?: string;
  analysisId?: string;
  photoReports?: ClaimPhotoForensicReport[];
  aggregate?: {
    fraudScore: number;
    fraudVerdict: 'CLEAN' | 'REVIEW_REQUIRED' | 'REJECTED';
    severity: 'Ringan' | 'Sedang' | 'Berat' | 'Total Loss';
    totalEstimasi: number;
    rincianPart: { part: string; condition: string; action: 'Perbaiki' | 'Ganti'; estimasiBiaya: number }[];
    aiInsight: string;
    flagSummary: string[];
  };
}

// Runs the merged damage + fraud-forensics analysis on already-uploaded
// claim photos (see supabase/functions/analyze-claim-photos). Returns an
// analysisId that must be passed to submitClaim — the gateway looks up the
// server-computed results by that id rather than trusting anything echoed
// back directly, since this is a fraud-detection feature and the fraudster
// is exactly who'd otherwise spoof a "CLEAN" result.
export async function analyzeClaimPhotos(photoUrls: string[]): Promise<ClaimPhotoAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-claim-photos', {
      body: { photo_urls: photoUrls },
    });
    if (error) {
      console.error('analyzeClaimPhotos:', error);
      return { success: false, error: error.message ?? 'Gagal menganalisa foto.' };
    }
    return data as ClaimPhotoAnalysisResult;
  } catch (e: any) {
    console.error('analyzeClaimPhotos threw:', e);
    return { success: false, error: e?.message ?? 'Gagal menganalisa foto.' };
  }
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

export async function submitClaim(claimData: Omit<SpClaim, 'id' | 'created_at' | 'claim_number'> & { analysis_id?: string }): Promise<SpClaim | null> {
  // FIX: previously this dropped 7 of 10 fields the UI sends.
  // Now forwards the FULL payload to the gateway (which derives agent_id from linked policy).
  const { data, error } = await callGateway('submit_claim', {
    claim_type:      (claimData as any).claim_type,
    description:     (claimData as any).description,
    location:        (claimData as any).location,
    amount_estimated:(claimData as any).amount_estimated,
    // Fields previously dropped:
    client_name:     (claimData as any).client_name,
    policy_number:   (claimData as any).policy_number,
    policy_id:       (claimData as any).policy_id,
    product_type:    (claimData as any).product_type,
    chronology:      (claimData as any).chronology,
    photos:          (claimData as any).photos,
    incident_date:   (claimData as any).incident_date ?? (claimData as any).date,
    // Photo fraud analysis — the gateway looks this id up server-side and
    // ignores any fraud fields sent directly (see submit_claim in
    // data-gateway/actions/claims.ts for why).
    analysis_id:     (claimData as any).analysis_id,
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

export async function getCustomerClaims(_userId: string, strict = false): Promise<SpClaim[]> {
  const { data, error } = await callGateway('get_my_claims');
  if (error) {
    console.error('getCustomerClaims:', error);
    if (strict) throw error;
    return [];
  }
  return (data ?? []) as SpClaim[];
}

// ─── B2B claims (v2.9.31) ─────────────────────────────────────────────────────

/** List claims owned by the current B2B client (`client_id = caller`). */
export async function getMyB2BClaims(opts: { limit?: number; offset?: number } = {}): Promise<SpClaim[]> {
  const { data, error } = await callGateway('b2b_my_claims', {
    limit: opts.limit,
    offset: opts.offset,
  });
  if (error) { console.error('getMyB2BClaims:', error); return []; }
  return (data ?? []) as SpClaim[];
}

export interface B2BClaimPayload {
  /** Nomor polisi atau nomor rangka unit — wajib. */
  unit_label: string;
  /** Tanggal kejadian, format YYYY-MM-DD — wajib. */
  incident_date: string;
  /** Deskripsi singkat (minimal 10 karakter) — wajib. */
  description: string;
  /** Lokasi kejadian, opsional. */
  location?: string;
  /** Kronologi lengkap, opsional. */
  chronology?: string;
  /** Estimasi nilai kerugian dalam IDR, opsional. */
  amount_estimated?: number;
  /** URL foto yang sudah di-upload ke Supabase Storage, maks 10. */
  photo_urls?: string[];
}

/**
 * Submit a B2B claim. Server fills `client_id`, `user_id`, and generates
 * `claim_number`. Returns the created row, or `null` on failure (details in
 * `error`).
 */
export async function submitB2BClaim(payload: B2BClaimPayload): Promise<{ data: SpClaim | null; error?: string; code?: string }> {
  const response = await callGateway('b2b_submit_claim', payload as unknown as Record<string, unknown>);
  if (response.error) {
    console.error('submitB2BClaim:', response.error);
    return { data: null, error: response.error, code: typeof response.code === 'string' ? response.code : undefined };
  }
  return { data: (response.data as SpClaim | null) ?? null };
}
