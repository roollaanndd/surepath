-- ═══════════════════════════════════════════════════════════════════════════
-- Tier 3 RLS: workflow / notification / config tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── sp_notifications ─────────────────────────────────────────────────────────
-- Agents read/dismiss their own notifications. Service_role inserts.
ALTER TABLE IF EXISTS public.sp_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_notifications" ON public.sp_notifications;

CREATE POLICY "sp_notifications_agent_select"
  ON public.sp_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_notifications_agent_update"
  ON public.sp_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "sp_notifications_agent_insert"
  ON public.sp_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_admin_notifications ───────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_manage_admin_notifications" ON public.sp_admin_notifications;

-- Admin notifications are read/written via gateway (service_role).
-- No explicit authenticated policy — access only through service_role.

-- ── sp_quotes ────────────────────────────────────────────────────────────────
-- Anon INSERT allowed (public "get a quote" flow). Agents read their own.
ALTER TABLE IF EXISTS public.sp_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_quotes_open" ON public.sp_quotes;
DROP POLICY IF EXISTS "anon_all_quotes" ON public.sp_quotes;

-- Public can insert a quote (unauthenticated quote request)
CREATE POLICY "sp_quotes_anon_insert"
  ON public.sp_quotes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "sp_quotes_agent_select"
  ON public.sp_quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_quotes_agent_insert"
  ON public.sp_quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "sp_quotes_agent_update"
  ON public.sp_quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- ── sp_product_configs ───────────────────────────────────────────────────────
-- Public read (pricing calculator); writes admin-only via gateway.
ALTER TABLE IF EXISTS public.sp_product_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_product_configs_open" ON public.sp_product_configs;
DROP POLICY IF EXISTS "anon_all_product_configs" ON public.sp_product_configs;

-- Anyone (including anon) can read product configs for the public calculator.
CREATE POLICY "sp_product_configs_public_select"
  ON public.sp_product_configs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins (via service_role gateway) can write product configs.
-- No authenticated INSERT/UPDATE policy — writes go through service_role.

-- ── sp_user_sessions ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sp_user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON public.sp_user_sessions;

CREATE POLICY "sp_user_sessions_self_select"
  ON public.sp_user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sp_user_sessions_self_insert"
  ON public.sp_user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sp_user_sessions_self_update"
  ON public.sp_user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
