-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_operator_role.sql — Adds the OPERATOR role + Realtime support for
-- the dedicated Operator App (/operatorapp).
--
-- Operators are internal staff who:
--   • approve / reject policy orders, claims, withdrawals (L1)
--   • verify / suspend agents
--   • receive popup notifications when new submissions arrive
--
-- They are NOT full admins: they cannot invite users, change roles, or assign
-- tiers (gateway-side role-escalation matrix already enforces this — see
-- admin_update_user in supabase/functions/data-gateway/index.ts).
--
-- This migration:
--   1. Adds an is_operator() SQL helper (parallel to is_admin()).
--   2. Updates sp_admin_notifications RLS to also let operators SELECT rows
--      (so the operator app can subscribe to Realtime + read the bell feed).
--   3. Adds sp_admin_notifications, sp_policy_orders, sp_claims, sp_withdrawals
--      to the supabase_realtime publication — operators get push events.
--   4. Adds a trigger that auto-inserts a NEW_WITHDRAWAL admin notification
--      when an agent creates a withdrawal request (the wallet.ts direct-insert
--      path bypasses the gateway, so the gateway-side notification insert
--      wouldn't fire — the trigger catches it at the DB layer instead).
--
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE throughout).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. is_operator() helper ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sp_users
    WHERE id = auth.uid()
      AND role = 'OPERATOR'
  );
$function$;

-- Convenience: is_staff() = admin OR operator (used by RLS for shared feeds).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin() OR public.is_operator();
$function$;

-- ── 2. sp_admin_notifications: let operators read the bell feed ──────────────
-- Drop & recreate the admin-select policy to use is_staff() instead of
-- is_admin() — this is the ONLY behavioural change for existing admins
-- (they continue to pass; operators now also pass).
ALTER TABLE public.sp_admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_admin_notifications_staff_select" ON public.sp_admin_notifications;
CREATE POLICY "sp_admin_notifications_staff_select" ON public.sp_admin_notifications
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "sp_admin_notifications_staff_update" ON public.sp_admin_notifications;
CREATE POLICY "sp_admin_notifications_staff_update" ON public.sp_admin_notifications
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Service role (data-gateway) can do everything.
DROP POLICY IF EXISTS "sp_admin_notifications_service_all" ON public.sp_admin_notifications;
CREATE POLICY "sp_admin_notifications_service_all" ON public.sp_admin_notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 3. Add tables to the supabase_realtime publication ──────────────────────
-- Supabase Realtime only broadcasts changes for tables in this publication.
-- We add the four tables the operator app subscribes to. (They may already
-- be present if a previous migration added them — the DO block guards it.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sp_admin_notifications',
    'sp_policy_orders',
    'sp_claims',
    'sp_withdrawals',
    'sp_payments',
    'sp_users'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- ── 4. Trigger: auto-insert NEW_WITHDRAWAL admin notification ───────────────
-- The agent wallet flow (services/wallet.ts → requestWithdrawal) inserts
-- directly into sp_withdrawals, bypassing the gateway. A trigger is the only
-- way to fire a notification from that path.
CREATE OR REPLACE FUNCTION public.notify_new_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.sp_admin_notifications (type, title, body, read, metadata)
  VALUES (
    'NEW_WITHDRAWAL',
    'Permintaan Penarikan Baru',
    'Agen ' || COALESCE((SELECT name FROM public.sp_users WHERE id = NEW.agent_id), '???')
      || ' menarik Rp ' || to_char(NEW.amount, 'FM999,999,999'),
    false,
    jsonb_build_object('withdrawal_id', NEW.id, 'agent_id', NEW.agent_id, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_withdrawal ON public.sp_withdrawals;
CREATE TRIGGER trg_notify_new_withdrawal
  AFTER INSERT ON public.sp_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_withdrawal();

-- ── 5. Trigger: auto-insert NEW_PAYMENT admin notification ──────────────────
-- sp_payments is updated by Xendit webhooks / direct inserts. Fire a notif
-- when a payment transitions to PAID.
CREATE OR REPLACE FUNCTION public.notify_paid_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'PAID')
     OR (TG_OP = 'INSERT' AND NEW.status = 'PAID') THEN
    INSERT INTO public.sp_admin_notifications (type, title, body, read, metadata)
    VALUES (
      'NEW_PAYMENT',
      'Pembayaran Diterima',
      'Rp ' || to_char(COALESCE(NEW.paid_amount, NEW.amount), 'FM999,999,999')
        || COALESCE(' · order ' || (SELECT order_number FROM public.sp_policy_orders WHERE id = NEW.order_id), ''),
      false,
      jsonb_build_object('payment_id', NEW.id, 'order_id', NEW.order_id, 'amount', COALESCE(NEW.paid_amount, NEW.amount))
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_paid_payment ON public.sp_payments;
CREATE TRIGGER trg_notify_paid_payment
  AFTER INSERT OR UPDATE ON public.sp_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_paid_payment();
