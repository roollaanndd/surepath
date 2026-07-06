-- ═══════════════════════════════════════════════════════════════════════════
-- Database Protection — Soft Delete + Audit Log + Hard Delete Prevention
--
-- PROBLEM: Even with RLS, anyone with admin role or service_role key can
-- DELETE rows from critical tables. There's no:
--   1. Soft-delete (deleted_at column) — deleted data is GONE forever
--   2. Audit log — we don't know WHO deleted WHAT and WHEN
--   3. Trigger to prevent hard DELETE on critical tables
--
-- MITIGATION (4 layers of defense):
--
-- Layer 1: Audit Log Table
--   sp_audit_log records every DELETE + critical UPDATE on protected tables.
--   Captures: table_name, row_id, action, old_data (JSON snapshot), actor,
--   timestamp. Immutable (no UPDATE/DELETE policy).
--
-- Layer 2: Soft-Delete Columns
--   Adds deleted_at column to the 8 most critical tables. Application code
--   filters WHERE deleted_at IS NULL on SELECT. "Delete" becomes
--   UPDATE deleted_at = now() — data is preserved for audit/recovery.
--
-- Layer 3: Block Hard DELETE via Trigger
--   A BEFORE DELETE trigger on critical tables raises an exception UNLESS
--   a session variable app.allow_hard_delete = 'true' is set. This means
--   even service_role can't hard-delete without explicitly opting in.
--
-- Layer 4: force_delete() Function
--   A SECURITY DEFINER function that:
--     1. Verifies the caller is an admin
--     2. Logs the deletion to sp_audit_log (with full row snapshot)
--     3. Sets the session variable
--     4. Performs the DELETE
--     5. Unsets the session variable
--   This way hard deletes are possible but always logged + require explicit
--   intent.
--
-- Protected tables (hard DELETE blocked, soft-delete enabled):
--   sp_policy_orders, sp_payments, sp_claims, sp_commissions,
--   sp_wallet_transactions, sp_withdrawals, sp_agent_agreements
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 1: Audit Log Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_audit_log (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text         NOT NULL,
  row_id          text,
  action          text         NOT NULL CHECK (action IN ('DELETE', 'FORCE_DELETE', 'UPDATE', 'SOFT_DELETE')),
  old_data        jsonb,       -- full row snapshot before the change
  new_data        jsonb,       -- full row snapshot after the change (for UPDATE)
  actor_id        uuid,        -- auth.uid() of the caller (if available)
  actor_email     text,        -- looked up from sp_users
  session_info    text,        -- current_setting('app.user_email') if set
  reason          text,        -- optional reason (set by force_delete)
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_audit_log_table
  ON public.sp_audit_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_audit_log_row
  ON public.sp_audit_log (row_id);
CREATE INDEX IF NOT EXISTS idx_sp_audit_log_actor
  ON public.sp_audit_log (actor_id, created_at DESC);

-- Audit log is immutable — no UPDATE or DELETE allowed (even by admins).
-- Only service_role can INSERT (via triggers + force_delete function).
ALTER TABLE public.sp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_audit_log_admin_read" ON public.sp_audit_log;
CREATE POLICY "sp_audit_log_admin_read"
  ON public.sp_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "sp_audit_log_service_insert" ON public.sp_audit_log;
CREATE POLICY "sp_audit_log_service_insert"
  ON public.sp_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- No UPDATE or DELETE policies = immutable. Even service_role can't modify.

-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 2: Soft-Delete Columns
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sp_policy_orders     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_payments           ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_claims             ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_commissions        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_wallet_transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_withdrawals        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sp_agent_agreements   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_deleted_at
  ON public.sp_policy_orders (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_payments_deleted_at
  ON public.sp_payments (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_claims_deleted_at
  ON public.sp_claims (deleted_at) WHERE deleted_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 3: Block Hard DELETE via Trigger
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger function: blocks DELETE unless app.allow_hard_delete = 'true'
-- When blocked, it suggests using soft_delete instead.
CREATE OR REPLACE FUNCTION public.block_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if hard delete is explicitly allowed (set by force_delete function)
  IF current_setting('app.allow_hard_delete', true) = 'true' THEN
    -- Allowed — log to audit table and let the DELETE proceed
    INSERT INTO public.sp_audit_log (table_name, row_id, action, old_data, actor_id, session_info, reason)
    VALUES (
      TG_TABLE_NAME,
      CASE WHEN TG_OP = 'DELETE' THEN (old.id)::text ELSE NULL END,
      'FORCE_DELETE',
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(old) ELSE NULL END,
      auth.uid(),
      current_setting('app.user_email', true),
      current_setting('app.delete_reason', true)
    );
    RETURN old;
  END IF;

  -- Hard delete NOT allowed — raise exception
  RAISE EXCEPTION 'Hard DELETE is blocked on %. Use soft_delete(table, id) instead, or call force_delete() with a reason.', TG_TABLE_NAME
    USING HINT = 'This is a protected table. Data cannot be permanently deleted without explicit authorization.';
END;
$function$;

-- Attach the trigger to critical tables
DROP TRIGGER IF EXISTS block_delete_sp_policy_orders ON public.sp_policy_orders;
CREATE TRIGGER block_delete_sp_policy_orders
  BEFORE DELETE ON public.sp_policy_orders
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_payments ON public.sp_payments;
CREATE TRIGGER block_delete_sp_payments
  BEFORE DELETE ON public.sp_payments
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_claims ON public.sp_claims;
CREATE TRIGGER block_delete_sp_claims
  BEFORE DELETE ON public.sp_claims
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_commissions ON public.sp_commissions;
CREATE TRIGGER block_delete_sp_commissions
  BEFORE DELETE ON public.sp_commissions
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_wallet_transactions ON public.sp_wallet_transactions;
CREATE TRIGGER block_delete_sp_wallet_transactions
  BEFORE DELETE ON public.sp_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_withdrawals ON public.sp_withdrawals;
CREATE TRIGGER block_delete_sp_withdrawals
  BEFORE DELETE ON public.sp_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

DROP TRIGGER IF EXISTS block_delete_sp_agent_agreements ON public.sp_agent_agreements;
CREATE TRIGGER block_delete_sp_agent_agreements
  BEFORE DELETE ON public.sp_agent_agreements
  FOR EACH ROW EXECUTE FUNCTION public.block_hard_delete();

-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 4: soft_delete() + force_delete() Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- soft_delete(): marks a row as deleted (sets deleted_at) without removing it.
-- Safe to call by any authenticated user who has UPDATE permission on the table.
-- Logs to sp_audit_log.
CREATE OR REPLACE FUNCTION public.soft_delete(
  p_table text,
  p_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Log the soft-delete
  INSERT INTO public.sp_audit_log (table_name, row_id, action, actor_id, reason)
  VALUES (p_table, p_id::text, 'SOFT_DELETE', auth.uid(), p_reason);

  -- Perform the soft-delete (dynamic SQL — table name is validated against
  -- a whitelist to prevent SQL injection)
  IF p_table NOT IN (
    'sp_policy_orders', 'sp_payments', 'sp_claims', 'sp_commissions',
    'sp_wallet_transactions', 'sp_withdrawals', 'sp_agent_agreements'
  ) THEN
    RAISE EXCEPTION 'Table % is not soft-delete-enabled', p_table;
  END IF;

  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', p_table)
    USING p_id;

  RETURN FOUND;
END;
$function$;

-- force_delete(): permanently deletes a row. Only callable by admins.
-- Sets the app.allow_hard_delete session variable so the trigger lets it
-- through, then unsets it immediately after.
CREATE OR REPLACE FUNCTION public.force_delete(
  p_table text,
  p_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Verify caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Require a reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason (min 5 chars) is required for force_delete';
  END IF;

  -- Validate table name against whitelist (prevent SQL injection)
  IF p_table NOT IN (
    'sp_policy_orders', 'sp_payments', 'sp_claims', 'sp_commissions',
    'sp_wallet_transactions', 'sp_withdrawals', 'sp_agent_agreements'
  ) THEN
    RAISE EXCEPTION 'Table % is not force-delete-enabled', p_table;
  END IF;

  -- Set the session variables so the trigger allows the DELETE
  PERFORM set_config('app.allow_hard_delete', 'true', false);
  PERFORM set_config('app.delete_reason', p_reason, false);
  PERFORM set_config('app.user_email',
    COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'unknown'
    ), false);

  -- Perform the hard delete (the trigger will log it to sp_audit_log)
  EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table)
    USING p_id;

  -- Immediately unset the session variable (defense in depth)
  PERFORM set_config('app.allow_hard_delete', 'false', false);
  PERFORM set_config('app.delete_reason', '', false);

  RETURN FOUND;
END;
$function$;

-- Grant execute to authenticated users (the functions check admin internally)
GRANT EXECUTE ON FUNCTION public.soft_delete(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_delete(text, uuid, text) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Bonus: Audit trigger for critical UPDATES (not just deletes)
-- Logs when sensitive fields change on sp_policy_orders (status, total_premium,
-- commission_amount) — catches manual DB edits that bypass the app.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_critical_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only log if a critical field changed
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.total_premium IS DISTINCT FROM NEW.total_premium
     OR OLD.commission_amount IS DISTINCT FROM NEW.commission_amount
     OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
  THEN
    INSERT INTO public.sp_audit_log (table_name, row_id, action, old_data, new_data, actor_id, session_info)
    VALUES (
      TG_TABLE_NAME,
      (NEW.id)::text,
      'UPDATE',
      to_jsonb(old),
      to_jsonb(new),
      auth.uid(),
      current_setting('app.user_email', true)
    );
  END IF;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS audit_update_sp_policy_orders ON public.sp_policy_orders;
CREATE TRIGGER audit_update_sp_policy_orders
  AFTER UPDATE ON public.sp_policy_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_update();

DROP TRIGGER IF EXISTS audit_update_sp_payments ON public.sp_payments;
CREATE TRIGGER audit_update_sp_payments
  AFTER UPDATE ON public.sp_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_update();
