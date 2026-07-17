-- ═══════════════════════════════════════════════════════════════════════════
-- E-Quotation link expiry — the QR link on every quotation slip PDF is valid
-- for 14 days from generation (re-downloading the PDF refreshes the window).
--
-- After link_expires_at the public /q/{code} page reports status EXPIRED and
-- confirm_public_quotation returns 410. Distinct from valid_until, which is
-- the COMMERCIAL validity of the offer printed on the document.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_quotations
  ADD COLUMN IF NOT EXISTS link_expires_at timestamptz;

UPDATE public.sp_quotations
  SET link_expires_at = created_at + interval '14 days'
  WHERE link_expires_at IS NULL;

ALTER TABLE public.sp_quotations
  ALTER COLUMN link_expires_at SET DEFAULT (now() + interval '14 days');

ALTER TABLE public.sp_quotations
  ALTER COLUMN link_expires_at SET NOT NULL;
