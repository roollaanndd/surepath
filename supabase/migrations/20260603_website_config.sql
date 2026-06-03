-- Website CMS config table — editable from the admin dashboard and read by the public site at runtime.
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

-- Seed default sections (all visible, no overrides → pages fall back to hardcoded defaults)
INSERT INTO sp_website_config (section_key, is_visible) VALUES
  ('splash',        true),
  ('hero',          true),
  ('stats',         true),
  ('products',      true),
  ('how_it_works',  true),
  ('about',         true),
  ('testimonials',  true),
  ('footer',        true),
  ('marquee',       true)
ON CONFLICT (section_key) DO NOTHING;

-- RLS: public can read visible sections; admin writes are allowed via anon key (production: restrict to service_role or admin auth)
ALTER TABLE sp_website_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "website_config_public_read"
  ON sp_website_config FOR SELECT
  USING (true);

CREATE POLICY "website_config_admin_write"
  ON sp_website_config FOR ALL
  USING (true)
  WITH CHECK (true);
