-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_insurer_decision_columns.sql — Add insurer decision tracking
-- columns to sp_policy_orders.
--
-- These columns are required by the gateway actions:
--   submit_insurer_decision (review token flow)
--   insurer_submit_decision_authed (dashboard flow)
--   get_insurer_dashboard (KPI counts)
--
-- Without these columns, insurer decisions silently fail (UPDATE returns
-- error but the gateway catches it and returns 400).
--
-- Columns:
--   insurer_decision          text        — 'APPROVED' | 'REQUEST_INFO' | 'DECLINED' | NULL
--   insurer_decision_notes    text        — notes from insurer (required for REQUEST_INFO + DECLINED)
--   insurer_decision_at       timestamptz — when insurer made the decision
--   insurer_review_token_id   uuid        — which review token was used (FK to sp_review_tokens)
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS insurer_decision text;

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS insurer_decision_notes text;

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS insurer_decision_at timestamptz;

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS insurer_review_token_id uuid;

-- Index for fast "pending insurer decision" queries
CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_insurer_decision
  ON public.sp_policy_orders(insurer_decision)
  WHERE insurer_decision IS NULL;
