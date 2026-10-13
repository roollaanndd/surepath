-- Prevent authenticated users from modifying privilege, verification, and
-- compensation fields on their own sp_users row through the PostgREST API.
-- RLS's self-update policy scopes the row, but cannot restrict which columns
-- a user may update. The application layer alone is not a security boundary.
--
-- Admins and trusted service-role operations retain their existing workflows.
-- No existing user data is changed by this migration.

CREATE OR REPLACE FUNCTION public.guard_sp_users_sensitive_self_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Trusted server-side service calls are allowed to perform admin workflows.
  -- Ordinary authenticated users must not alter authorization or verification
  -- state, financial balances, commission terms, or agent hierarchy themselves.
  IF auth.uid() IS NOT NULL AND auth.role() <> 'service_role'
     AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.allowed_apps IS DISTINCT FROM OLD.allowed_apps
       OR NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.agent_code IS DISTINCT FROM OLD.agent_code
       OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
       OR NEW.monthly_target IS DISTINCT FROM OLD.monthly_target
       OR NEW.coins_balance IS DISTINCT FROM OLD.coins_balance
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
       OR NEW.upline_id IS DISTINCT FROM OLD.upline_id
       OR NEW.override_commission_total IS DISTINCT FROM OLD.override_commission_total
       OR NEW.tier IS DISTINCT FROM OLD.tier
       OR NEW.tier_assigned_by IS DISTINCT FROM OLD.tier_assigned_by
       OR NEW.tier_assigned_at IS DISTINCT FROM OLD.tier_assigned_at
       OR NEW.identity_status IS DISTINCT FROM OLD.identity_status
       OR NEW.identity_reviewed_by IS DISTINCT FROM OLD.identity_reviewed_by
       OR NEW.identity_reviewed_at IS DISTINCT FROM OLD.identity_reviewed_at
       OR NEW.identity_reject_reason IS DISTINCT FROM OLD.identity_reject_reason
       OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at
       OR NEW.member_since IS DISTINCT FROM OLD.member_since THEN
      RAISE EXCEPTION 'Sensitive account fields can only be changed by an authorized administrator'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_sp_users_sensitive_self_updates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_sp_users_sensitive_self_updates() FROM anon;
REVOKE ALL ON FUNCTION public.guard_sp_users_sensitive_self_updates() FROM authenticated;

DROP TRIGGER IF EXISTS trg_guard_sp_users_sensitive_self_updates ON public.sp_users;
CREATE TRIGGER trg_guard_sp_users_sensitive_self_updates
  BEFORE UPDATE ON public.sp_users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_sp_users_sensitive_self_updates();
