-- ═══════════════════════════════════════════════════════════════════════════
-- Tighten sp_users RLS: drop the "always-true" open policy and replace with
-- self-only access for authenticated users. Admin reads/writes go through
-- the data-gateway edge function (service_role, bypasses RLS).
--
-- PREREQUISITE: deploy the data-gateway with admin_list_users, admin_update_user,
--   admin_register_agent actions, AND confirm supabaseService.ts getAllAgents(),
--   updateAgentVerification(), etc. are routed through callGateway().
--
-- APPLY: run this migration AFTER confirming the gateway cutover works in prod.
-- ROLLBACK: re-create the open policy:
--   CREATE POLICY "sp_users_open" ON public.sp_users FOR ALL USING(true);
-- ═══════════════════════════════════════════════════════════════════════════

-- Authenticated users can SELECT their own row (by Supabase Auth UID).
CREATE POLICY "sp_users_self_select"
  ON public.sp_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can UPDATE their own row (safe fields only enforced
-- at the application layer in supabaseService.ts — gateway enforces for admins).
CREATE POLICY "sp_users_self_update"
  ON public.sp_users FOR UPDATE
  TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Authenticated users can INSERT their own row (profile creation after OAuth/
-- magic-link). The id must equal their Supabase Auth UID.
CREATE POLICY "sp_users_self_insert"
  ON public.sp_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── Drop the permissive open policy ─────────────────────────────────────────
-- Uncomment after confirming the gateway + self-* policies work in production:
-- DROP POLICY IF EXISTS "sp_users_open" ON public.sp_users;
