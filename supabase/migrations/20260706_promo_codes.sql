-- ═══════════════════════════════════════════════════════════════════════════
-- Promo Codes CMS — admin-manageable time-limited promotional discount codes
--
-- Replaces the hardcoded PROMO_CODES constant in constants.ts. Customers
-- enter a code at the coverage step; the server validates it against this
-- table and applies the discount.
--
-- The previous discount slider let any customer self-select up to 25% off
-- with no code, no eligibility check, no scarcity — silently leaking ~25%
-- of premium revenue + ~25% of agent commission on every order. This table
-- restores margin control: discounts only apply when a valid code is entered.
--
-- Schema:
--   id            uuid PK
--   code          text UNIQUE NOT NULL (case-insensitive — stored UPPER)
--   description   text (admin note — never shown to customer)
--   discount_type 'PERCENT' | 'NOMINAL'
--   discount_value numeric — percent (0-100) if PERCENT, IDR amount if NOMINAL
--   min_premium   numeric (0 = no minimum) — order must be >= this to apply
--   max_uses      integer (NULL = unlimited)
--   uses_count    integer (default 0) — incremented on each successful use
--   starts_at     timestamptz (when the code becomes active)
--   ends_at       timestamptz (NULL = never expires)
--   is_active     boolean (admin can deactivate without deleting)
--   created_by    uuid (admin who created it)
--   created_at    timestamptz
--   updated_at    timestamptz
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_promo_codes (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text         NOT NULL,
  description    text,
  discount_type  text         NOT NULL DEFAULT 'PERCENT'
                              CHECK (discount_type IN ('PERCENT', 'NOMINAL')),
  discount_value numeric      NOT NULL CHECK (discount_value >= 0),
  min_premium    numeric      NOT NULL DEFAULT 0,
  max_uses      integer,
  uses_count    integer      NOT NULL DEFAULT 0,
  starts_at     timestamptz  NOT NULL DEFAULT now(),
  ends_at       timestamptz,
  is_active     boolean      NOT NULL DEFAULT true,
  created_by    uuid,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT sp_promo_codes_code_upper UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_sp_promo_codes_code
  ON public.sp_promo_codes (code);
CREATE INDEX IF NOT EXISTS idx_sp_promo_codes_active
  ON public.sp_promo_codes (is_active, starts_at, ends_at);

ALTER TABLE public.sp_promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can validate a code by looking it up.
-- The validation function in data-gateway checks is_active + date range +
-- usage limit before returning the discount. This read-only access lets
-- the client show "code is valid" feedback instantly.
CREATE POLICY "sp_promo_codes_read_active"
  ON public.sp_promo_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Only admins can create / update / delete promo codes.
CREATE POLICY "sp_promo_codes_admin_write"
  ON public.sp_promo_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role (data-gateway) can do everything — including incrementing
-- uses_count when a code is redeemed.
CREATE POLICY "sp_promo_codes_service_all"
  ON public.sp_promo_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed the legacy hardcoded codes so existing marketing materials keep working
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.sp_promo_codes (code, description, discount_type, discount_value, is_active)
VALUES
  ('SUREPATH25', 'Legacy code — 25% off (was hardcoded in constants.ts)', 'PERCENT', 25, true),
  ('WELCOME10',  'Welcome discount — 10% off for new customers',          'PERCENT', 10, true),
  ('AI5',        'AI launch promo — 5% off',                              'PERCENT', 5,  true)
ON CONFLICT (code) DO NOTHING;
