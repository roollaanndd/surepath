-- Add fcm_token column to sp_users for push notifications
ALTER TABLE public.sp_users
  ADD COLUMN IF NOT EXISTS fcm_token text;

-- No RLS change needed — existing sp_users policies already cover UPDATE
-- (users can update their own row, admins can update any).
