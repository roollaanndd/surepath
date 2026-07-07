-- ═══════════════════════════════════════════════════════════════════════════
-- 20260707_rate_limiting.sql — Rate limiting infrastructure for data-gateway.
--
-- Creates sp_rate_limits table to track request counts per identifier
-- (insurer_id, IP address, or user_id). The gateway checks this table
-- before processing public actions and rejects if limit exceeded.
--
-- Limits:
--   - Per insurer: 200 requests per hour (dashboard + payments + decisions)
--   - Per IP (for public review page): 60 requests per hour
--   - Per user (JWT-authed): 500 requests per hour
--
-- The gateway inserts/updates a row per hour window. Old rows are
-- cleaned up by the reminder cron (or manually).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_rate_limits (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier    text         NOT NULL,      -- insurer_id | ip:xxx | user:xxx
  action        text         NOT NULL,      -- gateway action name
  hour_bucket   text         NOT NULL,      -- 'YYYY-MM-DD-HH' (1-hour window)
  request_count integer      NOT NULL DEFAULT 1,
  last_request  timestamptz  NOT NULL DEFAULT now(),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT sp_rate_limits_unique UNIQUE (identifier, action, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_sp_rate_limits_identifier
  ON public.sp_rate_limits(identifier, hour_bucket);

CREATE INDEX IF NOT EXISTS idx_sp_rate_limits_hour_bucket
  ON public.sp_rate_limits(hour_bucket);

-- RLS: deny all to anon/authenticated — only service_role can read/write
ALTER TABLE public.sp_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_rate_limits_service_all" ON public.sp_rate_limits;
CREATE POLICY "sp_rate_limits_service_all" ON public.sp_rate_limits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- sp_insurer_api_configs — API integration config for each insurer.
-- Used by submit-policy-insurer edge function to push orders to insurer APIs.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_insurer_api_configs (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id    uuid         NOT NULL REFERENCES public.sp_insurers(id) ON DELETE CASCADE,
  endpoint_url  text         NOT NULL,
  api_key       text,                          -- encrypted in app layer
  webhook_secret text,                         -- for verifying insurer callbacks
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT sp_insurer_api_configs_unique_insurer UNIQUE (insurer_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_insurer_api_configs_insurer
  ON public.sp_insurer_api_configs(insurer_id);

ALTER TABLE public.sp_insurer_api_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_insurer_api_configs_service_all" ON public.sp_insurer_api_configs;
CREATE POLICY "sp_insurer_api_configs_service_all" ON public.sp_insurer_api_configs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- sp_insurer_activity_log — Audit trail of all insurer actions.
-- Every insurer decision, policy upload, token use is logged here.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_insurer_activity_log (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id    uuid         REFERENCES public.sp_insurers(id) ON DELETE CASCADE,
  order_id      uuid         REFERENCES public.sp_policy_orders(id) ON DELETE CASCADE,
  action        text         NOT NULL,      -- 'REVIEW_OPENED' | 'DECISION_SUBMITTED' | 'POLICY_UPLOADED' | 'TOKEN_GENERATED' | 'TOKEN_REVOKED' | 'DASHBOARD_VIEWED'
  details       jsonb,                       -- { action: 'APPROVED', notes: '...', ip: '...', user_agent: '...' }
  ip_address    text,
  user_agent    text,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_insurer_activity_log_insurer
  ON public.sp_insurer_activity_log(insurer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_insurer_activity_log_order
  ON public.sp_insurer_activity_log(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sp_insurer_activity_log_action
  ON public.sp_insurer_activity_log(action, created_at DESC);

ALTER TABLE public.sp_insurer_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_insurer_activity_log_service_all" ON public.sp_insurer_activity_log;
CREATE POLICY "sp_insurer_activity_log_service_all" ON public.sp_insurer_activity_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add to realtime publication for live activity feed
DO $$
DECLARE t text;
BEGIN
  BEGIN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_insurer_activity_log;');
  EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN others THEN NULL;
  END;
END $$;
