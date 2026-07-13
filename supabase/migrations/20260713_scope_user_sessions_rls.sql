-- ═══════════════════════════════════════════════════════════════════════════
-- Scope sp_user_sessions RLS to the owning user.
--
-- Previous policy "sp_user_sessions_authenticated" was `USING(true)/WITH
-- CHECK(true)` for ALL commands — any logged-in user could read or overwrite
-- any other user's session row (last_seen, role) via the anon-keyed browser
-- client. That's more exposure than intended for what's meant to be a
-- self-heartbeat table.
--
-- getOnlineUsers() (services/website.ts) is a legitimate exception: it's an
-- admin-only dashboard widget (AdminPortal.tsx) that reads presence across
-- ALL users via the same anon-keyed client (not the service-role gateway),
-- so the SELECT policy allows is_admin() in addition to own-row access
-- rather than being scoped to auth.uid() only.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sp_user_sessions_authenticated" ON public.sp_user_sessions;

DROP POLICY IF EXISTS "sp_user_sessions_select_own_or_admin" ON public.sp_user_sessions;
CREATE POLICY "sp_user_sessions_select_own_or_admin"
  ON public.sp_user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "sp_user_sessions_insert_own" ON public.sp_user_sessions;
CREATE POLICY "sp_user_sessions_insert_own"
  ON public.sp_user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "sp_user_sessions_update_own" ON public.sp_user_sessions;
CREATE POLICY "sp_user_sessions_update_own"
  ON public.sp_user_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "sp_user_sessions_service_all" ON public.sp_user_sessions;
CREATE POLICY "sp_user_sessions_service_all"
  ON public.sp_user_sessions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
