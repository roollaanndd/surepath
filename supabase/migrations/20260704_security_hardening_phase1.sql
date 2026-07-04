-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening phase 1 — closes gaps found ahead of the OJK-rate CMS,
-- vehicle-age-limit, and insurer-logo work (which extend these same tables).
--
-- Findings this migration fixes (confirmed live via inspection, not just
-- static review):
--   1. sp_insurers / sp_insurer_products / sp_vehicle_overrides carried a
--      redundant "public read: true" policy alongside the intended
--      "authenticated, is_active only" policy. Postgres OR's permissive
--      policies together, so ANY unauthenticated visitor could read every
--      row (including inactive ones) of all three tables — exposing insurer
--      PIC contact info (admin_email/pic_email/pic_phone) and commercial
--      terms (commission/discount/coin rates) with no login at all.
--   2. sp_claims had RLS enabled but zero policies — default-deny, so the
--      direct client-side query in DocumentsAdminView returned nothing even
--      for admins. Adding proper admin + owner policies fixes this.
--   3. is_admin() exists live but was never captured in a tracked migration
--      — recreating it here so it's reproducible/auditable from source.
--   4. Storage: policy-documents bucket was public with an unrestricted
--      anon INSERT policy (full policy PDFs readable via a guessable path,
--      uploadable by anyone). media allowed anon INSERT/UPDATE/DELETE
--      (site defacement risk). vehicle-images allowed anon INSERT.
--      agent-docs (KTP) had no policies at all (broken, not just insecure).
--      website-assets bucket didn't exist (site logo/section-image upload
--      was broken).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── is_admin(): track the live definition in source ──────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sp_users
    WHERE id = auth.uid()
      AND role IN ('MASTER_ADMIN','ADMIN','FINANCE','INSURANCE_ADMIN',
                   'FINANCE_MANAGER','FINANCE_DIRECTOR')
  );
$function$;

-- ── Drop redundant public/anon read policies ─────────────────────────────────
-- Admin-all (is_admin()) + authenticated "active rows only" policies already
-- exist and remain in place; only the unauthenticated-open ones are removed.
DROP POLICY IF EXISTS "public read" ON public.sp_insurers;
DROP POLICY IF EXISTS "public read" ON public.sp_insurer_products;
DROP POLICY IF EXISTS "public read" ON public.sp_vehicle_overrides;

-- ── sp_claims: add missing policies (currently zero — default-deny) ─────────
CREATE POLICY "sp_claims_admin" ON public.sp_claims
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "sp_claims_owner_select" ON public.sp_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR agent_id = auth.uid());

CREATE POLICY "sp_claims_owner_insert" ON public.sp_claims
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR agent_id = auth.uid());

-- ── Storage: media — stop anon write access, keep public read ───────────────
DROP POLICY IF EXISTS "media_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "media_anon_delete" ON storage.objects;

CREATE POLICY "media_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND is_admin());

CREATE POLICY "media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND is_admin())
  WITH CHECK (bucket_id = 'media' AND is_admin());

CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND is_admin());

-- ── Storage: policy-documents — private bucket, scoped read, no anon write ──
UPDATE storage.buckets SET public = false WHERE id = 'policy-documents';

DROP POLICY IF EXISTS "policy_docs_insert" ON storage.objects;

CREATE POLICY "policy_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "policy_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'policy-documents' AND (
      is_admin() OR EXISTS (
        SELECT 1 FROM public.sp_policy_orders o
        WHERE o.order_number = (storage.foldername(name))[1]
          AND (o.client_id = auth.uid() OR o.agent_id = auth.uid())
      )
    )
  );

-- ── Storage: agent-docs (KTP) — was fully unpoliced; add owner + admin ──────
CREATE POLICY "agent_docs_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'agent-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

CREATE POLICY "agent_docs_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "agent_docs_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'agent-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'agent-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage: vehicle-images — keep public read, stop anon upload ───────────
DROP POLICY IF EXISTS "vehicle_images_insert" ON storage.objects;

CREATE POLICY "vehicle_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);

-- ── Storage: website-assets — bucket referenced by code but never created ──
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('website-assets', 'website-assets', true, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "website_assets_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'website-assets');

CREATE POLICY "website_assets_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'website-assets' AND is_admin())
  WITH CHECK (bucket_id = 'website-assets' AND is_admin());
