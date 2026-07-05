-- ═══════════════════════════════════════════════════════════════════════════
-- Insurer logo/icon management. Insurer branding previously had no real
-- image asset — Provider.logo in types.ts is a Lucide icon name string, not
-- an uploaded file. Adds a logo_url column plus a dedicated storage bucket
-- (public read — logos are non-sensitive brand assets — admin-only write).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_insurers ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('insurer-logos', 'insurer-logos', true, 2097152)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "insurer_logos_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'insurer-logos');

CREATE POLICY "insurer_logos_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'insurer-logos' AND is_admin())
  WITH CHECK (bucket_id = 'insurer-logos' AND is_admin());
