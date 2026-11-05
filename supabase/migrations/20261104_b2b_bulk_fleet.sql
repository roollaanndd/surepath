-- ═══════════════════════════════════════════════════════════════════════════
-- B2B bulk fleet TLO import (multifinance block business)
--
-- Why this migration exists (4 Nov 2026):
--   A multifinance company (e.g. PT MMF/Mutiara Finance) ships a spreadsheet
--   of financed vehicles — one row per nasabah/unit — that all need TLO cover
--   in one shot. The existing B2B flow (sp_b2b_submissions/sp_b2b_quotes) is a
--   single free-form submission + a human-typed quote; there is no concept of
--   "253 line items, one invoice, 253 certificates" and no path to payment or
--   policy issuance at all (B2BQuotes.tsx 'ACCEPTED' was a dead end).
--
--   This adds a dedicated bulk-batch object instead of overloading
--   sp_b2b_submissions: a batch is a real block-policy unit (one aggregate
--   Xendit invoice, one master policy document from the insurer, many insured
--   units), not a renegotiated quote. Both new tables carry client PII + money
--   at bulk scale, so — like sp_policy_orders/sp_payments — they are
--   deny-all RLS, gateway/service-role only (NOT the scoped-client-RLS
--   pattern sp_b2b_submissions uses).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Batch header (= one aggregate invoice, one master policy) ───────────
CREATE TABLE IF NOT EXISTS public.sp_b2b_batches (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number              text        NOT NULL DEFAULT ('BULK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  client_id                 uuid        NOT NULL REFERENCES public.sp_users(id) ON DELETE CASCADE,
  company_name              text        NOT NULL,
  product_type              text        NOT NULL DEFAULT 'FLEET_TLO_FINANCE',
  source_file_name          text,
  item_count                integer     NOT NULL DEFAULT 0,
  total_premium_gross       numeric     NOT NULL DEFAULT 0,
  total_discount            numeric     NOT NULL DEFAULT 0,
  total_premium_net         numeric     NOT NULL DEFAULT 0,
  total_admin_fee           numeric     NOT NULL DEFAULT 0,
  total_amount              numeric     NOT NULL DEFAULT 0,
  status                    text        NOT NULL DEFAULT 'DRAFT',
  insurer_id                uuid        REFERENCES public.sp_users(id) ON DELETE SET NULL,
  insurer_name              text,
  master_policy_number      text,
  master_policy_document_url text,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  issued_at                 timestamptz,

  CONSTRAINT sp_b2b_batches_status CHECK (status IN
    ('DRAFT','SUBMITTED','INVOICED','PAID','ISSUED','CANCELLED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_b2b_batches_number ON public.sp_b2b_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_sp_b2b_batches_client ON public.sp_b2b_batches(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_b2b_batches_status ON public.sp_b2b_batches(status);

-- ── 2. Line items (one per nasabah/unit) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_b2b_batch_items (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id               uuid        NOT NULL REFERENCES public.sp_b2b_batches(id) ON DELETE CASCADE,
  row_no                 integer     NOT NULL,

  nasabah_name           text        NOT NULL,
  nasabah_ktp            text,
  nasabah_phone          text,
  nasabah_address        text,

  contract_no            text,
  contract_date          date,
  tenor_months           integer     NOT NULL DEFAULT 12,
  financing_value        numeric     NOT NULL,

  vehicle_class          text        NOT NULL,
  make                   text,
  model                  text,
  model_year             integer,
  otr                    numeric,
  plate_no               text,
  chassis_no             text,
  engine_no              text,
  bpkb_no                text,

  region_text            text,
  zone                   integer     NOT NULL,
  coverage_type          text        NOT NULL DEFAULT 'TLO',

  rate                   numeric     NOT NULL,
  premium_gross          numeric     NOT NULL,
  discount_rate          numeric     NOT NULL DEFAULT 0,
  discount_amount        numeric     NOT NULL DEFAULT 0,
  premium_after_discount numeric     NOT NULL,
  admin_fee              numeric     NOT NULL DEFAULT 0,
  total_premium          numeric     NOT NULL,

  flags                  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status                 text        NOT NULL DEFAULT 'PENDING',
  policy_number          text,
  certificate_document_url text,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sp_b2b_batch_items_class CHECK (vehicle_class IN ('MOTORCYCLE','CAR','HEAVY_EQUIPMENT')),
  CONSTRAINT sp_b2b_batch_items_zone CHECK (zone IN (1,2,3)),
  CONSTRAINT sp_b2b_batch_items_status CHECK (status IN ('PENDING','READY','ISSUED'))
);

CREATE INDEX IF NOT EXISTS idx_sp_b2b_batch_items_batch ON public.sp_b2b_batch_items(batch_id, row_no);

-- ── 3. sp_payments: let one payment settle a bulk batch instead of an order ─
ALTER TABLE public.sp_payments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.sp_b2b_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sp_payments_batch ON public.sp_payments(batch_id) WHERE batch_id IS NOT NULL;

-- order_id was NOT NULL-by-convention (always set) for every existing payment
-- row; it stays nullable at the column level (already was) so this is purely
-- additive — a batch payment simply leaves order_id null instead.

-- ── 4. RLS — deny-all direct access; data-gateway (service_role) only ──────
ALTER TABLE public.sp_b2b_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_b2b_batch_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_direct_gateway_only ON public.sp_b2b_batches;
CREATE POLICY deny_direct_gateway_only ON public.sp_b2b_batches
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_direct_gateway_only ON public.sp_b2b_batch_items;
CREATE POLICY deny_direct_gateway_only ON public.sp_b2b_batch_items
  FOR ALL USING (false) WITH CHECK (false);
