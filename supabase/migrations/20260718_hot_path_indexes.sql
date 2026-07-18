-- ═══════════════════════════════════════════════════════════════════════════
-- Hot-path covering indexes (load-readiness pass, v1.52.0)
--
-- Sourced from Supabase performance advisors (unindexed_foreign_keys):
-- indexes only the FKs that sit on request-per-session query paths —
-- get_my_orders (client_id), notification polling (agent_id), claims,
-- wallet ledger reads, withdrawal queues, downline lookups, quote history.
-- Cold audit-trail FKs (approver ids, created_by) are intentionally skipped.
--
-- Also drops the duplicate index flagged on sp_agent_agreements.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_client_id   ON public.sp_policy_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_sp_policy_orders_insurer_id  ON public.sp_policy_orders (insurer_id);
CREATE INDEX IF NOT EXISTS idx_sp_notifications_agent_id    ON public.sp_notifications (agent_id);
CREATE INDEX IF NOT EXISTS idx_sp_claims_user_id            ON public.sp_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_sp_claims_policy_id          ON public.sp_claims (policy_id);
CREATE INDEX IF NOT EXISTS idx_sp_wallet_transactions_agent ON public.sp_wallet_transactions (agent_id);
CREATE INDEX IF NOT EXISTS idx_sp_withdrawals_agent_id      ON public.sp_withdrawals (agent_id);
CREATE INDEX IF NOT EXISTS idx_sp_commissions_policy_id     ON public.sp_commissions (policy_id);
CREATE INDEX IF NOT EXISTS idx_sp_users_upline_id           ON public.sp_users (upline_id);
CREATE INDEX IF NOT EXISTS idx_sp_quotes_client_id          ON public.sp_quotes (client_id);
CREATE INDEX IF NOT EXISTS idx_sp_policies_user_id          ON public.sp_policies (user_id);

-- Duplicate of idx_sp_agent_agreements_agent_id (advisor: duplicate_index)
DROP INDEX IF EXISTS public.idx_agent_agreements_agent;
