-- ═══════════════════════════════════════════════════════════════════════════
-- Customer identity verification (KYC) — sp_users columns
--
-- Why: customers were marked `verified = true` at signup with zero identity
-- check (ensure_profile action), while agents already went through a proper
-- KTP + operator-review gate. This adds the same review workflow for every
-- role: a submission moves UNSUBMITTED -> PENDING (KTP uploaded) ->
-- APPROVED/REJECTED (admin/operator decision). `verified` stays the single
-- "fully verified" flag read throughout the app; identity_status adds the
-- missing PENDING state and an audit trail (who reviewed, when, why
-- rejected). phone_verified_at tracks the lighter-weight WhatsApp OTP check
-- (supabase/functions/send-otp, verify-otp — previously unwired).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE sp_users
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'UNSUBMITTED',
  ADD COLUMN IF NOT EXISTS identity_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS identity_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_reject_reason text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

ALTER TABLE sp_users DROP CONSTRAINT IF EXISTS sp_users_identity_status_check;
ALTER TABLE sp_users ADD CONSTRAINT sp_users_identity_status_check
  CHECK (identity_status IN ('UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'));

-- Backfill: don't regress anyone already verified under the old boolean-only
-- scheme (all agents approved via admin_verify_agent, any customer that was
-- auto-verified at signup) into an "unverified" UI state.
UPDATE sp_users SET identity_status = 'APPROVED' WHERE verified = true AND identity_status = 'UNSUBMITTED';

CREATE INDEX IF NOT EXISTS idx_sp_users_identity_status ON sp_users(identity_status) WHERE identity_status = 'PENDING';
