// Agent legal agreements (sp_agent_agreements) and Terms & Conditions
// acceptance records (sp_tnc_records). Owns the AGREEMENT_DOC_VERSION constant.

import { supabase } from './db';
import { TNC_VERSION, buildTncText } from '../src/tnc-content';
import type { SpAgentAgreement, AcceptAgreementResult, TncRecord } from './dbTypes';

// ─── Agent Legal Agreement (sp_agent_agreements) ────────────────────────────
export const AGREEMENT_DOC_VERSION = 'v1.0-2026';

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

// ─── Terms & Conditions ───────────────────────────────────────────────────────

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
