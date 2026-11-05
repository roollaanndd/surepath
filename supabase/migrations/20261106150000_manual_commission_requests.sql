-- Manual commission & coin credit requests (v2.7.58).
--
-- Use-case: seorang mitra (AGENT) kadang menutup polis di luar aplikasi
-- (telepon, kunjungan langsung, mitra institusi). Komisi dan koinnya tetap
-- harus tercatat di wallet mereka. Finance butuh jalur manual untuk itu,
-- tapi karena bersentuhan dengan uang asli dan nilai bisa diisi bebas,
-- setiap permintaan WAJIB disetujui MASTER_ADMIN (four-eyes) sebelum
-- memanggil credit_agent_wallet.
--
-- Status transitions (dipaksakan di gateway, bukan trigger):
--   PENDING   → APPROVED  → APPLIED   (jalur normal)
--   PENDING   → REJECTED               (ditolak, final)
--
-- APPROVED dan APPLIED dipisah agar kegagalan RPC `credit_agent_wallet`
-- tidak membuat request stuck di status yang mengklaim sudah tereksekusi.
-- Approval berhasil → status=APPROVED + decided_* diisi; satu transaction
-- lanjutan di gateway memanggil RPC dan kalau sukses pindah ke APPLIED
-- sambil mencatat applied_wallet_tx_id.

CREATE TABLE IF NOT EXISTS public.sp_manual_commission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id uuid NOT NULL REFERENCES public.sp_users(id) ON DELETE RESTRICT,
  commission_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  coin_amount integer NOT NULL DEFAULT 0 CHECK (coin_amount >= 0),

  -- Konteks bisnis: nomor polis/offline order yang jadi dasar permintaan,
  -- dan alasan bebas. Keduanya tampil ke MASTER_ADMIN saat memutuskan.
  policy_ref text,
  reason text NOT NULL,

  requested_by uuid NOT NULL REFERENCES public.sp_users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED')),

  -- Four-eyes: tidak boleh sama dengan requested_by. Dicek di gateway juga,
  -- CHECK ini jadi safety-net bila ada aksi langsung dari SQL.
  decided_by uuid REFERENCES public.sp_users(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  decision_note text,

  -- Transaksi wallet yang dibuat setelah RPC `credit_agent_wallet` sukses.
  -- NULL sampai status=APPLIED.
  applied_wallet_tx_id uuid REFERENCES public.sp_wallet_transactions(id) ON DELETE SET NULL,
  applied_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Minimal satu nominal harus > 0 — permintaan dengan 0 komisi & 0 koin
  -- sia-sia dan menyumbat antrean.
  CONSTRAINT nonzero_credit CHECK (commission_amount > 0 OR coin_amount > 0),
  CONSTRAINT four_eyes_distinct CHECK (decided_by IS NULL OR decided_by <> requested_by),
  CONSTRAINT decided_fields_consistent CHECK (
    (status IN ('PENDING')) =
    (decided_by IS NULL AND decided_at IS NULL)
  ),
  CONSTRAINT applied_fields_consistent CHECK (
    (status = 'APPLIED') = (applied_wallet_tx_id IS NOT NULL AND applied_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sp_manual_commission_requests_status
  ON public.sp_manual_commission_requests(status);
CREATE INDEX IF NOT EXISTS idx_sp_manual_commission_requests_agent
  ON public.sp_manual_commission_requests(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_manual_commission_requests_requested_by
  ON public.sp_manual_commission_requests(requested_by, created_at DESC);

-- Deny-all RLS — gateway service_role saja (konsisten dengan tabel wallet &
-- payments). Tidak ada akses langsung dari browser.
ALTER TABLE public.sp_manual_commission_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_manual_commission_requests_deny_all
  ON public.sp_manual_commission_requests;

CREATE POLICY sp_manual_commission_requests_deny_all
  ON public.sp_manual_commission_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.sp_manual_commission_requests IS
  'Permintaan kredit komisi+koin manual (v2.7.58). Four-eyes: MASTER_ADMIN wajib menyetujui sebelum credit_agent_wallet dipanggil. Gateway-only access (deny-all RLS).';
