-- ─── Tutup dua lubang RLS pada tabel token (audit keamanan 2026-10-23) ───────
--
-- Audit menemukan dua tabel token yang terbuka untuk SETIAP user terautentikasi
-- di produksi. Terverifikasi empiris: dengan `set local role authenticated` dan
-- klaim `sub` berupa UUID acak, `sp_insurer_auth_tokens` mengembalikan 1 baris
-- dan `sp_review_tokens` mengembalikan 8 baris, sementara `sp_users`,
-- `sp_policy_orders` dan `sp_agent_wallets` benar mengembalikan 0.
--
-- 20260604_security_hardening.sql:83-87 sudah menulis DROP untuk policy ini
-- tapi tidak pernah diterapkan ke produksi. Menjalankannya apa adanya TIDAK
-- cukup: untuk sp_review_tokens ia hanya menghapus tanpa mengganti, dan jalur
-- klien tabel itu masih hidup (lihat di bawah). Migration ini idempoten dan
-- aman dijalankan meskipun 20260604 belakangan ikut diterapkan.

-- ── sp_insurer_auth_tokens ───────────────────────────────────────────────────
--
-- Policy `insurer_auth_tokens_read_by_token` (SELECT true), `..._insert`
-- (INSERT true) dan `..._update_used_at` (UPDATE true/true) semuanya untuk role
-- `public`, artinya setiap pemegang akun customer bisa menarik seluruh bearer
-- token insurer dan masuk /insurerapp sebagai insurer mana pun, atau menerbitkan
-- token baru untuk dirinya sendiri.
--
-- Aman di-drop tanpa pengganti: jalur klien sudah mati. `validateInsurerAuthToken`
-- (services/website.ts:192) tidak punya pemanggil, dan `createInsurerAuthToken`
-- (:178) hanya dipanggil dari `autoSendReviewLink` (:259) yang juga tidak dipanggil
-- siapa pun — lihat komentar di components/agent/VehicleUnderwritingWizard.tsx:669
-- yang mencatat fungsi itu dicabut karena "selalu gagal diam-diam untuk agent".
-- Jalur hidupnya lewat data-gateway, yang memakai service_role dan melewati RLS.
DROP POLICY IF EXISTS "insurer_auth_tokens_read_by_token"   ON public.sp_insurer_auth_tokens;
DROP POLICY IF EXISTS "insurer_auth_tokens_insert"          ON public.sp_insurer_auth_tokens;
DROP POLICY IF EXISTS "insurer_auth_tokens_update_used_at"  ON public.sp_insurer_auth_tokens;

-- ── sp_review_tokens ─────────────────────────────────────────────────────────
--
-- Policy `admins_manage_tokens` adalah ALL untuk role `public` dengan
-- true/true — tanpa pemeriksaan admin sama sekali, meski namanya menyiratkan
-- sebaliknya. Setiap user yang login bisa membaca semua token review, membuka
-- /review/:uuid milik pelanggan lain, dan menulis insurer_action.
--
-- TIDAK bisa di-drop tanpa pengganti: components/admin/PolicyOrdersAdmin.tsx:71
-- (`handleSendReviewLink`) masih memanggil `createReviewToken`
-- (services/website.ts:218) yang INSERT langsung ke tabel ini dengan anon key
-- sebagai admin yang login. Tanpa policy pengganti tombol itu rusak.
--
-- Jadi: ganti dengan policy ber-scope admin. Bentuk akhir yang benar adalah
-- memindahkan `createReviewToken` ke data-gateway (yang sudah punya
-- `admin_send_insurer_review_link` di actions/orders.ts:48 membuat token dengan
-- service_role) lalu men-drop policy ini tanpa pengganti — tapi itu perubahan
-- kode klien, dan lubangnya perlu ditutup sekarang.
--
-- Catatan: `is_admin()` di database juga mencakup FINANCE, FINANCE_MANAGER,
-- FINANCE_DIRECTOR dan INSURANCE_ADMIN selain MASTER_ADMIN/ADMIN, jadi
-- cakupannya lebih luas dari idealnya — tapi jauh lebih sempit dari `true`.
DROP POLICY IF EXISTS "admins_manage_tokens" ON public.sp_review_tokens;

DROP POLICY IF EXISTS "sp_review_tokens_admin_all" ON public.sp_review_tokens;
CREATE POLICY "sp_review_tokens_admin_all"
  ON public.sp_review_tokens
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- service_role melewati RLS, jadi data-gateway dan edge function lain tidak
-- terpengaruh. Pembaca publik /review/:uuid juga tidak: ia lewat action
-- `get_insurer_review` di gateway, bukan query langsung.
