-- Add tnc_ref_number to sp_users for quick lookup in user lists
ALTER TABLE sp_users ADD COLUMN IF NOT EXISTS tnc_ref_number TEXT;

-- Legal filing table — one record per acceptance, content snapshot stored for dispute resolution
CREATE TABLE IF NOT EXISTS sp_tnc_records (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL,
  reference_number TEXT        UNIQUE NOT NULL,
  tnc_version     TEXT         NOT NULL DEFAULT 'v1.0',
  tnc_content     TEXT         NOT NULL,
  accepted_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  user_agent      TEXT,
  CONSTRAINT fk_tnc_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tnc_records_user_id    ON sp_tnc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tnc_records_ref_number ON sp_tnc_records(reference_number);

ALTER TABLE sp_tnc_records ENABLE ROW LEVEL SECURITY;

-- Users can read their own record (for profile display)
CREATE POLICY "tnc_select_own" ON sp_tnc_records
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own record
CREATE POLICY "tnc_insert_own" ON sp_tnc_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role (data-gateway) can read all for admin views
CREATE POLICY "tnc_service_all" ON sp_tnc_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);
