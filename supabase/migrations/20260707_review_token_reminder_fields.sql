-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_review_token_reminder_fields.sql — Add reminder tracking columns
-- to sp_review_tokens for the scheduled reminder system.
--
-- Columns:
--   reminder_count     integer DEFAULT 0  — how many reminders sent (max 3)
--   last_reminded_at   timestamptz        — when last reminder was sent
--
-- Used by supabase/functions/insurer-reminder-cron/index.ts
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_review_tokens
  ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;

ALTER TABLE public.sp_review_tokens
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;
