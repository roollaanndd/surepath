-- Kolom pengiriman polis ke sp_policy_orders
-- v2.7.38 — biaya kirim mengikuti pilihan mitra:
--   DIGITAL      = Rp 0
--   POS_STANDARD = Rp 10.000 (Jabodetabek) / Rp 15.000 (Luar)
--   POS_OVERNIGHT= Rp 20.000 (Jabodetabek) / Rp 25.000 (Luar)
--
-- Baris lama tetap valid — DEFAULT 'DIGITAL'/0 sudah konsisten dengan
-- total_premium yang dulu menyertakan Rp 20.000 flat.
ALTER TABLE sp_policy_orders
  ADD COLUMN IF NOT EXISTS delivery_method  TEXT    DEFAULT 'DIGITAL',
  ADD COLUMN IF NOT EXISTS delivery_region  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee     INTEGER DEFAULT 0;

COMMENT ON COLUMN sp_policy_orders.delivery_method IS 'DIGITAL | POS_STANDARD | POS_OVERNIGHT';
COMMENT ON COLUMN sp_policy_orders.delivery_region  IS 'JABODETABEK | LUAR_JABODETABEK — null bila delivery_method=DIGITAL';
COMMENT ON COLUMN sp_policy_orders.delivery_fee     IS 'Biaya kirim polis dalam Rupiah; 0 untuk Polis Digital';
