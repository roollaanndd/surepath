-- ═══════════════════════════════════════════════════════════════════════════
-- Promo Codes — add min_premium column + seed legacy codes
--
-- The sp_promo_codes table already exists (created by an earlier migration)
-- with columns: code, description, discount_type, discount_value,
-- applicable_products, valid_from, valid_to, usage_limit, used_count,
-- is_active, created_by, created_at, updated_at.
--
-- This migration:
--   1. Adds the min_premium column (for order-total-gated discounts)
--   2. Seeds the 3 legacy hardcoded codes (SUREPATH25, WELCOME10, AI5)
--      so existing marketing materials keep working
--   3. Adds RLS policies (if not already present)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add min_premium column (order must be >= this for the code to apply)
ALTER TABLE public.sp_promo_codes
  ADD COLUMN IF NOT EXISTS min_premium numeric NOT NULL DEFAULT 0;

-- Seed the 3 legacy codes (idempotent — ON CONFLICT DO NOTHING)
INSERT INTO public.sp_promo_codes (code, description, discount_type, discount_value, is_active, usage_limit)
VALUES
  ('SUREPATH25', 'Legacy code — 25% off (was hardcoded in constants.ts)', 'PERCENT', 25, true, 100000),
  ('WELCOME10',  'Welcome discount — 10% off for new customers',          'PERCENT', 10, true, 100000),
  ('AI5',        'AI launch promo — 5% off',                              'PERCENT', 5,  true, 100000)
ON CONFLICT (code) DO NOTHING;

-- RLS: anyone can read active codes (for client-side validation);
-- admin-only write; service_role full access.
ALTER TABLE public.sp_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_promo_codes_read_active" ON public.sp_promo_codes;
CREATE POLICY "sp_promo_codes_read_active"
  ON public.sp_promo_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "sp_promo_codes_admin_write" ON public.sp_promo_codes;
CREATE POLICY "sp_promo_codes_admin_write"
  ON public.sp_promo_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sp_promo_codes_service_all" ON public.sp_promo_codes;
CREATE POLICY "sp_promo_codes_service_all"
  ON public.sp_promo_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
