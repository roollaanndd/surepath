-- ═══════════════════════════════════════════════════════════════════════════
-- 20260713_claims_fraud_detection.sql — Claims photo forensics + fraud
-- detection, plus a pre-existing sp_claims schema gap fix.
--
-- Part A (bug fix, discovered while building this feature): submit_claim /
-- admin_update_claim in supabase/functions/data-gateway/actions/claims.ts
-- already reference claim_type, description, incident_date, client_id,
-- updated_at, adjuster_notes — none of which exist on the live sp_claims
-- table. Every claim submission has been failing in production (confirmed:
-- sp_claims has zero rows). Adding the missing columns here restores the
-- claim-submission flow, which the new photo-analysis pipeline depends on.
--
-- Part B (new feature): adds photo forensics columns to sp_claims, a
-- perceptual-hash duplicate-detection table shared between claims and
-- vehicle surveys, and a claim-photos Storage bucket.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Part A: sp_claims schema gap fix ─────────────────────────────────────────
ALTER TABLE public.sp_claims
  ADD COLUMN IF NOT EXISTS claim_type     text,
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS incident_date  date,
  ADD COLUMN IF NOT EXISTS client_id      uuid,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS adjuster_notes text;

-- ── Part B: photo forensics columns ──────────────────────────────────────────
ALTER TABLE public.sp_claims
  ADD COLUMN IF NOT EXISTS photo_urls       text[],
  ADD COLUMN IF NOT EXISTS ai_fraud_score   int,
  ADD COLUMN IF NOT EXISTS ai_fraud_verdict text,
  ADD COLUMN IF NOT EXISTS ai_photo_reports jsonb,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at   timestamptz;

ALTER TABLE public.sp_claims DROP CONSTRAINT IF EXISTS sp_claims_ai_fraud_verdict_check;
ALTER TABLE public.sp_claims
  ADD CONSTRAINT sp_claims_ai_fraud_verdict_check
  CHECK (ai_fraud_verdict IS NULL OR ai_fraud_verdict IN ('CLEAN', 'REVIEW_REQUIRED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_sp_claims_ai_fraud_verdict
  ON public.sp_claims(ai_fraud_verdict) WHERE ai_fraud_verdict IS NOT NULL;

-- ── sp_photo_hashes — perceptual (average) hash of every analyzed photo ────
-- Shared between claims and vehicle surveys so a photo reused across either
-- flow is caught. Hamming-distance matching happens in application code
-- (analyze-claim-photos), which pulls candidate rows by hash and compares.
CREATE TABLE IF NOT EXISTS public.sp_photo_hashes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_hash  bigint      NOT NULL,       -- 64-bit average hash
  source_type text        NOT NULL CHECK (source_type IN ('CLAIM', 'SURVEY')),
  source_id   uuid        NOT NULL,       -- sp_claims.id or sp_policy_orders.id
  photo_url   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_photo_hashes_hash ON public.sp_photo_hashes(photo_hash);
CREATE INDEX IF NOT EXISTS idx_sp_photo_hashes_source ON public.sp_photo_hashes(source_type, source_id);

ALTER TABLE public.sp_photo_hashes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_photo_hashes_service_all" ON public.sp_photo_hashes;
CREATE POLICY "sp_photo_hashes_service_all" ON public.sp_photo_hashes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can read (for the claim-detail duplicate-match UI); no direct
-- client writes — only the analyze-claim-photos edge function (service_role)
-- inserts rows.
DROP POLICY IF EXISTS "sp_photo_hashes_admin_select" ON public.sp_photo_hashes;
CREATE POLICY "sp_photo_hashes_admin_select" ON public.sp_photo_hashes
  FOR SELECT TO authenticated
  USING (is_admin());

-- ── sp_claim_photo_analyses — trusted staging area for AI fraud results ────
-- analyze-claim-photos runs BEFORE a claim exists (customer reviews the AI
-- read-out first, then fills the incident form, then submits). The analysis
-- result has to travel client→submit_claim somehow, but this is a fraud
-- detection feature — trusting a client-echoed fraud_score/fraud_verdict at
-- submit time would let the exact fraudster this feature targets simply
-- send back "CLEAN" regardless of what the AI actually found. Instead the
-- edge function (service_role) writes its results here; submit_claim looks
-- the row up by id + caller match + freshness + not-yet-consumed, and uses
-- ONLY the server-stored values — client-supplied fraud fields are ignored.
CREATE TABLE IF NOT EXISTS public.sp_claim_photo_analyses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL,
  photo_urls    text[]      NOT NULL,
  photo_hashes  text[],                  -- average-hash per photo, as text (bigint-safe)
  photo_reports jsonb       NOT NULL,     -- ClaimPhotoForensicReport[]
  fraud_score   int         NOT NULL,
  fraud_verdict text        NOT NULL CHECK (fraud_verdict IN ('CLEAN', 'REVIEW_REQUIRED', 'REJECTED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  consumed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sp_claim_photo_analyses_user ON public.sp_claim_photo_analyses(user_id, created_at DESC);

ALTER TABLE public.sp_claim_photo_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_claim_photo_analyses_service_all" ON public.sp_claim_photo_analyses;
CREATE POLICY "sp_claim_photo_analyses_service_all" ON public.sp_claim_photo_analyses
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- No authenticated policies: written by the edge function and read by the
-- gateway, both service_role. Clients never query this table directly.

-- ── Storage: claim-photos bucket ─────────────────────────────────────────────
-- Mirrors the vehicle-images pattern: public read (photos are shown back to
-- the customer + admin without needing signed URLs), authenticated-only
-- write, scoped to the caller's own folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('claim-photos', 'claim-photos', true, 8388608)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "claim_photos_public_select" ON storage.objects;
CREATE POLICY "claim_photos_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'claim-photos');

DROP POLICY IF EXISTS "claim_photos_owner_insert" ON storage.objects;
CREATE POLICY "claim_photos_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'claim-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
