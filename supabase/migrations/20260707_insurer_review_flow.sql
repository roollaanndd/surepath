-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_insurer_review_flow.sql — Extends existing token tables for the
-- new insurer review flow + CMS.
--
-- Changes:
--   1. sp_review_tokens: add reminder tracking columns
--   2. sp_insurer_auth_tokens: extend expiry to 7 days (was 24h single-use)
--   3. sp_policy_orders: add insurer decision fields (denormalized for fast reads)
--   4. Index for reminder query (tokens with no action, older than 24h)
--
-- Safe to re-run (uses IF NOT EXISTS throughout).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. sp_review_tokens: reminder tracking ───────────────────────────────────
ALTER TABLE public.sp_review_tokens
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;

-- ── 2. sp_insurer_auth_tokens: 7-day rolling expiry (multi-use) ──────────────
-- Drop the old 24h default and replace with 7 days. The used_at column
-- stays for audit but is no longer checked by the new gateway action
-- (get_insurer_dashboard uses rolling expiry instead).
ALTER TABLE public.sp_insurer_auth_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- ── 3. sp_policy_orders: insurer decision fields ─────────────────────────────
-- Denormalized from sp_review_tokens so the operator/admin/user apps can
-- read the decision without joining. Updated atomically by the gateway
-- action submit_insurer_decision.
ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS insurer_decision text,        -- 'APPROVED' | 'REQUEST_INFO' | 'DECLINED'
  ADD COLUMN IF NOT EXISTS insurer_decision_notes text,
  ADD COLUMN IF NOT EXISTS insurer_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS insurer_review_token_id uuid;

-- Backfill insurer_decision from existing sp_review_tokens rows
UPDATE public.sp_policy_orders o
SET
  insurer_decision = rt.insurer_action,
  insurer_decision_notes = rt.insurer_notes,
  insurer_decision_at = rt.actioned_at,
  insurer_review_token_id = rt.id
FROM public.sp_review_tokens rt
WHERE rt.order_id = o.id
  AND rt.insurer_action IS NOT NULL
  AND o.insurer_decision IS NULL;

-- ── 4. Index for reminder query ──────────────────────────────────────────────
-- Daily cron: SELECT * FROM sp_review_tokens WHERE insurer_action IS NULL
-- AND expires_at > now() AND created_at < now() - interval '24 hours'
CREATE INDEX IF NOT EXISTS idx_sp_review_tokens_pending_reminder
  ON public.sp_review_tokens(created_at)
  WHERE insurer_action IS NULL;

-- ── 5. Add sp_review_tokens to Realtime publication ─────────────────────────
-- So the operator app gets a popup when insurer submits a decision.
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_review_tokens';
  EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN others THEN NULL;
  END;
END $$;
