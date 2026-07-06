-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening — Phase 2 (2026-07-06)
--
-- Closes gaps surfaced by the 2026-07-06 white-hat audit:
--   1. sp_website_config writable by ANY authenticated user (site defacement)
--   2. policy-documents INSERT allowed by any authenticated user (policy PDF
--      overwrite / substitution)
--   3. Wallet transactions + coin ledger lack unique constraints → webhook
--      replays can double-credit commission
--   4. sp_otp_codes lacks an attempts counter (brute-force protection) and a
--      created_by_ip column (per-IP rate limiting)
--   5. Need idempotency constraint on sp_wallet_transactions(reference_id,
--      reference_type) so credit_agent_wallet RPC can ON CONFLICT DO NOTHING
--
-- All statements use IF NOT EXISTS / idempotent patterns so this is safe to
-- run on the live DB.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. sp_website_config: restrict writes to admins only ───────────────────
-- Previously: FOR ALL TO authenticated USING (true) WITH CHECK (true)
--             → any logged-in customer could overwrite the marketing site.
DROP POLICY IF EXISTS "website_config_authenticated_write" ON public.sp_website_config;
DROP POLICY IF EXISTS "website_config_admin_write" ON public.sp_website_config;

CREATE POLICY "website_config_admin_write"
  ON public.sp_website_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Keep the existing public-read policy (already in place).

-- ── 2. policy-documents: INSERT admin-only; UPDATE/DELETE admin-only ──────
-- Previously: any authenticated user could INSERT (and overwrite via upsert)
--             any policy PDF.
DROP POLICY IF EXISTS "policy_docs_insert" ON storage.objects;

CREATE POLICY "policy_docs_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents' AND public.is_admin());

-- Add UPDATE/DELETE policies for admins (didn't exist before — admins had no
-- way to legally replace a policy PDF, which encouraged direct DB edits).
DROP POLICY IF EXISTS "policy_docs_admin_update" ON storage.objects;
CREATE POLICY "policy_docs_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'policy-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'policy-documents' AND public.is_admin());

DROP POLICY IF EXISTS "policy_docs_admin_delete" ON storage.objects;
CREATE POLICY "policy_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'policy-documents' AND public.is_admin());

-- ── 3. Idempotency constraints on wallet + coin ledger ────────────────────
-- Prevents the Xendit webhook from double-crediting commission on replay.
-- credit_agent_wallet RPC and direct sp_coin_ledger inserts will need to use
-- ON CONFLICT DO NOTHING (or the RPC will return an error on the second call,
-- which is the desired behavior).
ALTER TABLE public.sp_wallet_transactions
  DROP CONSTRAINT IF EXISTS sp_wallet_transactions_reference_unique;

ALTER TABLE public.sp_wallet_transactions
  ADD CONSTRAINT sp_wallet_transactions_reference_unique
  UNIQUE (reference_id, reference_type);

-- Coin ledger: one bonus per (agent_id, order_id, type)
ALTER TABLE public.sp_coin_ledger
  DROP CONSTRAINT IF EXISTS sp_coin_ledger_agent_order_type_unique;

ALTER TABLE public.sp_coin_ledger
  ADD CONSTRAINT sp_coin_ledger_agent_order_type_unique
  UNIQUE (agent_id, order_id, type);

-- ── 4. sp_otp_codes: add attempts counter + IP column ─────────────────────
-- attempts: incremented on each wrong-code verify-otp call; locks the code
--           after 5 wrong tries.
-- created_by_ip: per-IP rate limiting in send-otp (prevents SMS-bombing from
--                a single IP targeting many phone numbers).
ALTER TABLE public.sp_otp_codes
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.sp_otp_codes
  ADD COLUMN IF NOT EXISTS created_by_ip text;

-- Index for the per-IP rate-limit query
CREATE INDEX IF NOT EXISTS idx_sp_otp_codes_created_by_ip_created_at
  ON public.sp_otp_codes (created_by_ip, created_at);

-- ── 5. Add admin role escalation guard documentation ──────────────────────
-- (No schema change needed — the guard is implemented in data-gateway
--  admin_update_user action. This comment documents the intended matrix.)
--
-- Allowed role transitions:
--   MASTER_ADMIN → can set any role
--   ADMIN        → can set CUSTOMER, AGENT, B2B_CLIENT, INSURANCE_ADMIN,
--                  FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR
--                  (CANNOT set ADMIN or MASTER_ADMIN)
--   FINANCE_MANAGER → can set tier/commission_rate only (no role changes)
--   INSURANCE_ADMIN, FINANCE, FINANCE_DIRECTOR → cannot change roles
--
-- Self-escalation is always blocked (params.user_id === caller.id with role change).
