-- ═══════════════════════════════════════════════════════════════════════════
-- Two live bugs found while investigating a reported login/PWA issue:
--   1. sp_website_config doesn't exist in the live DB at all (its original
--      migration file was tracked but never actually applied, or the table
--      was dropped) — every homepage hero/products/promo_banner fetch 404s.
--      Re-running that original migration is safe: CREATE TABLE IF NOT
--      EXISTS + ON CONFLICT DO NOTHING seed, no data loss risk either way.
--   2. sp_page_views has an RLS policy allowing anon/authenticated INSERT,
--      but the Postgres role itself was never GRANTed INSERT on the table,
--      so every single page-view/analytics call fails with a hard
--      "permission denied for table sp_page_views" (RLS is irrelevant if
--      the grant doesn't exist — Postgres checks table privileges first).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sp_website_config (
  id            BIGSERIAL PRIMARY KEY,
  section_key   TEXT        UNIQUE NOT NULL,
  headline      TEXT,
  subtitle      TEXT,
  cta_text      TEXT,
  cta_secondary_text TEXT,
  bg_type       TEXT        NOT NULL DEFAULT 'none',
  bg_value      TEXT,
  is_visible    BOOLEAN     NOT NULL DEFAULT true,
  extra_json    JSONB       NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_website_config_section_key
  ON sp_website_config (section_key);

INSERT INTO sp_website_config (section_key, is_visible) VALUES
  ('splash',        true),
  ('hero',          true),
  ('stats',         true),
  ('products',      true),
  ('how_it_works',  true),
  ('about',         true),
  ('testimonials',  true),
  ('footer',        true),
  ('marquee',       true),
  ('promo_banner',  true),
  ('onboarding',    true)
ON CONFLICT (section_key) DO NOTHING;

ALTER TABLE sp_website_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_config_public_read" ON sp_website_config;
CREATE POLICY "website_config_public_read"
  ON sp_website_config FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "website_config_authenticated_write" ON sp_website_config;
CREATE POLICY "website_config_authenticated_write"
  ON sp_website_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- sp_page_views: grant what the existing RLS policies already intend to allow.
GRANT SELECT, INSERT ON public.sp_page_views TO anon, authenticated;
