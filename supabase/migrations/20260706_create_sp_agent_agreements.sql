-- ═══════════════════════════════════════════════════════════════════════════
-- Agent Legal Agreement table (sp_agent_agreements)
--
-- Why this migration exists:
--   v1.15.0 (commit 3afe11c) introduced a mandatory agent partnership
--   agreement gate (components/agent/AgentAgreementGate.tsx) that records
--   each agent's e-consent (full name + 16-digit KTP) into sp_agent_agreements
--   before granting app access. The accompanying admin audit view
--   (components/admin/AgentAgreementsAdmin.tsx) reads the same table.
--
--   However, the migration that creates this table was never committed to
--   source control — only the code that references it. On any database that
--   was not manually patched, acceptAgreement() fails with
--   "relation sp_agent_agreements does not exist" and the agent sees
--   "Gagal menyimpan persetujuan. Coba lagi." after pressing I AGREE.
--   The same insert path also fails on the existing production DB if any
--   column/default is missing.
--
--   This migration captures the live schema in source so the table is
--   reproducible from the repo. All statements use IF NOT EXISTS so it is
--   safe to run on databases where the table was manually created.
--
-- Schema is derived from:
--   - services/supabaseService.ts → SpAgentAgreement interface + acceptAgreement()
--   - components/agent/AgentAgreementGate.tsx   (e-consent capture UI)
--   - components/admin/AgentAgreementsAdmin.tsx  (audit view columns)
--   - docs/CHANGELOG.md v1.15.0  (RLS rules + KTP 16-digit + uniqueness)
--   - docs/HANDOVER.md             (immutability — no UPDATE/DELETE policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Sequence for human-readable agreement numbers (SPA-YYYY-NNNNNN) ─────────
CREATE SEQUENCE IF NOT EXISTS public.sp_agent_agreements_seq
  AS bigint START 1 INCREMENT 1 NO CYCLE;
ALTER SEQUENCE public.sp_agent_agreements_seq OWNER TO postgres;

-- ── Generator function: SPA-<year>-<6-digit zero-padded> ────────────────────
-- e.g. SPA-2026-000001. Re-runnable.
CREATE OR REPLACE FUNCTION public.gen_agent_agreement_no()
RETURNS text
LANGUAGE sql
AS $function$
  SELECT 'SPA-' || EXTRACT(YEAR FROM now())::text
       || '-' || lpad(nextval('public.sp_agent_agreements_seq')::text, 6, '0');
$function$;

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sp_agent_agreements (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_no  text         NOT NULL DEFAULT public.gen_agent_agreement_no(),
  doc_version   text         NOT NULL,
  full_name     text         NOT NULL,
  ktp_number    text         NOT NULL,
  accepted_at   timestamptz  NOT NULL DEFAULT now(),
  user_agent    text,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  -- KTP must be exactly 16 digits (Indonesian NIK)
  CONSTRAINT sp_agent_agreements_ktp_format CHECK (ktp_number ~ '^[0-9]{16}$'),
  -- One acceptance per agent per doc version (re-acceptance requires a new doc_version)
  CONSTRAINT sp_agent_agreements_unique_agent_doc UNIQUE (agent_id, doc_version)
);

-- Indexes for admin audit search
CREATE INDEX IF NOT EXISTS idx_sp_agent_agreements_agent_id   ON public.sp_agent_agreements(agent_id);
CREATE INDEX IF NOT EXISTS idx_sp_agent_agreements_agreement_no ON public.sp_agent_agreements(agreement_no);
CREATE INDEX IF NOT EXISTS idx_sp_agent_agreements_accepted_at ON public.sp_agent_agreements(accepted_at DESC);

-- ── RLS: immutable audit log ────────────────────────────────────────────────
-- Agents can INSERT their own row and SELECT their own row.
-- Admins (is_admin()) can SELECT all rows for the audit view.
-- No UPDATE / DELETE policies = immutable, per HANDOVER.md.
ALTER TABLE public.sp_agent_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_agent_agreements_select_own" ON public.sp_agent_agreements;
CREATE POLICY "sp_agent_agreements_select_own" ON public.sp_agent_agreements
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "sp_agent_agreements_insert_own" ON public.sp_agent_agreements;
CREATE POLICY "sp_agent_agreements_insert_own" ON public.sp_agent_agreements
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "sp_agent_agreements_admin_select" ON public.sp_agent_agreements;
CREATE POLICY "sp_agent_agreements_admin_select" ON public.sp_agent_agreements
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Service role (data-gateway edge function) can read everything for admin views
DROP POLICY IF EXISTS "sp_agent_agreements_service_all" ON public.sp_agent_agreements;
CREATE POLICY "sp_agent_agreements_service_all" ON public.sp_agent_agreements
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
