-- ─────────────────────────────────────────────────────────────────────────────
-- PERBAIKAN CACAT JALUR UANG: setiap UPDATE ke sp_payments di-rollback.
--
-- `audit_critical_update()` terpasang di DUA tabel — sp_policy_orders dan
-- sp_payments — tetapi mendereferensi OLD.total_premium, OLD.commission_amount
-- dan OLD.discount_amount tanpa syarat. sp_payments tidak punya satu pun dari
-- ketiganya (17 kolom, hanya `status` yang cocok), dan di PL/pgSQL field record
-- yang tidak ada adalah ERROR RUNTIME, bukan NULL:
--
--   ERROR: record "old" has no field "total_premium"
--
-- Ini trigger AFTER UPDATE dalam transaksi yang sama, jadi errornya membatalkan
-- transaksi pemanggil. Akibatnya SETIAP UPDATE ke sp_payments gagal. INSERT
-- aman (trigger ini hanya UPDATE), itulah sebabnya create-xendit-invoice jalan
-- dan tidak ada yang menyadarinya.
--
-- Terbukti empiris di produksi 10 Sep 2026 lewat transaksi yang dibatalkan
-- sendiri: insert satu baris sp_payments, update satu kolom sepele, hasilnya
-- persis error di atas.
--
-- DAMPAK: xendit-webhook menandai pembayaran PAID lewat UPDATE. Dengan cacat
-- ini, pembayaran pertama yang benar-benar masuk tidak akan pernah jadi PAID,
-- komisi agen tidak dikredit, order tidak maju, insurer tidak dinotifikasi.
-- Belum meledak semata karena sp_payments masih kosong.
--
-- Ini ranjau KEDUA di jalur yang sama. Yang pertama (verify_jwt = true pada
-- xendit-webhook, v2.5.2) membuat callback ditolak sebelum fungsi jalan.
-- Memperbaiki satu saja tidak cukup.
--
-- PERBAIKANNYA: bandingkan lewat to_jsonb() supaya kolom yang tidak ada di
-- tabel tertentu menghasilkan NULL, bukan error.
--
-- EKUIVALENSI untuk sp_policy_orders (yang punya keempat kolom) dijaga ketat:
--   • `status` dibandingkan sebagai text — sama seperti sebelumnya.
--   • ketiga kolom uang di-cast kembali ke numeric sebelum dibandingkan
--     (total_premium numeric, commission_amount/discount_amount bigint), jadi
--     perbandingannya numerik seperti semula — bukan perbandingan teks, yang
--     akan menganggap 1.0 dan 1.00 berbeda.
--   • payload audit tetap to_jsonb(old)/to_jsonb(new), persis seperti semula.
-- Untuk sp_payments hanya `status` yang bisa berubah; tiga sisanya NULL di
-- kedua sisi sehingga tidak pernah memicu baris audit palsu.
--
-- Atribut fungsi dipertahankan apa adanya: SECURITY INVOKER (bukan DEFINER)
-- dan search_path = public, pg_temp.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_critical_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
DECLARE
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
BEGIN
  IF (o->>'status') IS DISTINCT FROM (n->>'status')
     OR (o->>'total_premium')::numeric     IS DISTINCT FROM (n->>'total_premium')::numeric
     OR (o->>'commission_amount')::numeric IS DISTINCT FROM (n->>'commission_amount')::numeric
     OR (o->>'discount_amount')::numeric   IS DISTINCT FROM (n->>'discount_amount')::numeric
  THEN
    INSERT INTO public.sp_audit_log (table_name, row_id, action, old_data, new_data, actor_id, session_info)
    VALUES (
      TG_TABLE_NAME,
      (new.id)::text,
      'UPDATE',
      o,
      n,
      auth.uid(),
      current_setting('app.user_email', true)
    );
  END IF;
  RETURN new;
END;
$fn$;

COMMENT ON FUNCTION public.audit_critical_update() IS
  'Audit UPDATE pada tabel kritis. Membandingkan lewat to_jsonb agar aman dipasang di tabel yang tidak punya seluruh kolom uang (mis. sp_payments) — lihat migrasi 20260910.';
