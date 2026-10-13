-- Re-apply least-privilege EXECUTE grants after SECURITY DEFINER functions
-- were added/replaced after the earlier hardening migration. Trigger-only and
-- service-role-only helpers must not be exposed through PostgREST /rpc/*.
-- This changes function grants only; trigger execution and service_role access
-- are retained.

DO $$
DECLARE
  signature text;
  signatures text[] := ARRAY[
    'public.increment_rate_limit(text,text,text)',
    'public.notify_new_withdrawal()',
    'public.notify_paid_payment()',
    'public.log_sp_users_role_change()',
    'public.sp_api_enqueue_webhook(text,uuid,uuid,uuid,jsonb)',
    'public.sp_api_gc()',
    'public.sp_api_orders_webhook_trg()',
    'public.sp_api_payments_webhook_trg()'
  ];
  fn regprocedure;
BEGIN
  FOREACH signature IN ARRAY signatures LOOP
    fn := to_regprocedure(signature);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- These helpers are referenced by RLS policies for authenticated users, so
-- preserve authenticated EXECUTE while removing the default PUBLIC/anon grant.
DO $$
DECLARE
  signature text;
  signatures text[] := ARRAY[
    'public.is_admin()',
    'public.is_operator()',
    'public.is_staff()'
  ];
  fn regprocedure;
BEGIN
  FOREACH signature IN ARRAY signatures LOOP
    fn := to_regprocedure(signature);
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;
END $$;
