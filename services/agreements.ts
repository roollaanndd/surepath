// Agent legal agreements (sp_agent_agreements) and Terms & Conditions
// acceptance records (sp_tnc_records). Owns the AGREEMENT_DOC_VERSION constant.

import { supabase, callGateway } from './db';
import { TNC_VERSION, buildTncText } from '../src/tnc-content';
import type { AcceptAgreementResult, TncRecord } from './dbTypes';

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
  const { data, error } = await callGateway('get_my_agreement');
  if (error) { console.error('getMyAgreement:', error); return null; }
  return (data as SpAgentAgreement) ?? null;
}

// Records the agent's acceptance. Routed through the data-gateway
// (service_role) to bypass RLS — the previous direct client-side insert
// was silently failing for some agents due to RLS/foreign-key issues.
export async function acceptAgreement(
  fullName: string,
  ktpNumber: string,
): Promise<AcceptAgreementResult> {
  const { data, error } = await callGateway('accept_agreement', {
    full_name: fullName.trim(),
    ktp_number: ktpNumber.trim(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 255) : null,
  });
  if (error) {
    console.error('acceptAgreement:', error);
    // Map gateway errors to error codes the UI can handle
    if (error === 'ALREADY_ACCEPTED') {
      return { rec: null, error: { code: '23505', message: 'Already accepted' } };
    }
    return { rec: null, error: { code: 'UNKNOWN', message: error } };
  }
  if (!data) return { rec: null, error: { code: 'UNKNOWN', message: 'No data returned' } };
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
  // Version-aware: a user is only considered "accepted" if their most recent
  // sp_tnc_records row matches the currently-published TNC_VERSION. This is
  // what makes a version bump (e.g. v2.0 -> v3.0) actually re-prompt
  // existing users instead of silently grandfathering them into terms they
  // never agreed to.
  const { data: rec } = await supabase
    .from('sp_tnc_records')
    .select('tnc_version')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (rec?.tnc_version === TNC_VERSION) return true;
  if (rec) return false; // accepted an older version — must re-accept

  // Legacy fallback: accounts that predate sp_tnc_records only have the
  // sp_users.tc_accepted flag with no version history at all. Trust it
  // rather than force a surprise re-prompt with nothing to compare against.
  const { data } = await supabase.from('sp_users').select('tc_accepted').eq('id', userId).single();
  return data?.tc_accepted === true;
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
