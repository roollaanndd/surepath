-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening: C2 + C1 open-policy completion + L4 + storage
--
-- Safe to apply: all direct-client reads/writes in supabaseService.ts are
-- already agent-scoped (eq agent_id). Admin operations go through the
-- data-gateway (service_role). Applying these removes the residual open
-- policies left as safety guards in earlier migration stubs.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── C2: Revoke public EXECUTE on increment_coins_balance ─────────────────────
-- Only the data-gateway (service_role, which bypasses REVOKE) should call
-- this function. Allowing authenticated/anon to call it directly lets any
-- logged-in user mint or burn coins without going through the gateway's
-- balance-check logic.
REVOKE EXECUTE ON FUNCTION public.increment_coins_balance FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coins_balance FROM anon;

-- ── C1 completion: drop remaining open policies ──────────────────────────────
-- These were left commented out in the earlier tighten_* stubs pending
-- production confirmation. The scoped self-* / agent-* replacement policies
-- are already live from those migrations.

-- sp_users: self-only policies are already in place (tighten_sp_users_rls).
DROP POLICY IF EXISTS "sp_users_open"          ON public.sp_users;
DROP POLICY IF EXISTS "allow_all_sp_users"     ON public.sp_users;
DROP POLICY IF EXISTS "anon_all_sp_users"      ON public.sp_users;

-- sp_clients: agent-scoped policies are already in place (tighten_sp_clients_rls).
DROP POLICY IF EXISTS "sp_clients_open"        ON public.sp_clients;
DROP POLICY IF EXISTS "allow_all_sp_clients"   ON public.sp_clients;
DROP POLICY IF EXISTS "anon_all_sp_clients"    ON public.sp_clients;

-- sp_commissions: agent-scoped policies in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "sp_commissions_open"    ON public.sp_commissions;
DROP POLICY IF EXISTS "allow_all_commissions"  ON public.sp_commissions;

-- sp_policies: agent-scoped policies in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "sp_policies_open"       ON public.sp_policies;
DROP POLICY IF EXISTS "allow_all_policies"     ON public.sp_policies;

-- sp_policy_orders: agent-scoped policies in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "anon_all_policy_orders" ON public.sp_policy_orders;
DROP POLICY IF EXISTS "sp_policy_orders_open"  ON public.sp_policy_orders;

-- sp_claims: agent-scoped policies in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "sp_claims_open"         ON public.sp_claims;
DROP POLICY IF EXISTS "allow_all_claims"       ON public.sp_claims;

-- sp_payments: agent-scoped policies in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "anon_all_payments"      ON public.sp_payments;
DROP POLICY IF EXISTS "sp_payments_open"       ON public.sp_payments;

-- sp_coin_ledger: agent SELECT policy in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "open_coin_ledger"       ON public.sp_coin_ledger;
DROP POLICY IF EXISTS "anon_all_coin_ledger"   ON public.sp_coin_ledger;

-- sp_transactions: agent-scoped policy in place (tighten_tier2_rls).
DROP POLICY IF EXISTS "sp_transactions_open"   ON public.sp_transactions;
DROP POLICY IF EXISTS "anon_all_transactions"  ON public.sp_transactions;

-- sp_withdrawals: agent-scoped policies in place (tighten_withdrawals_rls).
DROP POLICY IF EXISTS "sp_withdrawals_open"    ON public.sp_withdrawals;
DROP POLICY IF EXISTS "anon_all_withdrawals"   ON public.sp_withdrawals;

-- sp_notifications: agent-scoped policies in place (tighten_tier3_rls).
DROP POLICY IF EXISTS "anon_all_notifications" ON public.sp_notifications;

-- sp_quotes: public-insert + agent-scoped policies in place (tighten_tier3_rls).
DROP POLICY IF EXISTS "sp_quotes_open"         ON public.sp_quotes;
DROP POLICY IF EXISTS "anon_all_quotes"        ON public.sp_quotes;

-- sp_product_configs: public SELECT + admin write-only via gateway (tighten_tier3_rls).
DROP POLICY IF EXISTS "sp_product_configs_open" ON public.sp_product_configs;
DROP POLICY IF EXISTS "anon_all_product_configs" ON public.sp_product_configs;

-- sp_user_sessions: self-only policies in place (tighten_tier3_rls).
DROP POLICY IF EXISTS "allow all"              ON public.sp_user_sessions;

-- sp_admin_notifications: no anon/authenticated policies — service_role only.
DROP POLICY IF EXISTS "admins_manage_admin_notifications" ON public.sp_admin_notifications;

-- sp_review_tokens: admin-only; ensure no open policy remains.
DROP POLICY IF EXISTS "admins_manage_tokens"   ON public.sp_review_tokens;

-- sp_insurer_auth_tokens: tighten (service_role writes via gateway).
DROP POLICY IF EXISTS "insurer_auth_tokens_insert"         ON public.sp_insurer_auth_tokens;
DROP POLICY IF EXISTS "insurer_auth_tokens_update_used_at" ON public.sp_insurer_auth_tokens;

-- ── L4: sp_coin_ledger — no direct INSERT/UPDATE/DELETE for agents ───────────
-- Writes to the coin ledger must go through the data-gateway (award_coins /
-- redeem_coins actions), which validates balance and writes via service_role.
-- The agent SELECT policy stays in place so agents can view their ledger.
DROP POLICY IF EXISTS "sp_coin_ledger_agent_insert" ON public.sp_coin_ledger;
DROP POLICY IF EXISTS "sp_coin_ledger_agent_update" ON public.sp_coin_ledger;
DROP POLICY IF EXISTS "sp_coin_ledger_agent_delete" ON public.sp_coin_ledger;

-- Confirm: no INSERT/UPDATE/DELETE policy for authenticated on sp_coin_ledger.
-- Reads remain allowed via the sp_coin_ledger_agent_select policy.

-- ── sp_wallet_transactions (append-only) ─────────────────────────────────────
-- Wallet mutation is SECURITY DEFINER only. Remove any stray UPDATE/DELETE.
ALTER TABLE IF EXISTS public.sp_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_wallet_transactions_open"    ON public.sp_wallet_transactions;
DROP POLICY IF EXISTS "anon_all_wallet_transactions"   ON public.sp_wallet_transactions;
DROP POLICY IF EXISTS "sp_wallet_transactions_update"  ON public.sp_wallet_transactions;
DROP POLICY IF EXISTS "sp_wallet_transactions_delete"  ON public.sp_wallet_transactions;

-- Agents can read their own wallet transaction history.
CREATE POLICY "sp_wallet_transactions_agent_select"
  ON public.sp_wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

-- ── Storage: media bucket — authenticated uploads, signed-URL downloads ──────
-- Remove the broad public SELECT policy on the media bucket objects.
-- Files are accessed via time-limited signed URLs generated server-side.
DELETE FROM storage.policies
WHERE bucket_id = 'media'
  AND (definition::text ILIKE '%USING (true)%' OR definition::text ILIKE '%using (true)%')
  AND operation IN ('SELECT', 'ALL');
