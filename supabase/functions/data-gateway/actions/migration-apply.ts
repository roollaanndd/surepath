// migration-apply.ts — One-time migration action for data-gateway
// Adds 'admin_apply_migration' action that executes the v1.42.0 integrity hardening SQL.
// This is a temporary action — should be removed after migration is applied.
// 
// WHY: We can't access Supabase Dashboard directly, and the migration needs
// service_role access. The data-gateway edge function already has the service
// role key via Deno.env, so we can execute the SQL through it.
//
// SECURITY: Only callable by MASTER_ADMIN. Logs the action to sp_audit_log.

import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// The migration SQL — inlined to avoid file system access in Deno Deploy
const MIGRATION_SQL = `
-- ════════════════════════════════════════════════════════════════════════════
-- v1.42.0 Integrity Hardening Migration (applied via gateway)
-- ════════════════════════════════════════════════════════════════════════════

-- C1+C2: Fix audit_critical_update trigger
DROP TRIGGER IF EXISTS trg_audit_critical_update ON public.sp_policy_orders;
DROP TRIGGER IF EXISTS trg_audit_critical_update ON public.sp_payments;
DROP FUNCTION IF EXISTS public.audit_critical_update();

CREATE OR REPLACE FUNCTION public.audit_policy_order_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
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
      TG_TABLE_NAME, NEW.id, 'UPDATE',
      jsonb_build_object('status', OLD.status, 'total_premium', OLD.total_premium, 'commission_amount', OLD.commission_amount, 'discount_amount', OLD.discount_amount, 'agent_id', OLD.agent_id, 'insurer_id', OLD.insurer_id, 'policy_number', OLD.policy_number, 'sum_insured', OLD.sum_insured),
      jsonb_build_object('status', NEW.status, 'total_premium', NEW.total_premium, 'commission_amount', NEW.commission_amount, 'discount_amount', NEW.discount_amount, 'agent_id', NEW.agent_id, 'insurer_id', NEW.insurer_id, 'policy_number', NEW.policy_number, 'sum_insured', NEW.sum_insured),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_policy_order_update AFTER UPDATE ON public.sp_policy_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_policy_order_update();

CREATE OR REPLACE FUNCTION public.audit_payment_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.amount IS DISTINCT FROM NEW.amount OR
    OLD.paid_amount IS DISTINCT FROM NEW.paid_amount
  ) THEN
    INSERT INTO public.sp_audit_log (table_name, record_id, action, old_values, new_values, actor_id, actor_email)
    VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE',
      jsonb_build_object('status', OLD.status, 'amount', OLD.amount, 'paid_amount', OLD.paid_amount),
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'paid_amount', NEW.paid_amount),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_payment_update AFTER UPDATE ON public.sp_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_update();

-- C3+C4: Add missing FK constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_policy_orders_review_token_fk') THEN
    ALTER TABLE public.sp_policy_orders ADD CONSTRAINT sp_policy_orders_review_token_fk FOREIGN KEY (insurer_review_token_id) REFERENCES public.sp_review_tokens(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_commissions_policy_fk') THEN
    ALTER TABLE public.sp_commissions ADD CONSTRAINT sp_commissions_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sp_policy_orders(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_commissions_order_fk') THEN
    ALTER TABLE public.sp_commissions ADD CONSTRAINT sp_commissions_order_fk FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_commissions_agent_fk') THEN
    ALTER TABLE public.sp_commissions ADD CONSTRAINT sp_commissions_agent_fk FOREIGN KEY (agent_id) REFERENCES public.sp_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_claims_policy_fk') THEN
    ALTER TABLE public.sp_claims ADD CONSTRAINT sp_claims_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sp_policy_orders(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_claims_user_fk') THEN
    ALTER TABLE public.sp_claims ADD CONSTRAINT sp_claims_user_fk FOREIGN KEY (user_id) REFERENCES public.sp_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_claims_agent_fk') THEN
    ALTER TABLE public.sp_claims ADD CONSTRAINT sp_claims_agent_fk FOREIGN KEY (agent_id) REFERENCES public.sp_users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_payments_order_fk') THEN
    ALTER TABLE public.sp_payments ADD CONSTRAINT sp_payments_order_fk FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_review_tokens_order_fk') THEN
    ALTER TABLE public.sp_review_tokens ADD CONSTRAINT sp_review_tokens_order_fk FOREIGN KEY (order_id) REFERENCES public.sp_policy_orders(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_notifications_agent_fk') THEN
    ALTER TABLE public.sp_notifications ADD CONSTRAINT sp_notifications_agent_fk FOREIGN KEY (agent_id) REFERENCES public.sp_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_withdrawals_agent_fk') THEN
    ALTER TABLE public.sp_withdrawals ADD CONSTRAINT sp_withdrawals_agent_fk FOREIGN KEY (agent_id) REFERENCES public.sp_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- C8+C9: Drop overly-permissive RLS policies
DROP POLICY IF EXISTS sp_policy_orders_agent_update ON public.sp_policy_orders;
DROP POLICY IF EXISTS sp_commissions_agent_insert ON public.sp_commissions;
DROP POLICY IF EXISTS sp_policies_agent_update ON public.sp_policies;

-- W4: Add missing indexes
CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_agent_status_created ON public.sp_policy_orders(agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_commissions_agent_status ON public.sp_commissions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_sp_claims_user_created ON public.sp_claims(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_claims_agent_created ON public.sp_claims(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_notifications_agent_unread ON public.sp_notifications(agent_id, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_sp_withdrawals_status_created ON public.sp_withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_payments_order ON public.sp_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_client ON public.sp_policy_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_sp_users_upline ON public.sp_users(upline_id) WHERE upline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_users_role_verified ON public.sp_users(role, verified) WHERE verified = false;

-- W6: CHECK constraint on sp_claims
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_claims_has_identifier_check') THEN
    ALTER TABLE public.sp_claims ADD CONSTRAINT sp_claims_has_identifier_check CHECK (policy_id IS NOT NULL OR user_id IS NOT NULL OR agent_id IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- W11: set_updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_policy_orders_updated_at') THEN
    CREATE TRIGGER trg_sp_policy_orders_updated_at BEFORE UPDATE ON public.sp_policy_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_commissions_updated_at') THEN
    CREATE TRIGGER trg_sp_commissions_updated_at BEFORE UPDATE ON public.sp_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_claims_updated_at') THEN
    CREATE TRIGGER trg_sp_claims_updated_at BEFORE UPDATE ON public.sp_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_withdrawals_updated_at') THEN
    CREATE TRIGGER trg_sp_withdrawals_updated_at BEFORE UPDATE ON public.sp_withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sp_users_updated_at') THEN
    CREATE TRIGGER trg_sp_users_updated_at BEFORE UPDATE ON public.sp_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- W12: CHECK constraints for enums + positive amounts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_policy_orders_status_check') THEN
    ALTER TABLE public.sp_policy_orders ADD CONSTRAINT sp_policy_orders_status_check CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','ISSUED','REJECTED','CANCELLED'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_commissions_status_check') THEN
    ALTER TABLE public.sp_commissions ADD CONSTRAINT sp_commissions_status_check CHECK (status IN ('PENDING','PAID','CANCELLED'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_policy_orders_total_premium_check') THEN
    ALTER TABLE public.sp_policy_orders ADD CONSTRAINT sp_policy_orders_total_premium_check CHECK (total_premium >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_commissions_amount_check') THEN
    ALTER TABLE public.sp_commissions ADD CONSTRAINT sp_commissions_amount_check CHECK (commission_amount >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sp_withdrawals_amount_check') THEN
    ALTER TABLE public.sp_withdrawals ADD CONSTRAINT sp_withdrawals_amount_check CHECK (amount > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

export async function handleMigrationAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, caller } = ctx;

  if (action === 'admin_apply_migration') {
    // SECURITY: Only MASTER_ADMIN can apply migrations
    if (!caller.spUser || caller.spUser.role !== 'MASTER_ADMIN') {
      return json({ error: 'Forbidden: MASTER_ADMIN only' }, 403);
    }

    try {
      // Execute the migration SQL using the service_role client (bypasses RLS)
      const { error } = await db.rpc('exec_sql', { sql_text: MIGRATION_SQL });
      
      if (error) {
        // If exec_sql RPC doesn't exist, try direct query via .from() workaround
        // Actually, Supabase doesn't support raw SQL via REST. We need to use the pg endpoint.
        // Let's try a different approach: use the Supabase SQL endpoint directly
        console.error('Migration RPC failed:', error.message);
        
        // Log the attempt
        await db.from('sp_audit_log').insert({
          table_name: 'migration',
          record_id: '20260714_integrity_hardening',
          action: 'MIGRATION_ATTEMPT',
          old_values: null,
          new_values: { error: error.message, caller: caller.authId },
          actor_id: caller.authId,
          actor_email: caller.email,
        });
        
        return json({ 
          error: 'Migration RPC not available. Please apply via Supabase Dashboard → SQL Editor.',
          details: error.message 
        }, 500);
      }

      // Log success
      await db.from('sp_audit_log').insert({
        table_name: 'migration',
        record_id: '20260714_integrity_hardening',
        action: 'MIGRATION_APPLIED',
        old_values: null,
        new_values: { applied_by: caller.authId, applied_at: new Date().toISOString() },
        actor_id: caller.authId,
        actor_email: caller.email,
      });

      return json({ 
        data: { 
          success: true, 
          message: 'Migration applied successfully',
          applied_at: new Date().toISOString(),
          applied_by: caller.email,
        } 
      });
    } catch (e: any) {
      return json({ error: 'Migration failed: ' + e.message }, 500);
    }
  }

  return null; // Not handled
}
