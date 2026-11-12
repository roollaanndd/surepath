-- v2.8.23 — bersihkan kolom multi-tahun yang tidak jadi dipakai di
-- sp_policy_orders.
--
-- Migrasi 20261108120000 menambah empat kolom ini untuk wizard order motor
-- B2B terpisah (B2BMotorOrderWizard) yang tidak pernah sampai ke main. Fitur
-- multi-tahun akhirnya masuk ke Order Unit, yang menyimpan datanya di
-- sp_b2b_batch_items (lihat 20261112120000). Tidak ada kode yang membaca atau
-- menulis kolom-kolom ini, dan saat migrasi ini ditulis seluruh baris
-- sp_policy_orders masih bernilai default — jadi tidak ada data yang hilang.
-- CHECK constraint milik kolom ikut terhapus bersama kolomnya.

ALTER TABLE public.sp_policy_orders
  DROP COLUMN IF EXISTS duration_years,
  DROP COLUMN IF EXISTS premium_schedule,
  DROP COLUMN IF EXISTS b2b_discount_rate,
  DROP COLUMN IF EXISTS b2b_discount_shown_on_policy;
