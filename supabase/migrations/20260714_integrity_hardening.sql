-- ════════════════════════════════════════════════════════════════════════════
-- v1.42.0 Integrity Hardening Migration
-- ════════════════════════════════════════════════════════════════════════════
-- Fixes 9 critical data integrity issues found in audit:
--   C1: audit_critical_update trigger throws on sp_payments (missing columns)
--   C2: audit_critical_update not SECURITY DEFINER (RLS blocks INSERT)
--   C3: Missing FK on sp_policy_orders.insurer_review_token_id
--   C4: Missing FKs on sp_commissions, sp_claims, sp_payments, sp_endorsements,
--       sp_renewals, sp_review_tokens (orphaned records possible)
--   C8: Drop overly-permissive sp_policy_orders_agent_update (column-level escalation)
--   C9: Drop sp_commissions_agent_insert (self-credit fraud)
--  W4: Add 10 missing indexes for common query patterns
--  W6: Add CHECK constraint on sp_claims (at least one identifier required)
--  W11: Add set_updated_at triggers for auto-updating updated_at
--  W12: Add CHECK constraints for status enums + positive amounts
-- ════════════════════════════════════════════════════════════════════════════

-- ─── C1 + C2: Fix audit_critical_update trigger ───────────────────────────
-- The function previously referenced OLD.total_premium/commission_amount/discount_amount
-- which don't exist on sp_payments. Split into two functions: one for orders, one for payments.
-- Also make them SECURITY DEFINER so the INSERT into sp_audit_log (service-role-only) succeeds.

-- Drop old function (was attached to both sp_policy_orders and sp_payments)
DROP TRIGGER IF EXISTS trg_audit_critical_update ON public.sp_policy_orders;
DROP TRIGGER IF EXISTS trg_audit_critical_update ON public.sp_payments;
DROP FUNCTION IF EXISTS public.audit_critical_update();

-- New: audit_policy_order_update (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.audit_policy_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.total_premium IS DISTINCT FROM NEW.total_premium OR
    OLD.commission_amount IS DISTINCT FROM NEW.commission_amount OR
    OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR
    OLD.agent_id IS DISTINCT FROM NEW.agent_id OR
    OLD.insurer_id IS DISTINCT FROM NEW.insurer_id OR
    OLD.policy_document_url IS DISTINCT FROM NEW.policy_document_url OR
    OLD.policy_number IS DISTINCT FROM NEW.policy_number OR
    OLD.sum_insured IS DISTINCT FROM NEW.sum_insured
  ) THEN
    INSERT INTO public.sp_audit_log (table_name, record_id, action, old_values, new_values, actor_id, actor_email)
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      jsonb_build_object(
        'status', OLD.status,
        'total_premium', OLD.total_premium,
        'commission_amount', OLD.commission_amount,
        'discount_amount', OLD.discount_amount,
        'agent_id', OLD.agent_id,
        'insurer_id', OLD.insurer_id,
        'policy_number', OLD.policy_number,
        'sum_insured', OLD.sum_insured
      ),
      jsonb_build_object(
        'status', NEW.status,
        'total_premium', NEW.total_premium,
        'commission_amount', NEW.commission_amount,
        'discount_amount', NEW.discount_amount,
        'agent_id', NEW.agent_id,
        'insurer_id', NEW.insurer_id,
        'policy_number', NEW.policy_number,
        'sum_insured', NEW.sum_insured
      ),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_policy_order_update
  AFTER UPDATE ON public.sp_policy_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_policy_order_update();

-- New: audit_payment_update (SECURITY DEFINER) — only references payment columns
CREATE OR REPLACE FUNCTION public.audit_payment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.amount IS DISTINCT FROM NEW.amount OR
    OLD.paid_amount IS DISTINCT FROM NEW.paid_amount
  ) THEN
    INSERT INTO public.sp_audit_log (table_name, record_id, action, old_values, new_values, actor_id, actor_email)
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      jsonb_build_object('status', OLD.status, 'amount', OLD.amount, 'paid_amount', OLD.paid_amount),
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'paid_amount', NEW.paid_amount),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_payment_update
  AFTER UPDATE ON public.sp_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payment_update();

-- ─── C3 + C4: Add missing FK constraints ──────────────────────────────────
-- Use ON DELETE SET NULL for optional references (commission.policy_id → order),
-- ON DELETE CASCADE for child-of relationships (payments → orders).
-- All wrapped in DO blocks with IF NOT EXISTS checks for idempotency.

DO $$ BEGIN
  -- C3: sp_policy_orders.insurer_review_token_id → sp_review_tokens(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_policy_orders_review_token_fk'
  ) THEN
    ALTER TABLE public.sp_policy_orders
      ADD CONSTRAINT sp_policy_orders_review_token_fk
      FOREIGN KEY (insurer_review_token_id) REFERENCES public.sp_review_tokens(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_commissions.policy_id → sp_policy_orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_commissions_policy_fk'
  ) THEN
    ALTER TABLE public.sp_commissions
      ADD CONSTRAINT sp_commissions_policy_fk
      FOREIGN KEY (policy_id) REFERENCES public.sp_policy_orders(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_commissions.order_id → sp_policy_orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_commissions_order_fk'
  ) THEN
    ALTER TABLE public.sp_commissions
      ADD CONSTRAINT sp_commissions_order_fk
      FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_commissions.agent_id → sp_users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_commissions_agent_fk'
  ) THEN
    ALTER TABLE public.sp_commissions
      ADD CONSTRAINT sp_commissions_agent_fk
      FOREIGN KEY (agent_id) REFERENCES public.sp_users(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_claims.policy_id → sp_policy_orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_claims_policy_fk'
  ) THEN
    ALTER TABLE public.sp_claims
      ADD CONSTRAINT sp_claims_policy_fk
      FOREIGN KEY (policy_id) REFERENCES public.sp_policy_orders(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_claims.user_id → sp_users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_claims_user_fk'
  ) THEN
    ALTER TABLE public.sp_claims
      ADD CONSTRAINT sp_claims_user_fk
      FOREIGN KEY (user_id) REFERENCES public.sp_users(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_claims.agent_id → sp_users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_claims_agent_fk'
  ) THEN
    ALTER TABLE public.sp_claims
      ADD CONSTRAINT sp_claims_agent_fk
      FOREIGN KEY (agent_id) REFERENCES public.sp_users(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_payments.order_id → sp_policy_orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_payments_order_fk'
  ) THEN
    ALTER TABLE public.sp_payments
      ADD CONSTRAINT sp_payments_order_fk
      FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_review_tokens.order_id → sp_policy_orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_review_tokens_order_fk'
  ) THEN
    ALTER TABLE public.sp_review_tokens
      ADD CONSTRAINT sp_review_tokens_order_fk
      FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_notifications.agent_id → sp_users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_notifications_agent_fk'
  ) THEN
    ALTER TABLE public.sp_notifications
      ADD CONSTRAINT sp_notifications_agent_fk
      FOREIGN KEY (agent_id) REFERENCES public.sp_users(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  -- sp_withdrawals.agent_id → sp_users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_withdrawals_agent_fk'
  ) THEN
    ALTER TABLE public.sp_withdrawals
      ADD CONSTRAINT sp_withdrawals_agent_fk
      FOREIGN KEY (agent_id) REFERENCES public.sp_users(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── C8: Drop overly-permissive sp_policy_orders_agent_update ──────────────
-- This policy allowed agents to UPDATE status, total_premium, commission_amount,
-- discount_amount on their own orders — privilege escalation / fraud risk.
-- All order updates must go through the data-gateway (service_role) now.
DO $$ BEGIN
  DROP POLICY IF EXISTS sp_policy_orders_agent_update ON public.sp_policy_orders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── C9: Drop sp_commissions_agent_insert (self-credit fraud) ──────────────
-- Any agent could INSERT a commission row crediting themselves.
-- Commissions are only created via admin_create_commission gateway action (service_role).
DO $$ BEGIN
  DROP POLICY IF EXISTS sp_commissions_agent_insert ON public.sp_commissions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Also drop the agent UPDATE policy on sp_policies (same column-escalation risk)
DO $$ BEGIN
  DROP POLICY IF EXISTS sp_policies_agent_update ON public.sp_policies;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── W4: Add missing indexes for common query patterns ────────────────────
-- These indexes target the highest-frequency queries identified in the audit.

CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_agent_status_created
  ON public.sp_policy_orders(agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_commissions_agent_status
  ON public.sp_commissions(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_sp_claims_user_created
  ON public.sp_claims(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_claims_agent_created
  ON public.sp_claims(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_notifications_agent_unread
  ON public.sp_notifications(agent_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_sp_withdrawals_status_created
  ON public.sp_withdrawals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_payments_order
  ON public.sp_payments(order_id);

CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_client
  ON public.sp_policy_orders(client_id);

CREATE INDEX IF NOT EXISTS idx_sp_users_upline
  ON public.sp_users(upline_id)
  WHERE upline_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sp_users_role_verified
  ON public.sp_users(role, verified)
  WHERE verified = false;

-- ─── W6: CHECK constraint on sp_claims ────────────────────────────────────
-- At least one of (policy_id, user_id, agent_id) must be non-NULL,
-- otherwise the claim is invisible to everyone (including the submitter).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_claims_has_identifier_check'
  ) THEN
    ALTER TABLE public.sp_claims
      ADD CONSTRAINT sp_claims_has_identifier_check
      CHECK (policy_id IS NOT NULL OR user_id IS NOT NULL OR agent_id IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── W11: set_updated_at trigger function + apply to key tables ───────────
-- Auto-update updated_at on every UPDATE so direct Dashboard edits don't leave it stale.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to tables that have updated_at column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_policy_orders_updated_at') THEN
    CREATE TRIGGER trg_sp_policy_orders_updated_at
      BEFORE UPDATE ON public.sp_policy_orders
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_commissions_updated_at') THEN
    CREATE TRIGGER trg_sp_commissions_updated_at
      BEFORE UPDATE ON public.sp_commissions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_claims_updated_at') THEN
    CREATE TRIGGER trg_sp_claims_updated_at
      BEFORE UPDATE ON public.sp_claims
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_withdrawals_updated_at') THEN
    CREATE TRIGGER trg_sp_withdrawals_updated_at
      BEFORE UPDATE ON public.sp_withdrawals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_users_updated_at') THEN
    CREATE TRIGGER trg_sp_users_updated_at
      BEFORE UPDATE ON public.sp_users
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── W12: CHECK constraints for status enums + positive amounts ───────────
-- Defense-in-depth: even if app-level validation fails, DB rejects invalid values.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_policy_orders_status_check'
  ) THEN
    ALTER TABLE public.sp_policy_orders
      ADD CONSTRAINT sp_policy_orders_status_check
      CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','ISSUED','REJECTED','CANCELLED'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_commissions_status_check'
  ) THEN
    ALTER TABLE public.sp_commissions
      ADD CONSTRAINT sp_commissions_status_check
      CHECK (status IN ('PENDING','PAID','CANCELLED'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_policy_orders_total_premium_check'
  ) THEN
    ALTER TABLE public.sp_policy_orders
      ADD CONSTRAINT sp_policy_orders_total_premium_check
      CHECK (total_premium >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_commissions_amount_check'
  ) THEN
    ALTER TABLE public.sp_commissions
      ADD CONSTRAINT sp_commissions_amount_check
      CHECK (commission_amount >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sp_withdrawals_amount_check'
  ) THEN
    ALTER TABLE public.sp_withdrawals
      ADD CONSTRAINT sp_withdrawals_amount_check
      CHECK (amount > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── Done ──────────────────────────────────────────────────────────────────
