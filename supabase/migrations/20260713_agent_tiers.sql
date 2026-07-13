-- ═══════════════════════════════════════════════════════════════════════════
-- Agent Tier Management — CMS-configurable tiers (replaces hardcoded
-- STANDARD/STAR/ELITE in types.ts + the separate client-side Bronze/Silver/
-- Gold/Platinum leaderboard tiers) with a single admin-CRUD-managed system.
--
-- New tables:
--   sp_agent_tiers          — tier definitions (name, thresholds, rates, benefits)
--   sp_agent_tier_history   — audit trail of every tier change
--   sp_tier_change_requests — approval queue for tiers that require sign-off
--
-- sp_users.tier is widened from a de-facto 'STAR'|'ELITE'|null to any active
-- sp_agent_tiers.code, backfilled to the default tier, NOT NULL.
--
-- sp_tier_config is superseded (its 3 rows are seeded into sp_agent_tiers
-- below with identical rates) and dropped — it was never actually read by
-- the payout webhook, which had its own hardcoded copy; keeping two sources
-- of truth is the bug this migration fixes.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── sp_agent_tiers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_agent_tiers (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,
  name               text not null,
  rank               int not null default 0,
  color              text not null default '#6b7280',
  emoji              text,
  min_policies_count int,
  min_premium_amount numeric,
  coin_bonus_rate    numeric not null default 0,
  l1_override_rate   numeric not null default 0,
  l2_override_rate   numeric not null default 0,
  benefits           jsonb not null default '{}'::jsonb,
  requires_approval  boolean not null default false,
  approval_roles     text[] not null default '{MASTER_ADMIN}',
  is_default         boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sp_agent_tiers_one_default
  ON public.sp_agent_tiers (is_default) WHERE is_default;

-- ── sp_agent_tier_history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_agent_tier_history (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           uuid not null references public.sp_users(id),
  tier_code          text not null,
  previous_tier_code text,
  source             text not null default 'MANUAL' check (source in ('AUTO','MANUAL')),
  assigned_by        uuid,
  assigned_at        timestamptz not null default now(),
  note               text
);

CREATE INDEX IF NOT EXISTS idx_sp_agent_tier_history_agent
  ON public.sp_agent_tier_history (agent_id, assigned_at desc);

-- ── sp_tier_change_requests ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_tier_change_requests (
  id                  uuid primary key default gen_random_uuid(),
  agent_id            uuid not null references public.sp_users(id),
  requested_tier_code text not null,
  current_tier_code   text,
  requested_by        uuid,
  requested_at        timestamptz not null default now(),
  status              text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  reason              text,
  source              text not null default 'MANUAL_REQUEST' check (source in ('MANUAL_REQUEST','AUTO_ELIGIBLE')),
  approved_by         uuid,
  approved_at         timestamptz,
  rejected_by         uuid,
  rejected_at         timestamptz,
  rejection_reason    text,
  updated_at          timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_sp_tier_change_requests_status
  ON public.sp_tier_change_requests (status, requested_at desc);

-- ── Seed today's rates so nothing regresses on deploy ────────────────────
INSERT INTO public.sp_agent_tiers
  (code, name, rank, color, emoji, coin_bonus_rate, l1_override_rate, l2_override_rate, is_default, requires_approval, approval_roles)
VALUES
  ('STANDARD', 'Standard',     0, '#6b7280', null,  0.00, 0.02, 0.00, true,  false, '{}'),
  ('STAR',     'Mitra Bintang',1, '#f59e0b', '⭐', 0.10, 0.03, 0.01, false, false, '{MASTER_ADMIN,ADMIN,FINANCE_MANAGER}'),
  ('ELITE',    'Mitra Elite',  2, '#8b5cf6', '💎', 0.15, 0.04, 0.02, false, true,  '{MASTER_ADMIN}')
ON CONFLICT (code) DO NOTHING;

-- ── Backfill sp_users.tier ────────────────────────────────────────────────
-- Drop the old ad-hoc check constraint (tier IN ('STAR','ELITE')) — it
-- predates this migration and doesn't allow 'STANDARD' or any future
-- CMS-created tier code. The new FK constraint below replaces it.
ALTER TABLE public.sp_users DROP CONSTRAINT IF EXISTS sp_users_tier_check;

UPDATE public.sp_users SET tier = 'STANDARD' WHERE tier IS NULL;

ALTER TABLE public.sp_users
  ALTER COLUMN tier SET DEFAULT 'STANDARD',
  ALTER COLUMN tier SET NOT NULL;

ALTER TABLE public.sp_users DROP CONSTRAINT IF EXISTS sp_users_tier_fkey;
ALTER TABLE public.sp_users
  ADD CONSTRAINT sp_users_tier_fkey FOREIGN KEY (tier) REFERENCES public.sp_agent_tiers(code);

-- ── Drop the superseded config table (rates carried forward above) ───────
DROP TABLE IF EXISTS public.sp_tier_config;

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.sp_agent_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_agent_tier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_tier_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_agent_tiers_read_active" ON public.sp_agent_tiers;
CREATE POLICY "sp_agent_tiers_read_active"
  ON public.sp_agent_tiers
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "sp_agent_tiers_admin_write" ON public.sp_agent_tiers;
CREATE POLICY "sp_agent_tiers_admin_write"
  ON public.sp_agent_tiers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sp_agent_tiers_service_all" ON public.sp_agent_tiers;
CREATE POLICY "sp_agent_tiers_service_all"
  ON public.sp_agent_tiers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- history & requests: gateway (service_role) only — no direct client access.
DROP POLICY IF EXISTS "sp_agent_tier_history_service_all" ON public.sp_agent_tier_history;
CREATE POLICY "sp_agent_tier_history_service_all"
  ON public.sp_agent_tier_history
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sp_tier_change_requests_service_all" ON public.sp_tier_change_requests;
CREATE POLICY "sp_tier_change_requests_service_all"
  ON public.sp_tier_change_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
