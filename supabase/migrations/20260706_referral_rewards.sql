-- ═══════════════════════════════════════════════════════════════════════════
-- Referral Rewards — double-sided reward system for customer referrals
--
-- When a customer refers a friend (via ?ref=CODE link), and the friend's
-- first policy order reaches PAID status, both sides get a reward:
--   - Referrer: Rp 25,000 discount token for their next renewal
--   - Referee (new customer): Rp 25,000 cashback / discount on a future order
--
-- This table tracks the reward lifecycle: PENDING → ISSUED → REDEEMED
-- One reward per (referrer_id, referee_id) pair — prevents double-crediting
-- on webhook replays.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_referral_rewards (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id        uuid         REFERENCES public.sp_policy_orders(id) ON DELETE SET NULL,
  reward_type     text         NOT NULL DEFAULT 'DISCOUNT_TOKEN'
                                 CHECK (reward_type IN ('DISCOUNT_TOKEN', 'CASHBACK', 'COIN')),
  reward_amount   numeric      NOT NULL DEFAULT 25000,
  status          text         NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'ISSUED', 'REDEEMED', 'EXPIRED')),
  issued_at       timestamptz,
  redeemed_at     timestamptz,
  expires_at      timestamptz  NOT NULL DEFAULT (now() + interval '180 days'),
  notes           text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  -- One reward per (referrer, referee) pair — prevents duplicate crediting
  CONSTRAINT sp_referral_rewards_unique_pair UNIQUE (referrer_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_referral_rewards_referrer
  ON public.sp_referral_rewards (referrer_id);
CREATE INDEX IF NOT EXISTS idx_sp_referral_rewards_referee
  ON public.sp_referral_rewards (referee_id);
CREATE INDEX IF NOT EXISTS idx_sp_referral_rewards_status
  ON public.sp_referral_rewards (status);

ALTER TABLE public.sp_referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can see their own rewards (as referrer OR referee)
CREATE POLICY "sp_referral_rewards_select_own"
  ON public.sp_referral_rewards
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

-- Service role (data-gateway + xendit-webhook) can do everything
CREATE POLICY "sp_referral_rewards_service_all"
  ON public.sp_referral_rewards
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can view all rewards for reporting
CREATE POLICY "sp_referral_rewards_admin_select"
  ON public.sp_referral_rewards
  FOR SELECT TO authenticated
  USING (public.is_admin());
