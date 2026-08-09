-- 20260803_security_hardening_v1_53.sql — v1.53.0 security hardening
--
-- Addresses findings from full audit run 2026-08-03:
--   P0: explicit deny-all RLS policies on 7 gateway-only tables (silences
--       linter, documents intent)
--   P0: REVOKE EXECUTE from anon/authenticated on SECURITY DEFINER helpers
--       that shouldn't be exposed via PostgREST /rpc/*
--   P1: SET search_path on 3 SECURITY DEFINER functions to prevent
--       search_path hijacking
--
-- Idempotent — all statements guard existence.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Explicit deny-all policies on gateway-only tables
-- ═══════════════════════════════════════════════════════════════════════════
-- These tables have RLS enabled but no policies (implicit deny). All access
-- is service_role via the data-gateway edge function. Adding explicit
-- USING(false) documents the intent and silences supabase linter 0008.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_audit_logs', 'admin_sessions', 'sp_bot_config',
    'sp_otp_codes', 'sp_payments', 'sp_policy_orders', 'sp_wa_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_direct_gateway_only', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        'deny_direct_gateway_only', t
      );
    END IF;
  END LOOP;
END $$;

COMMENT ON POLICY "deny_direct_gateway_only" ON public.sp_payments IS
  'Gateway-only: all reads/writes go through data-gateway edge function (service_role). Direct anon/authenticated queries denied by design.';
COMMENT ON POLICY "deny_direct_gateway_only" ON public.sp_policy_orders IS
  'Gateway-only: all reads/writes go through data-gateway edge function (service_role). Direct anon/authenticated queries denied by design.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. REVOKE EXECUTE on SECURITY DEFINER helpers not meant for direct RPC
-- ═══════════════════════════════════════════════════════════════════════════
-- These functions are either:
--   (a) trigger-only (notify_*, log_sp_users_role_change, block_hard_delete)
--   (b) called by edge functions with service_role (increment_rate_limit)
--   (c) internal admin ops with in-function admin checks (force_delete,
--       soft_delete) — the check is defensive but exposure via /rpc/* is
--       still unnecessary attack surface.
-- No caller-side change required: service_role always has EXECUTE.

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'force_delete(text, uuid, text)',
    'soft_delete(text, uuid, text)',
    'notify_new_withdrawal()',
    'notify_paid_payment()',
    'log_sp_users_role_change()',
    'increment_rate_limit(text, text, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = split_part(fn, '(', 1)
    ) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- is_admin/is_operator/is_staff are used by many RLS policies (including
-- storage.objects policies). authenticated MUST keep EXECUTE — the RLS
-- planner needs to call them. Only revoke from anon (an anon user has no
-- reason to query "am I admin?" via RPC — they aren't).
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['is_admin()', 'is_operator()', 'is_staff()'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = split_part(fn, '(', 1)
    ) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. SET search_path on SECURITY DEFINER functions with mutable search_path
-- ═══════════════════════════════════════════════════════════════════════════
-- Without SET search_path, a malicious extension in public could shadow
-- functions/operators these definers call, escalating privilege.

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'gen_agent_agreement_no()',
    'block_hard_delete()',
    'audit_critical_update()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = split_part(fn, '(', 1)
    ) THEN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public, pg_temp', fn);
    END IF;
  END LOOP;
END $$;
