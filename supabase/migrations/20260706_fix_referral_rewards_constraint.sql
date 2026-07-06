-- Fix referral rewards: the UNIQUE(referrer_id, referee_id) constraint
-- blocked the second insert (referee's reward) because both rows have the
-- same (referrer_id, referee_id) pair. Adding a reward_recipient column
-- distinguishes the two rewards, and the constraint is updated to include it.

ALTER TABLE public.sp_referral_rewards
  ADD COLUMN IF NOT EXISTS reward_recipient text NOT NULL DEFAULT 'REFERRER'
  CHECK (reward_recipient IN ('REFERRER', 'REFEREE'));

-- Drop the old constraint and add the new one
ALTER TABLE public.sp_referral_rewards
  DROP CONSTRAINT IF EXISTS sp_referral_rewards_unique_pair;

ALTER TABLE public.sp_referral_rewards
  ADD CONSTRAINT sp_referral_rewards_unique_triple
  UNIQUE (referrer_id, referee_id, reward_recipient);
