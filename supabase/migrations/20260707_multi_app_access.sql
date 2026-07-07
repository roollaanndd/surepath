-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_multi_app_access.sql — Add allowed_apps column to sp_users
--
-- Allows a single user to access multiple apps (customer + agent + operator).
-- The primary `role` field still determines the user's "main" app for routing
-- when allowed_apps is NULL/empty; allowed_apps OVERRIDES routing when set.
--
-- Values stored: 'CUSTOMER', 'AGENT', 'OPERATOR', 'ADMIN' (case-sensitive,
-- matches UserRole enum values in types.ts).
--
-- Examples:
--   allowed_apps = NULL                       → use role for routing (legacy)
--   allowed_apps = '{CUSTOMER}'               → customer app only
--   allowed_apps = '{CUSTOMER,AGENT}'         → AppSelector screen shown
--   allowed_apps = '{OPERATOR,ADMIN}'         → AppSelector screen shown
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_users
  ADD COLUMN IF NOT EXISTS allowed_apps text[] DEFAULT NULL;

-- Index for fast "who can access this app" queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_sp_users_allowed_apps
  ON public.sp_users USING GIN (allowed_apps);

-- Backfill: every existing user gets their current role in allowed_apps
-- so multi-app routing doesn't break legacy users.
UPDATE public.sp_users
SET allowed_apps = ARRAY[role]
WHERE allowed_apps IS NULL;
