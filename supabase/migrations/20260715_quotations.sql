-- ═══════════════════════════════════════════════════════════════════════════
-- E-Quotations — persistent quotation records behind the QR code printed on
-- every generated quotation slip PDF.
--
-- Each PDF carries a QR pointing at https://myinsurepath.com/q/{code}. That
-- public page loads the quotation via the data-gateway (get_public_quotation)
-- and lets the customer confirm the coverage request (confirm_public_quotation).
--
-- Confirmation on the page is an *intent* signal only — binding confirmation
-- always remains with the insurer, which is also stated on the PDF itself.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_quotations (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,             -- short slug used in the QR link
  quotation_number  text not null,                    -- e.g. QS/SP/2026/VII/0092
  product_type      text not null default 'MOTOR',    -- MOTOR | PA | PROPERTY | TRAVEL | HEALTH | OTHER
  product_name      text,
  status            text not null default 'SENT',     -- SENT | VIEWED | CONFIRMED | PAID | EXPIRED | WITHDRAWN
  payload           jsonb not null default '{}'::jsonb, -- full QuotationSlipData snapshot
  customer_name     text,
  insurer_name      text,
  agent_name        text,
  agent_phone       text,
  total_premium     numeric,
  valid_until       date,
  source_app        text,                             -- CUSTOMER | AGENT | OPERATOR | ADMIN | B2B
  created_by        uuid,                             -- sp_users.id of generator (null for public flows)
  order_id          uuid,                             -- optional link to sp_policy_orders
  viewed_at         timestamptz,
  confirmed_at      timestamptz,
  confirmed_name    text,                             -- name typed by the confirming customer
  confirmed_phone   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_sp_quotations_code ON public.sp_quotations (code);
CREATE INDEX IF NOT EXISTS idx_sp_quotations_created_by ON public.sp_quotations (created_by);
CREATE INDEX IF NOT EXISTS idx_sp_quotations_number ON public.sp_quotations (quotation_number);

-- Lock down: all access goes through the data-gateway with service_role.
ALTER TABLE public.sp_quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_quotations_no_direct_access" ON public.sp_quotations;
CREATE POLICY "sp_quotations_no_direct_access" ON public.sp_quotations
  FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON public.sp_quotations FROM anon, authenticated;
