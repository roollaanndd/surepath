-- ═══════════════════════════════════════════════════════════════════════════
-- 20261025120000_fix_agent_routing_and_audit_criticals.sql
--
-- Three concerns in one migration (all verified by the 2026-10-25 full audit):
--
-- (1) AGENT ROUTING REPAIR — "agent lands in customer app"
--     20260707_multi_app_access.sql backfilled allowed_apps = ARRAY[role] once.
--     Nothing else ever writes allowed_apps, so every role changed via
--     admin_update_user since then (CUSTOMER→AGENT corrections, etc.) left a
--     stale array. rolePath()/hasAppAccess() trust allowed_apps over role, so
--     those agents are routed to /custapp (or blocked from /agapps) even
--     though sp_users.role says AGENT.
--     Repair: NULL → ARRAY[role]; arrays that don't contain role → append.
--
-- (2) AUDIT C1 — leftover client INSERT policies on money tables
--     sp_policy_orders_agent_insert (20260603_tighten_tier2_rls.sql) and
--     sp_withdrawals_agent_insert (20260603_tighten_withdrawals_rls.sql) were
--     never dropped by the hardening waves. They let any authenticated agent
--     direct-insert order/withdrawal rows bypassing the data-gateway's
--     server-side commission computation and wallet deduction:
--       · orders: arbitrary commission_amount → webhook credits it verbatim
--       · withdrawals: no request_withdrawal_deduct → approve+disburse = payout
--         with zero balance deduction
--     All writes now flow through data-gateway (service_role bypasses RLS).
--
-- (3) AUDIT C2 backstop — DB-level invariant trigger on direct order inserts.
--     Even if an INSERT policy is reintroduced by mistake, a BEFORE INSERT
--     trigger caps commission and forces the SUBMITTED status. Service-role
--     inserts from the gateway pass the same invariants (gateway computes
--     commission ≤ 30% and status='SUBMITTED' anyway), so legitimate flows
--     are unaffected.
--
-- Safe to re-run. Idempotent via IF EXISTS / DO blocks.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) allowed_apps routing repair
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Users with no array at all: give them their role's app.
UPDATE public.sp_users
SET allowed_apps = ARRAY[role]
WHERE allowed_apps IS NULL
  AND role IS NOT NULL;

-- 1b. Users whose array lost their own role (the admin_update_user drift).
--     Append — never overwrite, multi-app users keep their existing apps.
UPDATE public.sp_users
SET allowed_apps = array_append(allowed_apps, role)
WHERE role IS NOT NULL
  AND allowed_apps IS NOT NULL
  AND NOT (role = ANY (allowed_apps));

-- 1c. Keep the repair permanent: a trigger that re-syncs allowed_apps whenever
--     a role changes, so admin_update_user can never reintroduce the drift.
CREATE OR REPLACE FUNCTION public.sync_allowed_apps_with_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.allowed_apps IS NULL THEN
    NEW.allowed_apps := ARRAY[NEW.role];
  ELSIF NOT (NEW.role = ANY (NEW.allowed_apps)) THEN
    NEW.allowed_apps := array_append(NEW.allowed_apps, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_allowed_apps_with_role ON public.sp_users;
CREATE TRIGGER trg_sync_allowed_apps_with_role
  BEFORE INSERT OR UPDATE OF role, allowed_apps ON public.sp_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_allowed_apps_with_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) Drop leftover client-writable INSERT policies on money tables
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sp_policy_orders_agent_insert" ON public.sp_policy_orders;
DROP POLICY IF EXISTS "sp_policies_agent_insert"      ON public.sp_policies;
DROP POLICY IF EXISTS "sp_withdrawals_agent_insert"   ON public.sp_withdrawals;

-- sp_policy_orders / sp_policies / sp_withdrawals are now written ONLY by the
-- data-gateway via service_role (which bypasses RLS). Agents keep their SELECT
-- policies; withdrawals keep the cancel policy (PENDING→CANCELLED transition).

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) Defense-in-depth invariant trigger on direct sp_policy_orders inserts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_policy_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Commission can never exceed half the premium on any insert path.
  -- The gateway computes commission from the insurer product config with a
  -- 30% cap; anything above 50% is fraudulent regardless of source.
  IF NEW.commission_amount IS NOT NULL
     AND NEW.total_premium IS NOT NULL
     AND NEW.total_premium > 0
     AND NEW.commission_amount > NEW.total_premium * 0.5 THEN
    RAISE EXCEPTION 'commission_exceeds_cap: % > % * 0.5',
      NEW.commission_amount, NEW.total_premium
      USING ERRCODE = 'check_violation';
  END IF;

  -- A client-visible order always starts at SUBMITTED. Issuance flows
  -- (policy_number, ISSUED status) must go through the gateway review chain.
  IF NEW.status IS DISTINCT FROM 'SUBMITTED'
     OR NEW.policy_number IS NOT NULL
     OR NEW.policy_document_url IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_direct_order_insert: status/policy fields are server-managed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_policy_order_insert ON public.sp_policy_orders;
CREATE TRIGGER trg_guard_policy_order_insert
  BEFORE INSERT ON public.sp_policy_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_policy_order_insert();

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification snippets (run after applying):
--   SELECT id, role, allowed_apps FROM sp_users
--     WHERE role IS NOT NULL AND (allowed_apps IS NULL OR NOT (role = ANY(allowed_apps)));
--   → must return 0 rows.
--   SELECT policy_name FROM pg_policies
--     WHERE tablename IN ('sp_policy_orders','sp_policies','sp_withdrawals')
--       AND cmd = 'INSERT' AND roles @> ARRAY['authenticated'];
--   → must return 0 rows.
-- ═══════════════════════════════════════════════════════════════════════════
