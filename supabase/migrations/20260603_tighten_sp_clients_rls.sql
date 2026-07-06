-- ═══════════════════════════════════════════════════════════════════════════
-- Tighten sp_clients RLS: agents can only access their own clients.
-- Admin reads go through the data-gateway (admin_list_clients action).
--
-- PREREQUISITE: confirm supabaseService.ts getAgentClients() still works
--   (it already uses auth.uid() via agent_id match) and admin panel uses
--   callGateway('admin_list_clients') instead of direct queries.
--
-- APPLY after confirming in production.
-- ROLLBACK: DROP the new policies, re-create "sp_clients_open".
-- ═══════════════════════════════════════════════════════════════════════════

-- Agents read their own clients only.
CREATE POLICY "sp_clients_agent_select"
  ON public.sp_clients FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

-- Agents insert clients that belong to themselves.
CREATE POLICY "sp_clients_agent_insert"
  ON public.sp_clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- Agents update their own clients only.
CREATE POLICY "sp_clients_agent_update"
  ON public.sp_clients FOR UPDATE
  TO authenticated
  USING  (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Agents delete their own clients only.
CREATE POLICY "sp_clients_agent_delete"
  ON public.sp_clients FOR DELETE
  TO authenticated
  USING (auth.uid() = agent_id);

-- ── Drop the permissive open policy ─────────────────────────────────────────
-- Uncomment after confirming agent portal still works in production:
-- DROP POLICY IF EXISTS "sp_clients_open" ON public.sp_clients;
