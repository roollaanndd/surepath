import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Penjaga kode produk wizard kendaraan Mitra.
 *
 * `productInfo()` di VehicleUnderwritingWizard dulu merangkai
 * `MRKB` + `B4` → "MRKBB4-COMP". Tidak satu pun baris `sp_product_configs`
 * memakai kode itu (yang ada: MRKB4-COMP, MRKB4-TLO, MRKB2-COMP, MRKB2-TLO),
 * sehingga `getProductConfig()` selalu mengembalikan null dan SEMUA order
 * Mitra di produksi tersimpan dengan kode produk yang tidak dikenali laporan.
 *
 * Komponennya tidak dapat diimpor di lingkungan tes Node (rantai impornya
 * menarik Supabase + aset Vite), jadi penjaga ini membaca sumbernya langsung
 * — cukup untuk mengunci bentuk kode yang benar.
 */

const SOURCE = readFileSync(
  resolve(__dirname, '../../components/agent/VehicleUnderwritingWizard.tsx'),
  'utf8',
);

const VALID_CODES = ['MRKB4-COMP', 'MRKB4-TLO', 'MRKB2-COMP', 'MRKB2-TLO'];

/** Reimplementasi 1:1 dari productInfo() agar nilainya dapat diuji. */
function productCode(vehicleType: 'CAR' | 'MOTORCYCLE', coverageType: 'COMPREHENSIVE' | 'TLO') {
  const covCode = coverageType === 'COMPREHENSIVE' ? 'COMP' : 'TLO';
  const typeCode = vehicleType === 'CAR' ? '4' : '2';
  return `MRKB${typeCode}-${covCode}`;
}

describe('kode produk wizard kendaraan Mitra', () => {
  it('menghasilkan tepat empat kode yang dikenali sp_product_configs', () => {
    const produced = [
      productCode('CAR', 'COMPREHENSIVE'),
      productCode('CAR', 'TLO'),
      productCode('MOTORCYCLE', 'COMPREHENSIVE'),
      productCode('MOTORCYCLE', 'TLO'),
    ];
    expect(produced.sort()).toEqual([...VALID_CODES].sort());
  });

  it('tidak pernah menghasilkan kode ganda "MRKBB"', () => {
    expect(productCode('CAR', 'COMPREHENSIVE')).not.toContain('MRKBB');
  });

  it('sumber wizard memakai typeCode tanpa huruf B ganda', () => {
    expect(SOURCE).toContain("const typeCode = vehicleType === 'CAR' ? '4' : '2';");
    expect(SOURCE).not.toContain("? 'B4' : 'B2'");
  });

  it('wizard tidak lagi memasang slider diskon yang diabaikan gateway', () => {
    // create_policy_order menimpa discount_rate dengan 0 bila tidak ada kode
    // promo tervalidasi, jadi kontrol diskon bebas di layar ini menjanjikan
    // potongan yang tidak pernah terjadi.
    expect(SOURCE).not.toContain('setDiscountRate');
  });
});
