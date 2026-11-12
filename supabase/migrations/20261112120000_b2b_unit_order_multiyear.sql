-- v2.8.23 — Order Unit B2B: tanggal efektif, multi-tahun dengan penyusutan,
-- dan pilihan "diskon tertera di polis".
--
-- Order unit (components/b2b/B2BUnitOrder.tsx) adalah batch berisi 1 item,
-- jadi semua data barunya hidup di sp_b2b_batch_items — tidak ada tabel atau
-- jalur baru. Semua kolom aditif dengan default yang sama dengan perilaku
-- lama, sehingga baris impor massal (yang tidak mengisi kolom-kolom ini)
-- tetap berarti persis seperti sebelumnya:
--   coverage_start_date / coverage_end_date  NULL  → periode belum ditentukan
--   depreciation_rate                        0     → nilai pertanggungan tetap
--   premium_schedule                         []    → tidak ada jadwal per tahun
--   discount_shown_on_policy                 true  → diskon tertera (status quo)
--
-- Angka di kolom-kolom ini selalu dihitung server (actions/b2bBulk.ts →
-- b2b_bulk_create_batch); klien hanya memilih tanggal, YA/TIDAK penyusutan,
-- besar diskon (dijepit ke diskon rate set aktif), dan YA/TIDAK tertera.

ALTER TABLE public.sp_b2b_batch_items
  ADD COLUMN IF NOT EXISTS coverage_start_date      date,
  ADD COLUMN IF NOT EXISTS coverage_end_date        date,
  ADD COLUMN IF NOT EXISTS depreciation_rate        numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_schedule         jsonb        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_shown_on_policy boolean      NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_b2b_batch_items_depreciation_rate') THEN
    ALTER TABLE public.sp_b2b_batch_items
      ADD CONSTRAINT sp_b2b_batch_items_depreciation_rate
      CHECK (depreciation_rate >= 0 AND depreciation_rate <= 0.5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sp_b2b_batch_items_coverage_period') THEN
    ALTER TABLE public.sp_b2b_batch_items
      ADD CONSTRAINT sp_b2b_batch_items_coverage_period
      CHECK (coverage_end_date IS NULL OR coverage_start_date IS NULL OR coverage_end_date > coverage_start_date);
  END IF;
END $$;

COMMENT ON COLUMN public.sp_b2b_batch_items.coverage_start_date IS 'Tanggal efektif pertanggungan (order unit). NULL untuk baris impor massal.';
COMMENT ON COLUMN public.sp_b2b_batch_items.coverage_end_date IS 'coverage_start_date + tenor_months, dihitung server.';
COMMENT ON COLUMN public.sp_b2b_batch_items.depreciation_rate IS 'Penyusutan nilai pertanggungan per tahun polis yang diterapkan (0 = tidak menyusut).';
COMMENT ON COLUMN public.sp_b2b_batch_items.premium_schedule IS 'Jadwal per tahun polis: [{year, months, sumInsured, premiumGross}]. Kosong bila tidak menyusut.';
COMMENT ON COLUMN public.sp_b2b_batch_items.discount_shown_on_policy IS 'true = diskon dicetak di polis; false = polis mencetak premi gross.';
