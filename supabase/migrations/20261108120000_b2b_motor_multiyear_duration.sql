-- v2.9.0 — B2B motor order multi-year support
--
-- sp_policy_orders existing: start_date, end_date, sum_insured (SI tahun 1).
-- Baru: duration_years (1-6), premium_schedule (jsonb per-tahun breakdown),
-- b2b_discount_rate (0-0.25), b2b_discount_shown_on_policy (bool).
--
-- Policy B2B ambil multi-tahun: total premium dibayar upfront di Y1.
-- SI depresiasi -10% compound per tahun (SI_n = SI_1 × 0.9^(n-1)).
-- end_date dihitung sebagai start_date + duration_years * 365 hari.

ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS duration_years smallint NOT NULL DEFAULT 1 CHECK (duration_years BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS premium_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS b2b_discount_rate numeric(5,4) NOT NULL DEFAULT 0 CHECK (b2b_discount_rate >= 0 AND b2b_discount_rate <= 0.25),
  ADD COLUMN IF NOT EXISTS b2b_discount_shown_on_policy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sp_policy_orders.duration_years IS
  'B2B multi-year policy duration 1-6 tahun. Default 1 (polis tahunan standar).';
COMMENT ON COLUMN public.sp_policy_orders.premium_schedule IS
  'B2B multi-year: array per-tahun [{year, depreciated_si, base_premium, addon_premium, gross_total}]. Kosong untuk polis 1 tahun.';
COMMENT ON COLUMN public.sp_policy_orders.b2b_discount_rate IS
  'B2B diskon multi-year 0-25%. 0 = tanpa diskon (default).';
COMMENT ON COLUMN public.sp_policy_orders.b2b_discount_shown_on_policy IS
  'Apakah diskon tertera di dokumen polis atau tidak (toggle admin/klien).';
