-- ═══════════════════════════════════════════════════════════════════════════
-- Tighten the `backups` table: only authenticated users (admins) may
-- read or insert backup records. Anon role is denied everything.
--
-- Note: backupService.ts currently collects from sensitive tables using the
-- anon key. After sp_users/sp_clients RLS is applied, collectSupabase()
-- will return empty results for those tables (self-select policy blocks
-- cross-user reads). The backup feature should be migrated to use the
-- data-gateway for data collection so service_role can read all rows.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.backups ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "anon_all_backups"        ON public.backups;
DROP POLICY IF EXISTS "authenticated_all_backups" ON public.backups;

-- Authenticated users (admins) can list backup metadata.
CREATE POLICY "backups_auth_select"
  ON public.backups FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert new backups.
CREATE POLICY "backups_auth_insert"
  ON public.backups FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anon role cannot touch backups at all (deny by default — no policies for anon).
