-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening — Phase 3 (2026-07-06)
--
-- Closes remaining MEDIUM findings from the white-hat audit:
--   1. agent-profiles + b2b-documents storage buckets have no RLS policies
--      → anyone can read/write agent avatars + B2B corporate documents
--   2. Adds file_size_limit to all storage buckets (prevents abuse)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. agent-profiles bucket — public read, owner-only write ───────────────
-- Avatars are intentionally public (displayed in agent lists, customer-facing
-- agent profiles). Writes are scoped to the owner (first path segment = auth.uid).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('agent-profiles', 'agent-profiles', true, 5242880)  -- 5 MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

DROP POLICY IF EXISTS "agent_profiles_public_select" ON storage.objects;
CREATE POLICY "agent_profiles_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'agent-profiles');

DROP POLICY IF EXISTS "agent_profiles_owner_insert" ON storage.objects;
CREATE POLICY "agent_profiles_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "agent_profiles_owner_update" ON storage.objects;
CREATE POLICY "agent_profiles_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'agent-profiles' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'agent-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "agent_profiles_owner_delete" ON storage.objects;
CREATE POLICY "agent_profiles_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'agent-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can manage any agent profile photo
DROP POLICY IF EXISTS "agent_profiles_admin_all" ON storage.objects;
CREATE POLICY "agent_profiles_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'agent-profiles' AND public.is_admin())
  WITH CHECK (bucket_id = 'agent-profiles' AND public.is_admin());

-- ── 2. b2b-documents bucket — PRIVATE, owner-only + admin ──────────────────
-- Contains corporate financial statements, bonding submissions, group health
-- data. Must NOT be public.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('b2b-documents', 'b2b-documents', false, 10485760)  -- 10 MB, private
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

DROP POLICY IF EXISTS "b2b_docs_owner_select" ON storage.objects;
CREATE POLICY "b2b_docs_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'b2b-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "b2b_docs_owner_insert" ON storage.objects;
CREATE POLICY "b2b_docs_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'b2b-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "b2b_docs_owner_update" ON storage.objects;
CREATE POLICY "b2b_docs_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'b2b-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
  WITH CHECK (bucket_id = 'b2b-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "b2b_docs_admin_delete" ON storage.objects;
CREATE POLICY "b2b_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'b2b-documents' AND public.is_admin());

-- Service role can do everything
DROP POLICY IF EXISTS "b2b_docs_service_all" ON storage.objects;
CREATE POLICY "b2b_docs_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'b2b-documents') WITH CHECK (bucket_id = 'b2b-documents');
