-- ═══════════════════════════════════════════════════════════════════════════
-- Cross-app table lockdown — tables that belong to a co-hosted application
-- sharing this Supabase project.
--
-- ⚠️  VERIFY BEFORE APPLYING: these tables belong to another app. Dropping
-- their permissive policies will affect that app's users. Coordinate with
-- the other app's developer before running these statements.
--
-- WHY THIS MATTERS: SurePath's anon key is embedded in the JS bundle.
-- Any visitor to myinsurepath.com can extract the anon key and use it to
-- read/write these tables since they have no effective RLS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── donations ────────────────────────────────────────────────────────────────
-- Enable RLS if not already done
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;
-- Remove the blanket anon policy (replace with whatever the other app needs)
DROP POLICY IF EXISTS "anon_all_donations"  ON public.donations;
DROP POLICY IF EXISTS "public_all_donations" ON public.donations;
-- Deny anon reads by default (no anon SELECT policy = deny by default)

-- ── prayer_requests ──────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.prayer_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_prayer_requests"  ON public.prayer_requests;
DROP POLICY IF EXISTS "public_all_prayer_requests" ON public.prayer_requests;

-- ── site_settings ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_site_settings"  ON public.site_settings;
DROP POLICY IF EXISTS "public_all_site_settings" ON public.site_settings;

-- ── backups (cross-app variant — covered in tighten_backups_rls.sql) ────────
-- Already handled in the main backups migration above.
