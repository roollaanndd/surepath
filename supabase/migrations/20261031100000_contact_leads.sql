-- ═══════════════════════════════════════════════════════════════════════════
-- Prospek dari formulir kontak situs publik
--
-- Kenapa migrasi ini ada (audit situs publik 31 Okt 2026):
--   Formulir di `/contact` (src/pages/ContactPage.tsx) tidak pernah mengirim
--   apa pun ke mana pun. `handleSubmit` hanya memanggil `setSent(true)`, lalu
--   menampilkan "Pesan Terkirim! Tim kami akan segera menghubungimu." kepada
--   pengunjung. Nama, email, nomor telepon, dan pesannya dibuang begitu saja.
--   Setiap prospek yang pernah mengisi formulir itu hilang, dan diberi janji
--   palsu bahwa ia akan dihubungi.
--
--   Email dan WhatsApp SurePath belum aktif sebagai tujuan prospek otomatis
--   (dikonfirmasi roland, 31 Okt 2026), jadi tujuan yang hidup hanyalah
--   database + portal operator. Notifikasi email/WhatsApp bisa ditambahkan
--   di atas tabel ini begitu kanalnya siap, tanpa mengubah skema.
--
-- Pola: tabel sensitif → RLS deny-all untuk anon, tulis HANYA lewat
-- data-gateway (service_role melewati RLS), baca hanya untuk admin/operator.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_contact_leads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  email        text,
  phone        text,
  message      text        NOT NULL,
  -- Halaman asal prospek, supaya operator tahu konteksnya tanpa menebak.
  source_path  text,
  -- NEW → CONTACTED → CLOSED. Teks, bukan enum, supaya status baru tidak
  -- memerlukan migrasi DDL di produksi.
  status       text        NOT NULL DEFAULT 'NEW',
  -- Catatan operator setelah menindaklanjuti.
  notes        text,
  handled_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at   timestamptz,
  -- Diisi server dari header permintaan, bukan dari parameter klien.
  ip           text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Antrean operator selalu dibaca "yang baru dulu", disaring per status.
CREATE INDEX IF NOT EXISTS sp_contact_leads_status_created_idx
  ON public.sp_contact_leads (status, created_at DESC);

CREATE INDEX IF NOT EXISTS sp_contact_leads_created_idx
  ON public.sp_contact_leads (created_at DESC);

ALTER TABLE public.sp_contact_leads ENABLE ROW LEVEL SECURITY;

-- Admin dan operator membaca antrean prospek. `is_admin()` sudah mencakup
-- OPERATOR (ADMIN_ROLES), sama seperti tabel operasional lain.
DROP POLICY IF EXISTS "sp_contact_leads_admin_select" ON public.sp_contact_leads;
CREATE POLICY "sp_contact_leads_admin_select" ON public.sp_contact_leads
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Penulisan HANYA lewat data-gateway. Tidak ada policy insert untuk `anon`
-- maupun `authenticated`: pengunjung anonim mengirim lewat aksi publik
-- `submit_contact_lead`, yang berjalan sebagai service_role dan rate-limited
-- per IP. Tanpa ini, formulir publik akan jadi endpoint tulis terbuka.
DROP POLICY IF EXISTS "sp_contact_leads_service_all" ON public.sp_contact_leads;
CREATE POLICY "sp_contact_leads_service_all" ON public.sp_contact_leads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
