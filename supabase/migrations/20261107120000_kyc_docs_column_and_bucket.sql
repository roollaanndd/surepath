-- v2.8.5 — KYC storage foundation
--
-- Admin-only Unified Add-User wizard mengunggah dokumen KYC per role (KTP,
-- NPWP, NIB, akta, dsb). Kita simpan referensi path-nya (bukan isi file) di
-- kolom jsonb `kyc_docs` pada sp_users: struktur fleksibel karena tiap role
-- butuh dokumen berbeda (lihat components/admin/wizard/kycMatrix.ts).
--
-- File asli ada di bucket privat `kyc-documents`, path format:
--   {user_id}/{doc_type}/{uuid}.{ext}
-- Struktur `kyc_docs`:
--   { doc_type: { path, uploaded_at, size_bytes, mime, uploaded_by } }

ALTER TABLE public.sp_users
  ADD COLUMN IF NOT EXISTS kyc_docs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sp_users.kyc_docs IS
  'Referensi dokumen KYC di storage bucket kyc-documents. Struktur: { doc_type: { path, uploaded_at, size_bytes, mime, uploaded_by } }. Admin-only read via data-gateway.';

-- Bucket privat untuk dokumen KYC (tidak public, akses hanya via signed URL
-- yang diperoleh gateway setelah role-check).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents', 'kyc-documents', false,
  10 * 1024 * 1024, -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: hanya service_role yang boleh insert/update/delete/select langsung
-- (via edge function). File dibaca lewat signed URL yang gateway buat
-- setelah role-check — tidak ada akses anon.
DROP POLICY IF EXISTS "kyc_docs_service_only_insert" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_service_only_update" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_service_only_delete" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_service_only_select" ON storage.objects;

CREATE POLICY "kyc_docs_service_only_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'service_role');

CREATE POLICY "kyc_docs_service_only_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'kyc-documents' AND auth.role() = 'service_role');

CREATE POLICY "kyc_docs_service_only_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'kyc-documents' AND auth.role() = 'service_role');

CREATE POLICY "kyc_docs_service_only_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND auth.role() = 'service_role');
