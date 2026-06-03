-- ═══════════════════════════════════════════════════════════════════════════
-- Tier 2 RLS tightening: financial / business tables.
--
-- For each table:
--   • Enable RLS (idempotent).
--   • Drop the old permissive open policy (may not exist yet — safe to run).
--   • Add agent-scoped policies so agents see only their own rows.
--   • Admin reads/writes go through data-gateway (service_role bypasses RLS).
--
-- APPLY per-table after confirming the client (AgentPortal + AdminPortal)
-- is fully routed through the gateway for that table.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── sp_commissions ───────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_commissions_open"    ON public.sp_commissions;
DROP POLICY IF EXISTS "anon_all_commissions"   ON public.sp_commissions;

CREATE POLICY "sp_commissions_agent_select"
  ON public.sp_commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_commissions_agent_insert"
  ON public.sp_commissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_policies ──────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_policies_open"    ON public.sp_policies;
DROP POLICY IF EXISTS "anon_all_policies"   ON public.sp_policies;

CREATE POLICY "sp_policies_agent_select"
  ON public.sp_policies FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_policies_agent_insert"
  ON public.sp_policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "sp_policies_agent_update"
  ON public.sp_policies FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_policy_orders ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_policy_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_policy_orders"   ON public.sp_policy_orders;
DROP POLICY IF EXISTS "sp_policy_orders_open"    ON public.sp_policy_orders;

CREATE POLICY "sp_policy_orders_agent_select"
  ON public.sp_policy_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_policy_orders_agent_insert"
  ON public.sp_policy_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "sp_policy_orders_agent_update"
  ON public.sp_policy_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_claims ────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_claims_open"    ON public.sp_claims;
DROP POLICY IF EXISTS "anon_all_claims"   ON public.sp_claims;

CREATE POLICY "sp_claims_agent_select"
  ON public.sp_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_claims_agent_insert"
  ON public.sp_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_payments ──────────────────────────────────────────────────────────────
-- Payments belong to orders; agents see payments for their own orders.
ALTER TABLE IF EXISTS public.sp_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_payments"   ON public.sp_payments;
DROP POLICY IF EXISTS "sp_payments_open"    ON public.sp_payments;

CREATE POLICY "sp_payments_agent_select"
  ON public.sp_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_policy_orders o
      WHERE o.id = sp_payments.order_id
        AND o.agent_id = auth.uid()
    )
  );

-- INSERT is handled by the Xendit webhook (service_role) — no agent INSERT policy.

-- ── sp_coin_ledger ───────────────────────────────────────────────────────────
-- Agents can read their own ledger; writes are service_role only (SECURITY DEFINER funcs).
ALTER TABLE IF EXISTS public.sp_coin_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_coin_ledger"        ON public.sp_coin_ledger;
DROP POLICY IF EXISTS "anon_all_coin_ledger"    ON public.sp_coin_ledger;

CREATE POLICY "sp_coin_ledger_agent_select"
  ON public.sp_coin_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

-- ── sp_transactions ──────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_transactions_open"   ON public.sp_transactions;
DROP POLICY IF EXISTS "anon_all_transactions"  ON public.sp_transactions;

CREATE POLICY "sp_transactions_agent_select"
  ON public.sp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);
