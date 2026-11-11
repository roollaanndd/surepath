-- ═══════════════════════════════════════════════════════════════════════════
-- v2.8.9 — tiga perbaikan komplain owner (11 Nov 2026):
--   1. Jejak aktivitas admin: kolom `detail` (ringkasan aksi dari whitelist
--      kunci aman) + aksi heartbeat polling tidak lagi ditulis gateway.
--   2. Referral sinkron: dedupe agent_code/referral_code + unique index +
--      backfill referral_code agen — lookup upline tidak pernah lagi gagal
--      senyap karena kode duplikat, dan kode yang tampil di app agen sama
--      dengan yang ada di database.
--   3. Agen tidak bisa berpindah ke app nasabah: 'CUSTOMER' dibersihkan dari
--      allowed_apps baris AGENT dan trigger sinkronisasi menegakkannya
--      permanen di sisi server (klien: effectiveAppsFor/hasAppAccess/guard).
-- Safe to re-run: idempotent via IF NOT EXISTS / DO blocks.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) sp_activity_log.detail — ringkasan "apa yang dikerjakan".
--     Ditulis dispatcher gateway hanya dari whitelist kunci aman (pengenal,
--     status, jumlah); NIK/foto/kata sandi tidak pernah disalin.
ALTER TABLE public.sp_activity_log
  ADD COLUMN IF NOT EXISTS detail text;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2a) Dedupe agent_code — baris dengan kode sama memicu "multiple rows
--      returned" di lookup upline (.or + maybeSingle) yang menjadikan referral
--      gagal senyap. Yang terlama dipertahankan; sisanya diganti kode baru
--      format sama yang terverifikasi belum terpakai.
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  attempt INT;
BEGIN
  FOR rec IN
    SELECT id, role
    FROM (
      SELECT id, role,
             row_number() OVER (
               PARTITION BY agent_code
               ORDER BY created_at ASC NULLS LAST, id ASC
             ) AS rn
      FROM public.sp_users
      WHERE agent_code IS NOT NULL
    ) ranked
    WHERE rn > 1
  LOOP
    attempt := 0;
    LOOP
      attempt := attempt + 1;
      IF rec.role = 'AGENT' THEN
        new_code := 'SP-AGT-' || (1000 + floor(random() * 9000)::int)::text;
      ELSE
        new_code := 'SP-' || lpad(floor(random() * 100000)::int::text, 5, '0');
      END IF;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.sp_users WHERE agent_code = new_code
      ) OR attempt >= 50;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.sp_users WHERE agent_code = new_code) THEN
      UPDATE public.sp_users SET agent_code = new_code WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- (2b) referral_code kanonik: setiap baris tanpa kode rujukan mengadopsi
--      agent_code-nya. Karena (2a) agent_code sudah unik, hasil backfill ini
--      juga unik — dan kode yang ditampilkan app agen kini pasti sama dengan
--      yang dicocokkan server (app membaca referral_code, server mencocokkan
--      referral_code ilike / agent_code ilike).
UPDATE public.sp_users
SET referral_code = agent_code
WHERE referral_code IS NULL
  AND agent_code IS NOT NULL;

-- (2c) Dedupe referral_code yang tersisa (kode manual dedupe admin-era) —
--      pola sama dengan (2a).
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  attempt INT;
BEGIN
  FOR rec IN
    SELECT id, role
    FROM (
      SELECT id, role,
             row_number() OVER (
               PARTITION BY referral_code
               ORDER BY created_at ASC NULLS LAST, id ASC
             ) AS rn
      FROM public.sp_users
      WHERE referral_code IS NOT NULL
    ) ranked
    WHERE rn > 1
  LOOP
    attempt := 0;
    LOOP
      attempt := attempt + 1;
      IF rec.role = 'AGENT' THEN
        new_code := 'SP-AGT-' || (1000 + floor(random() * 9000)::int)::text;
      ELSE
        new_code := 'SP-' || lpad(floor(random() * 100000)::int::text, 5, '0');
      END IF;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.sp_users WHERE referral_code = new_code
      ) OR attempt >= 50;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.sp_users WHERE referral_code = new_code) THEN
      UPDATE public.sp_users SET referral_code = new_code WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- (2d) Jaring pengaman permanen di tingkat DB: kode tidak bisa duplikat lagi.
--      Partial unique index — NULL (belum punya kode) tetap diperbolehkan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_users_agent_code
  ON public.sp_users (agent_code)
  WHERE agent_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sp_users_referral_code
  ON public.sp_users (referral_code)
  WHERE referral_code IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) Agen tidak bisa berpindah ke app nasabah — penegakan di sisi server.
--     Data: 'CUSTOMER' dibuang dari allowed_apps baris AGENT.
UPDATE public.sp_users
SET allowed_apps = array_remove(allowed_apps, 'CUSTOMER')
WHERE role = 'AGENT'
  AND allowed_apps @> ARRAY['CUSTOMER']::text[];

-- Trigger sinkronisasi (dari 20261025120000) diperluas: selain menjamin role
-- selalu ada di array, keanggotaan 'CUSTOMER' pada baris AGENT dibuang setiap
-- kali role/allowed_apps ditulis — admin_update_user tidak bisa
-- mengintroduksi ulang drift ini.
CREATE OR REPLACE FUNCTION public.sync_allowed_apps_with_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.allowed_apps IS NULL THEN
    NEW.allowed_apps := ARRAY[NEW.role];
  ELSIF NOT (NEW.role = ANY (NEW.allowed_apps)) THEN
    NEW.allowed_apps := array_append(NEW.allowed_apps, NEW.role);
  END IF;
  -- v2.8.9 — territory agen adalah app agen; app pelanggan tidak pernah
  -- masuk array milik AGENT.
  IF NEW.role = 'AGENT' THEN
    NEW.allowed_apps := array_remove(NEW.allowed_apps, 'CUSTOMER');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_allowed_apps_with_role ON public.sp_users;
CREATE TRIGGER trg_sync_allowed_apps_with_role
  BEFORE INSERT OR UPDATE OF role, allowed_apps ON public.sp_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_allowed_apps_with_role();
