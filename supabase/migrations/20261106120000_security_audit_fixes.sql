-- 20261106120000_security_audit_fixes.sql
-- FIX v2.7.56 (security audit 2026-11-05, run-1) — perbaikan sisi database yang
-- aman diterapkan tanpa mengubah perilaku aplikasi yang sah:
--   1) sp_insurer_auth_tokens.token_hash — token insurer disimpan sebagai
--      SHA-256; kolom lama tetap ada dan di-backfill, kode gateway membaca
--      hash-first dengan fallback plaintext sehingga deploy kode dan migration
--      boleh berurutan dalam arah mana pun.
--   2) Guard BEFORE INSERT pada sp_users — menutup eskalasi peran lewat
--      INSERT anon-key langsung (policy INSERT hanya mengikat id = auth.uid(),
--      role tidak dibatasi di sana). Service_role (gateway) tetap lewat.

-- ── 1) Token insurer: hash at rest ──────────────────────────────────────────
ALTER TABLE public.sp_insurer_auth_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

UPDATE public.sp_insurer_auth_tokens
SET token_hash = encode(sha256(token::bytea), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sp_insurer_auth_tokens_hash
  ON public.sp_insurer_auth_tokens (token_hash);

-- ── 2) Guard eskalasi peran pada INSERT langsung sp_users ───────────────────
CREATE OR REPLACE FUNCTION public.guard_sp_users_self_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gateway dan admin API menulis lewat service_role: lolos penuh.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Self-insert (authenticated): role kelas-admin tidak boleh diambil sendiri.
  -- CUSTOMER/AGENT/B2B_CLIENT tetap sah (pendaftaran mandiri & onboarding).
  IF NEW.role IN ('MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER',
                  'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'OPERATOR') THEN
    RAISE EXCEPTION 'Peran % tidak dapat diambil lewat pendaftaran mandiri', NEW.role
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_users_self_insert_guard ON public.sp_users;
CREATE TRIGGER trg_sp_users_self_insert_guard
  BEFORE INSERT ON public.sp_users
  FOR EACH ROW EXECUTE FUNCTION public.guard_sp_users_self_insert();
