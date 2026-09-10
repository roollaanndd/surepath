-- ─────────────────────────────────────────────────────────────────────────────
-- sp_user_documents — what Pathy remembers from a document the user showed it.
--
-- Before this, an uploaded STNK or KTP lived for exactly one chat turn: read,
-- priced from, discarded. The same customer had to photograph the same papers
-- again a week later.
--
-- Only EXTRACTED FIELDS are stored, never the image. The image never leaves the
-- browser: OCR runs client-side (stnk-ocr / ktpOcr / docOcr) and only the
-- resulting field map is sent to pathy-agent. That keeps this table small and
-- keeps a photo of somebody's ID out of the database entirely.
--
-- RLS is deny-all: the browser must not read it directly. Everything goes
-- through pathy-agent (service_role, scoped to the verified caller).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sp_user_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sp_users.id of the caller who attached it. An agent scanning a customer's
  -- papers files it under the AGENT's id (owner_role = 'AGENT'), because that
  -- is whose workspace it belongs in.
  user_id     uuid NOT NULL,
  owner_role  text NOT NULL DEFAULT 'CUSTOMER' CHECK (owner_role IN ('CUSTOMER', 'AGENT')),
  doc_type    text NOT NULL CHECK (doc_type IN ('STNK', 'KTP', 'SIM', 'POLIS', 'INVOICE', 'DOC')),
  label       text,
  fields      jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence  numeric,
  source      text NOT NULL DEFAULT 'PATHY_CHAT',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sp_user_documents_user_idx
  ON public.sp_user_documents (user_id, doc_type, created_at DESC);

ALTER TABLE public.sp_user_documents ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. RLS with zero policies = deny-all for anon and
-- authenticated; service_role bypasses RLS, which is exactly the gateway
-- pattern the rest of the sensitive tables follow.
REVOKE ALL ON public.sp_user_documents FROM anon, authenticated;

COMMENT ON TABLE public.sp_user_documents IS
  'Extracted fields from documents users showed Pathy (no images). Deny-all RLS; written by the pathy-agent edge function with service_role.';
