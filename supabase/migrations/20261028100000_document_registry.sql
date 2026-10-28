-- ═══════════════════════════════════════════════════════════════════════════
-- Document registry & submission storage
--
-- Why this migration exists (audit 28 Okt 2026):
--   Dokumen yang disubmit nasabah/agen tidak pernah tersimpan:
--     1. Foto STNK + 5 foto survey (car wizard) hanya dipakai sebagai input
--        analisa AI (base64 di memori) lalu dibuang — tidak ada bukti
--        dokumenter yang bisa ditelusuri admin/asuransi.
--     2. Foto kendaraan agen di-upload ke folder `tmp-{timestamp}` dan URL-nya
--        ditolak data-gateway (bukan bagian dari insert whitelist) — kolom
--        sp_policy_orders.vehicle_image_url dibaca 5 portal tapi tak pernah
--        terisi.
--     3. Laporan hasil audit foto survey (skor AI, temuan, analisa fraud)
--        tidak pernah diarsipkan sebagai dokumen pelengkap order.
--     4. Perjanjian mitra hanya menyimpan baris e-consent; PDF-nya dibuat
--        ulang di browser dan tidak pernah diarsipkan server-side.
--
--   Migration ini menambahkan:
--     - sp_documents            : registry terpusat semua dokumen (traceable)
--     - bucket order-documents  : bucket privat untuk dokumen pengajuan polis
--                                 (STNK, foto survey, laporan audit)
--     - sp_agent_agreements     : kolom arsip PDF perjanjian yang tersimpan
--     - sp_policy_orders        : kolom ai_score/ai_verdict/vehicle_image_url
--                                 (defensif — base table pra-migrasi)
--     - sp_b2b_documents        : tabel yang selama ini ditulis storage.ts
--                                 tapi tidak pernah ada di source control
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Registry dokumen terpusat ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text        NOT NULL,
  entity_id        text        NOT NULL,
  doc_type         text        NOT NULL,
  bucket           text        NOT NULL,
  path             text        NOT NULL,
  url              text,
  mime_type        text,
  size_bytes       bigint,
  uploaded_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_role text,
  meta             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sp_documents_entity CHECK (entity_type IN
    ('policy_order','claim','agent','agreement','b2b','insurer')),
  CONSTRAINT sp_documents_doc_type CHECK (doc_type IN
    ('STNK','VEHICLE_PHOTO','SURVEY_PHOTO','SURVEY_AUDIT_REPORT',
     'AGREEMENT_PDF','KTP','POLICY_PDF','CLAIM_PHOTO','B2B_DOC','OTHER')),
  CONSTRAINT sp_documents_path_shape CHECK (position('/' in path) > 0)
);

-- Satu objek storage terdaftar sekali per (bucket, path).
CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_documents_bucket_path
  ON public.sp_documents(bucket, path);
CREATE INDEX IF NOT EXISTS idx_sp_documents_entity
  ON public.sp_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sp_documents_doc_type
  ON public.sp_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_sp_documents_created_at
  ON public.sp_documents(created_at DESC);

ALTER TABLE public.sp_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_documents_admin_select" ON public.sp_documents;
CREATE POLICY "sp_documents_admin_select" ON public.sp_documents
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Pemilik dokumen boleh melihat riwayat unggahannya sendiri.
DROP POLICY IF EXISTS "sp_documents_select_own" ON public.sp_documents;
CREATE POLICY "sp_documents_select_own" ON public.sp_documents
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

-- Penulisan hanya lewat data-gateway (service_role melewati RLS).
DROP POLICY IF EXISTS "sp_documents_service_all" ON public.sp_documents;
CREATE POLICY "sp_documents_service_all" ON public.sp_documents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. Bucket privat order-documents ────────────────────────────────────────
-- Path: {order_number}/{doc_type}.{ext} — folder pertama = nomor order.
-- Pembacaan TIDAK langsung dari klien: URL bertanda tangan diterbitkan
-- data-gateway (documents_signed_url) setelah cek kepemilikan order.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-documents',
  'order-documents',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper SECURITY DEFINER: bolehkan upload hanya untuk pemilik order
-- (agen yang membuat order, nasabah pemilik order, atau admin). Definer
-- diperlukan karena sp_policy_orders deny-all untuk klien.
CREATE OR REPLACE FUNCTION public.can_access_order_documents(p_order_no text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sp_policy_orders o
    WHERE o.order_number = p_order_no
      AND (
        o.agent_id = auth.uid()
        OR o.client_id = auth.uid()
        OR public.is_admin()
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_access_order_documents(text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_order_documents(text) TO authenticated;

DROP POLICY IF EXISTS "order_documents_insert_own" ON storage.objects;
CREATE POLICY "order_documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-documents'
    AND public.can_access_order_documents((storage.foldername(name))[1])
  );

-- supabase-js upload({ upsert: true }) memerlukan policy UPDATE juga.
DROP POLICY IF EXISTS "order_documents_update_own" ON storage.objects;
CREATE POLICY "order_documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'order-documents'
    AND public.can_access_order_documents((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'order-documents'
    AND public.can_access_order_documents((storage.foldername(name))[1])
  );

-- Tidak ada policy SELECT untuk klien: unduhan hanya via signed URL
-- yang diterbitkan data-gateway setelah validasi akses.

-- ── 3. Kolom arsip PDF pada perjanjian mitra ────────────────────────────────
ALTER TABLE public.sp_agent_agreements
  ADD COLUMN IF NOT EXISTS pdf_bucket text,
  ADD COLUMN IF NOT EXISTS pdf_path   text,
  ADD COLUMN IF NOT EXISTS pdf_url    text;

-- ── 4. Kolom order yang dibaca banyak portal tapi tidak pernah dibuat ──────
-- Base table sp_policy_orders dibuat sebelum repo memakai migrasi; tambahkan
-- secara defensif agar whitelist gateway baru tidak gagal di DB lama.
ALTER TABLE public.sp_policy_orders
  ADD COLUMN IF NOT EXISTS ai_score          numeric,
  ADD COLUMN IF NOT EXISTS ai_verdict        text,
  ADD COLUMN IF NOT EXISTS vehicle_image_url text;

-- ── 5. sp_b2b_documents — drift fix ─────────────────────────────────────────
-- services/storage.ts uploadB2BDocument() menulis ke tabel ini sejak lama,
-- tapi CREATE TABLE-nya tidak pernah dikommit (pola sama dengan
-- sp_agent_agreements sebelum 20260706).
CREATE TABLE IF NOT EXISTS public.sp_b2b_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text        NOT NULL,
  doc_type      text        NOT NULL,
  file_name     text,
  file_path     text        NOT NULL,
  file_size     bigint,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_b2b_documents_submission
  ON public.sp_b2b_documents(submission_id);

ALTER TABLE public.sp_b2b_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_b2b_documents_admin_all" ON public.sp_b2b_documents;
CREATE POLICY "sp_b2b_documents_admin_all" ON public.sp_b2b_documents
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sp_b2b_documents_service_all" ON public.sp_b2b_documents;
CREATE POLICY "sp_b2b_documents_service_all" ON public.sp_b2b_documents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
