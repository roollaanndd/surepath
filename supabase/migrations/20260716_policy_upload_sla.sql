-- ═══════════════════════════════════════════════════════════════════════════
-- Policy Upload SLA — deadline upload softcopy polis oleh insurer
--
-- Setelah insurer menyetujui pengajuan (insurer_decision = APPROVED), insurer
-- wajib mengupload softcopy polis (PDF) dalam tempo SLA (default 72 jam).
-- Kolom policy_upload_deadline diisi oleh gateway saat decision APPROVED.
-- Reminder:
--   - Popup di insurer app (client-side, baca kolom ini)
--   - Email + notifikasi admin via insurer-reminder-cron (section 3)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS policy_upload_deadline timestamptz;

-- Penanda reminder upload polis yang sudah terkirim (anti-spam, per stage)
ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS policy_upload_reminder_count int NOT NULL DEFAULT 0;
ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS policy_upload_last_reminded_at timestamptz;

-- Backfill: order yang sudah APPROVED oleh insurer tapi belum ada polisnya
-- mendapat deadline 72 jam dari waktu decision (atau dari sekarang bila
-- decision_at kosong).
UPDATE public.sp_policy_orders
SET policy_upload_deadline = COALESCE(insurer_decision_at, now()) + interval '72 hours'
WHERE insurer_decision = 'APPROVED'
  AND policy_document_url IS NULL
  AND policy_upload_deadline IS NULL;

CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_upload_deadline
  ON public.sp_policy_orders (policy_upload_deadline)
  WHERE policy_upload_deadline IS NOT NULL;
