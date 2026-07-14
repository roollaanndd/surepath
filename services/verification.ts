// Identity verification (KYC): KTP upload + admin/operator review as the
// authoritative gate, plus phone OTP as a selectable lighter-weight check.
// See supabase/migrations/20260714_identity_verification.sql and
// data-gateway/actions/users.ts for the backend workflow this wraps.

import { supabase, callGateway } from './db';

export type IdentityStatus = 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IdentityVerificationRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  ktp?: string;
  ktp_document_url?: string | null;
  identity_status: IdentityStatus;
  identity_submitted_at?: string | null;
  identity_reviewed_at?: string | null;
  identity_reject_reason?: string | null;
  phone_verified_at?: string | null;
  tc_accepted?: boolean;
  created_at?: string;
}

export interface TncRecordRow {
  id: string;
  user_id: string;
  reference_number: string;
  tnc_version: string;
  accepted_at: string;
  user_agent?: string | null;
  user: { name: string; email: string; role: string } | null;
}

// ─── Self-service (customer/agent) ──────────────────────────────────────────

// Submits (or re-submits after a rejection) a KTP document for review.
// Prefer services/storage.ts#uploadIdentityKtp, which uploads the file AND
// calls this action in one step — use this directly only if the document is
// already hosted (e.g. re-pointing at an existing URL).
export async function submitIdentityVerification(ktpDocumentUrl: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await callGateway('submit_identity_verification', { ktp_document_url: ktpDocumentUrl });
  if (error) return { ok: false, error };
  return { ok: !!data };
}

// Lightweight phone verification via WhatsApp OTP (Fonnte), reusing the
// existing send-otp/verify-otp edge functions. `purpose: 'VERIFY'` keeps
// these codes in their own rate-limit/audit bucket, separate from login OTPs.
export async function sendPhoneVerificationOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { phone, purpose: 'VERIFY' },
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Gagal mengirim OTP' };
  return { ok: true };
}

export async function verifyPhoneVerificationOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { phone, code, purpose: 'VERIFY' },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Kode OTP tidak valid' };
  const gw = await callGateway('mark_phone_verified', { phone: data.phone });
  if (gw.error) return { ok: false, error: gw.error };
  return { ok: true };
}

// Email is already verified through Supabase Auth itself: the app blocks an
// active session until the confirmation link is used (email/password
// signup), or the provider (Google, email-OTP login) verifies it directly.
// So there's no separate "verify email" action — this just surfaces that
// existing state for the UI to show as the alternative lightweight option.
export async function isEmailVerified(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data.user?.email_confirmed_at;
}

// ─── Admin / Operator review queue ──────────────────────────────────────────

export async function adminListIdentityVerifications(
  status: IdentityStatus | 'ALL' = 'PENDING',
  role?: string,
): Promise<IdentityVerificationRow[]> {
  const { data, error } = await callGateway('admin_list_identity_verifications', { status, role });
  if (error) { console.error('adminListIdentityVerifications:', error); return []; }
  return (data as IdentityVerificationRow[]) ?? [];
}

export async function adminReviewIdentityVerification(
  userId: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await callGateway('admin_review_identity_verification', { user_id: userId, action, reason });
  if (error) return { ok: false, error };
  return { ok: !!data };
}

// ─── T&C acceptance audit (admin/operator visibility) ───────────────────────

export async function adminListTncRecords(search?: string): Promise<TncRecordRow[]> {
  const { data, error } = await callGateway('admin_list_tnc_records', { search });
  if (error) { console.error('adminListTncRecords:', error); return []; }
  return (data as TncRecordRow[]) ?? [];
}
