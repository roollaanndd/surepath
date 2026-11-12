-- ═══════════════════════════════════════════════════════════════════════════
-- B2B quotes/submissions/documents hardening + submission notification
--
-- Why (audit 11 Nov 2026):
--   1. Keputusan penawaran (ACCEPTED/REJECTED) sebelumnya ditulis langsung
--      dari peramban (services/website.ts updateB2BQuoteStatus) — kini lewat
--      aksi gateway b2b_decide_quote. RLS kini menolak UPDATE langsung dari
--      klien sama sekali; hanya service_role (gateway) yang bisa menulis.
--   2. Pengajuan B2B baru tidak pernah memberi kabar ke admin (insert
--      langsung tanpa notifikasi). Trigger AFTER INSERT kini menulis
--      sp_admin_notifications untuk SETIAP jalur insert.
--   3. Status pengajuan bisa dipalsukan lewat insert langsung (client bisa
--      mengirim status='ACCEPTED' sendiri). Trigger BEFORE INSERT memaksa
--      status awal 'SUBMITTED', memvalidasi product_type, dan mengosongkan
--      kolom internal admin_notes.
--   4. Policy lama pada tiga tabel ini dibuat di luar repo (dashboard), nama
--      dan isinya tidak terdokumentasi. Migrasi ini MENGGANTI SELURUH policy
--      pada sp_b2b_quotes / sp_b2b_submissions / sp_b2b_documents dengan set
--      yang deterministik: klien hanya melihat/membuat miliknya, admin hanya
--      membaca, semua penulisan lain lewat gateway (service_role).
--      sp_b2b_batches / sp_b2b_batch_items sudah deny-all (20261104) — tidak
--      disentuh di sini.
-- Idempotent: aman dijalankan berulang.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Helper identitas (SECURITY DEFINER agar membaca sp_users bebas RLS) ──

-- sp_users.id pemanggil: cocokkan auth.uid() dulu, lalu email (akun legacy
-- dengan sp_users.id ≠ auth id). Kesamaan email pakai `=` persis — BUKAN
-- ilike/pattern, supaya wildcard JWT email tidak bisa meniru identitas lain
-- (pola pelajaran FIX v2.6.18 di gateway).
CREATE OR REPLACE FUNCTION public.sp_b2b_own_client_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id FROM public.sp_users u
  WHERE u.id = auth.uid()
     OR ((auth.jwt() ->> 'email') IS NOT NULL
         AND lower(u.email) = lower(auth.jwt() ->> 'email'))
  ORDER BY (u.id = auth.uid()) DESC
  LIMIT 1
$$;

-- Daftar role admin: cermin ADMIN_ROLES di data-gateway/index.ts (bukan hanya
-- MASTER_ADMIN/ADMIN — FINANCE dll. juga membaca tab B2B di CMS).
CREATE OR REPLACE FUNCTION public.sp_b2b_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sp_users u
    WHERE u.id = auth.uid()
      AND u.role IN ('MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER',
                     'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'OPERATOR')
  )
$$;

REVOKE ALL ON FUNCTION public.sp_b2b_own_client_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_b2b_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_b2b_own_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sp_b2b_is_admin() TO authenticated;

-- ── 2. Aktifkan RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.sp_b2b_quotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_b2b_submissions ENABLE ROW LEVEL SECURITY;
-- sp_b2b_documents dibuat di luar repo (dashboard); guard keberadaan supaya
-- migrasi tidak gagal bila tabel belum pernah dibuat di lingkungan tertentu.
DO $$ BEGIN
  IF to_regclass('public.sp_b2b_documents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.sp_b2b_documents ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ── 3. Ganti SELURUH policy lama dengan set deterministik ───────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('sp_b2b_quotes', 'sp_b2b_submissions', 'sp_b2b_documents')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── 3a. sp_b2b_quotes — baca saja untuk klien & admin; tulis via gateway ────
CREATE POLICY client_sel ON public.sp_b2b_quotes
  FOR SELECT TO authenticated
  USING (client_id = public.sp_b2b_own_client_id());

CREATE POLICY admin_sel ON public.sp_b2b_quotes
  FOR SELECT TO authenticated
  USING (public.sp_b2b_is_admin());

-- ── 3b. sp_b2b_submissions — klien membaca & membuat miliknya; TANPA
--        update/delete langsung (status hanya berubah via gateway) ──────────
CREATE POLICY client_sel ON public.sp_b2b_submissions
  FOR SELECT TO authenticated
  USING (client_id = public.sp_b2b_own_client_id());

CREATE POLICY client_ins ON public.sp_b2b_submissions
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.sp_b2b_own_client_id());

CREATE POLICY admin_sel ON public.sp_b2b_submissions
  FOR SELECT TO authenticated
  USING (public.sp_b2b_is_admin());

-- ── 3c. sp_b2b_documents — ownership via pengajuan induknya ─────────────────
-- Hanya bila tabelnya ada (dibuat out-of-band; lihat guard di seksi 2).
DO $$ BEGIN
  IF to_regclass('public.sp_b2b_documents') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY client_sel ON public.sp_b2b_documents
        FOR SELECT TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.sp_b2b_submissions s
          WHERE s.id = sp_b2b_documents.submission_id
            AND s.client_id = public.sp_b2b_own_client_id()
        ));

      CREATE POLICY client_ins ON public.sp_b2b_documents
        FOR INSERT TO authenticated
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.sp_b2b_submissions s
          WHERE s.id = sp_b2b_documents.submission_id
            AND s.client_id = public.sp_b2b_own_client_id()
        ));

      CREATE POLICY admin_sel ON public.sp_b2b_documents
        FOR SELECT TO authenticated
        USING (public.sp_b2b_is_admin());
    $sql$;
  END IF;
END $$;

-- ── 4. Trigger BEFORE INSERT: status jujur + validasi produk ────────────────
CREATE OR REPLACE FUNCTION public.trg_b2b_submission_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  -- Status awal selalu SUBMITTED, apa pun yang dikirim klien. Insert internal
  -- tidak ada: satu-satunya pembuat pengajuan adalah klien.
  NEW.status := 'SUBMITTED';
  IF NEW.product_type NOT IN ('FLEET_MV', 'BONDING', 'GROUP_HEALTH') THEN
    RAISE EXCEPTION 'product_type tidak valid: %', NEW.product_type;
  END IF;
  -- Kolom internal admin tidak boleh diisi pembuatnya.
  NEW.admin_notes := NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_b2b_submission_integrity ON public.sp_b2b_submissions;
CREATE TRIGGER trg_b2b_submission_integrity
  BEFORE INSERT ON public.sp_b2b_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_b2b_submission_before_insert();

-- ── 5. Trigger AFTER INSERT: notifikasi admin (P0-1 audit) ──────────────────
-- Menutup celah "pengajuan baru diam-diam": admin baru tahu bila kebetulan
-- membuka tab. SECURITY DEFINER karena sp_admin_notifications tidak boleh
-- bisa ditulis langsung oleh token klien di luar trigger ini.
CREATE OR REPLACE FUNCTION public.trg_b2b_submission_new_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.sp_admin_notifications (type, title, body, metadata, read)
  VALUES (
    'B2B_SUBMISSION_NEW',
    'Pengajuan B2B Baru — ' || NEW.company_name,
    NEW.company_name || ' mengajukan ' || NEW.product_type
      || '. PIC: ' || coalesce(NEW.pic_name, '-') || ' (' || coalesce(NEW.pic_phone, '-') || ').'
      || ' Tinjau di CMS: B2B → B2B Submissions.',
    jsonb_build_object(
      'submission_id', NEW.id,
      'product_type',  NEW.product_type,
      'client_id',     NEW.client_id
    ),
    false
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_b2b_submission_notify ON public.sp_b2b_submissions;
CREATE TRIGGER trg_b2b_submission_notify
  AFTER INSERT ON public.sp_b2b_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_b2b_submission_new_notify();

-- ── 6. Index penunjang policy & listing ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sp_b2b_quotes_client      ON public.sp_b2b_quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_sp_b2b_quotes_submission  ON public.sp_b2b_quotes(submission_id);
CREATE INDEX IF NOT EXISTS idx_sp_b2b_submissions_client ON public.sp_b2b_submissions(client_id);
DO $$ BEGIN
  IF to_regclass('public.sp_b2b_documents') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sp_b2b_documents_submission ON public.sp_b2b_documents(submission_id)';
  END IF;
END $$;
