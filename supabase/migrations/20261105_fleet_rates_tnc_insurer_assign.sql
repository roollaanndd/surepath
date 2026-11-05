-- ═══════════════════════════════════════════════════════════════════════════
-- Admin-editable B2B fleet rates, versioned T&C documents, and insurer
-- assignment for bulk batches (5 Nov 2026)
--
-- Three independent additions, bundled in one migration because they ship
-- together with the same gateway redeploy:
--
--   1. sp_b2b_fleet_rate_sets — makes the B2B-bulk-specific numbers in
--      services/b2bFleetRating.ts / _shared/b2bFleetRating.ts admin-editable,
--      versioned, one-active-at-a-time (same pattern as sp_ojk_rate_sets).
--      NOTE: passenger-car and motorcycle TLO rates (CAR_TLO_MIN/MOTO_TLO_MIN)
--      are deliberately NOT duplicated here — services/ojkRates.ts already
--      makes those reactive to the active sp_ojk_rate_sets row (mutable
--      module-level bindings reassigned by setActiveOjkRateSet(), edited via
--      the existing OjkRateAdmin.tsx screen). This table only covers what
--      that screen doesn't: the pickup/truck commercial-body rate, the heavy
--      equipment rate, the two discount rates, the three admin fees, and the
--      minimum premium floor — none of which are OJK motor-vehicle rates.
--
--   2. sp_tnc_documents — Terms & Conditions content was never a database
--      row at all: accept_agreement (actions/users.ts) hardcodes
--      doc_version='v1.0-2026' and there is nowhere to edit the text an
--      agent actually agrees to. Versioned, one-active-at-a-time, same
--      pattern as #1.
--
--   3. sp_b2b_batches.insurer_id already exists but was only ever written at
--      issuance time (admin_b2b_bulk_issue) — there was no way to assign an
--      insurer BEFORE that, so an insurer's token-authed dashboard has
--      nothing to query. This migration doesn't add a column (insurer_id is
--      already there); it's listed here because admin_b2b_bulk_assign_insurer
--      (the new gateway action that sets it) ships in the same deploy.
--
--   Also: b2b-documents is a PRIVATE bucket (20260706_security_hardening_
--   phase3), but admin_b2b_bulk_issue (built earlier this session) stored
--   whatever uploadB2BBulkMasterPolicy's getPublicUrl() returned — which
--   404s on a private bucket. Fixed here by storing the storage PATH instead
--   of a URL; every reader (admin/client/insurer) resolves it to a signed
--   URL through the gateway, the same pattern sp_documents already uses.
--   master_policy_document_url is repurposed to hold that path — see the
--   column comment below. No schema change needed for that fix, only code.
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.sp_b2b_batches.master_policy_document_url IS
  'Storage PATH inside the private b2b-documents bucket (e.g. "<batch_id>/master-policy-...pdf"), NOT a public URL — the bucket is private. Resolve to a signed URL via the gateway (admin_b2b_bulk_issue response, insurer_list_bulk_batches, or documents_signed_url) before displaying/downloading.';

-- ── 1. B2B fleet rate sets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_b2b_fleet_rate_sets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version           text        NOT NULL,
  source_reference  text        NOT NULL DEFAULT 'SEOJK No. 6/SEOJK.05/2017 (batas bawah) + kebijakan internal',
  effective_date    date        NOT NULL DEFAULT CURRENT_DATE,
  is_active         boolean     NOT NULL DEFAULT false,
  -- Shape mirrors BulkRateConfig in services/b2bFleetRating.ts:
  -- { pickupTruckTloMin: {zone: rate}, heavyEquipmentRate: number,
  --   discountRateStandard: number, discountRateHeavy: number,
  --   adminFeeMotorcycle, adminFeeCar, adminFeeHeavy, minPremiumGross: number }
  rates             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_b2b_fleet_rate_sets_version ON public.sp_b2b_fleet_rate_sets(version);
-- Enforce "at most one active" the same way sp_ojk_rate_sets does — via
-- application code (admin_activate_b2b_fleet_rate_set deactivates the rest
-- first), not a DB constraint, matching the existing convention.
CREATE INDEX IF NOT EXISTS idx_sp_b2b_fleet_rate_sets_active ON public.sp_b2b_fleet_rate_sets(is_active) WHERE is_active = true;

ALTER TABLE public.sp_b2b_fleet_rate_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_direct_gateway_only ON public.sp_b2b_fleet_rate_sets;
CREATE POLICY deny_direct_gateway_only ON public.sp_b2b_fleet_rate_sets
  FOR ALL USING (false) WITH CHECK (false);

-- Seed the current hardcoded constants as the one active version, so nothing
-- changes behaviorally until an admin edits and republishes.
INSERT INTO public.sp_b2b_fleet_rate_sets (version, is_active, rates, notes)
VALUES (
  'v1.0-2026-11-05',
  true,
  '{
    "pickupTruckTloMin": {"1": 0.0088, "2": 0.0168, "3": 0.0081},
    "heavyEquipmentRate": 0.0085,
    "discountRateStandard": 0.25,
    "discountRateHeavy": 0.15,
    "adminFeeMotorcycle": 25000,
    "adminFeeCar": 45000,
    "adminFeeHeavy": 65000,
    "minPremiumGross": 50000
  }'::jsonb,
  'Nilai awal — mencerminkan konstanta hardcoded sebelumnya di services/b2bFleetRating.ts. Mengedit baris ini tidak mengubah apa pun sampai versi baru diaktifkan.'
)
ON CONFLICT (version) DO NOTHING;

-- ── 2. T&C documents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_tnc_documents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_version    text        NOT NULL,
  title          text        NOT NULL DEFAULT 'Syarat & Ketentuan Mitra Agen',
  content        text        NOT NULL DEFAULT '',
  is_active      boolean     NOT NULL DEFAULT false,
  published_at   timestamptz,
  published_by   uuid        REFERENCES public.sp_users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_tnc_documents_version ON public.sp_tnc_documents(doc_version);
CREATE INDEX IF NOT EXISTS idx_sp_tnc_documents_active ON public.sp_tnc_documents(is_active) WHERE is_active = true;

ALTER TABLE public.sp_tnc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_direct_gateway_only ON public.sp_tnc_documents;
CREATE POLICY deny_direct_gateway_only ON public.sp_tnc_documents
  FOR ALL USING (false) WITH CHECK (false);

-- Seed 'v1.0-2026' as active so accept_agreement's existing hardcoded version
-- string keeps matching — no forced re-acceptance for the switch-over itself.
INSERT INTO public.sp_tnc_documents (doc_version, title, content, is_active, published_at)
VALUES (
  'v1.0-2026',
  'Syarat & Ketentuan Mitra Agen SurePath',
  'Dokumen placeholder — isi lewat CMS Admin > Syarat & Ketentuan. Versi ini sudah tercatat sebagai diterima oleh mitra yang menyetujui sebelum fitur editor ini ada.',
  true,
  now()
)
ON CONFLICT (doc_version) DO NOTHING;
