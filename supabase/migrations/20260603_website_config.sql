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

-- RLS: public may READ (the marketing site needs this), but writes are NOT open to anon.
-- Anonymous visitors must never be able to modify/deface website content.
ALTER TABLE sp_website_config ENABLE ROW LEVEL SECURITY;

-- Public read: anyone (incl. logged-out visitors) can render the site.
CREATE POLICY "website_config_public_read"
  ON sp_website_config FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes: signed-in users only. The anon role (logged-out / unauthenticated)
-- is explicitly excluded, so the public cannot insert/update/delete content.
-- NOTE: the admin "Editor Website" must run with a Supabase Auth session for
-- these to succeed. For defense-in-depth, route admin writes through an edge
-- function using the service_role key instead of the client anon key.
CREATE POLICY "website_config_authenticated_write"
  ON sp_website_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
