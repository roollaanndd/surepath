-- ═══════════════════════════════════════════════════════════════════════════
-- sp_withdrawals RLS: agents see/create only their own withdrawal requests.
-- Admin approval goes through the data-gateway (service_role).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.sp_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_withdrawals_open"    ON public.sp_withdrawals;
DROP POLICY IF EXISTS "anon_all_withdrawals"   ON public.sp_withdrawals;

CREATE POLICY "sp_withdrawals_agent_select"
  ON public.sp_withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "sp_withdrawals_agent_insert"
  ON public.sp_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- UPDATE allowed for CANCELLATION only — agent can cancel their own PENDING_L1 request.
CREATE POLICY "sp_withdrawals_agent_cancel"
  ON public.sp_withdrawals FOR UPDATE
  TO authenticated
  USING  (auth.uid() = agent_id AND status = 'PENDING_L1')
  WITH CHECK (auth.uid() = agent_id AND status = 'CANCELLED');

-- Admin approval/rejection goes through data-gateway (service_role).
