-- 20260803_role_change_audit.sql — audit + tamper-guard role changes on sp_users
--
-- Motivation: PR #89 (login failure diagnosis) surfaced that a partner-vs-customer
-- role mix-up is only recoverable if we can see WHEN and BY WHOM a role was changed.
-- This trigger writes an audit row to sp_audit_log every time sp_users.role changes,
-- so we have a source of truth even if the application layer somehow bypassed
-- ensure_profile's role-stickiness guard.
--
-- Idempotent: DROP first, then recreate.

DROP TRIGGER IF EXISTS trg_sp_users_role_change_audit ON public.sp_users;
DROP FUNCTION IF EXISTS public.log_sp_users_role_change();

CREATE OR REPLACE FUNCTION public.log_sp_users_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.sp_audit_log (
      table_name, row_id, action,
      old_data, new_data,
      actor_id, actor_email, reason, created_at
    ) VALUES (
      'sp_users',
      NEW.id::text,
      'ROLE_CHANGE',
      jsonb_build_object('role', OLD.role, 'allowed_apps', OLD.allowed_apps),
      jsonb_build_object('role', NEW.role, 'allowed_apps', NEW.allowed_apps),
      NULL,   -- service_role writes have no auth.uid(); actor is captured by the app layer
      NULL,
      'trigger: sp_users.role changed',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sp_users_role_change_audit
AFTER UPDATE OF role ON public.sp_users
FOR EACH ROW
EXECUTE FUNCTION public.log_sp_users_role_change();

COMMENT ON FUNCTION public.log_sp_users_role_change() IS
  'Writes an audit row to sp_audit_log whenever sp_users.role changes. Supports the ROLE STICKINESS invariant established in ensure_profile (v1.52.0).';
