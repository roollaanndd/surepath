// v2.8.18 — Quotation Excel builder: engine → workbook → read-back.
// Angka premi dibuat oleh engine fleet sungguhan (calcBulkPremium), bukan
// fixture hardcoded, agar rantai penuh engine→Excel teruji.
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  buildBulkQuoteWorkbook,
  quoteRowFromBatchItem,
  quoteRowFromLineItem,
  type QuoteExcelRow,
} from '../b2bBulkQuoteExcel';
import {
  buildLineItem, calcBulkPremium, calcBulkTotals, DEFAULT_BULK_RATE_CONFIG,
} from '../b2bFleetRating';
import { CAR_TLO_MIN, getBaseRateByBand, getVehicleCategory } from '../ojkRates';
import type { SpB2BBatchItem } from '../b2bBulk';

describe('buildBulkQuoteWorkbook', () => {
  // Engine sungguhan — sama dengan yang dipakai layar review & server.
  const lineItems = [
    { nasabahName: 'Budi Santoso', contractNo: 'MMF-0001', financingValue: 25_000_000, otr: 32_000_000, tenorMonths: 24, jenisBrg: 'SEPEDA MOTOR', plateNo: 'B 1234 ABC', regionText: 'JAKARTA SELATAN' },
    { nasabahName: 'Siti Aminah', contractNo: 'MMF-0002', financingValue: 180_000_000, otr: 220_000_000, tenorMonths: 36, jenisBrg: 'MOBIL', plateNo: 'L 9999 XY', regionText: 'SURABAYA' },
    { nasabahName: 'PT Tambang Jaya', contractNo: 'MMF-0003', financingValue: 1_500_000_000, otr: 0, tenorMonths: 12, jenisBrg: 'EXCAVATOR', plateNo: '', regionText: '' },
  ].map((raw, i) => buildLineItem({ rowNo: i + 1, ...raw }));

  const previewRows: QuoteExcelRow[] = lineItems.map((it, i) =>
    quoteRowFromLineItem(it, {
      nasabahName: ['Budi Santoso', 'Siti Aminah', 'PT Tambang Jaya'][i],
      contractNo: ['MMF-0001', 'MMF-0002', 'MMF-0003'][i],
      financingValue: [25_000_000, 180_000_000, 1_500_000_000][i],
      otr: [32_000_000, 220_000_000, 0][i],
      tenorMonths: [24, 36, 12][i],
    }),
  );

  it('mengembalikan angka total identik dengan calcBulkTotals engine', () => {
    const { totals } = buildBulkQuoteWorkbook(previewRows);
    const engineTotals = calcBulkTotals(lineItems);
    expect(totals.itemCount).toBe(3);
    expect(totals.totalPremiumGross).toBe(engineTotals.totalPremiumGross);
    expect(totals.totalDiscount).toBe(engineTotals.totalDiscount);
    expect(totals.totalPremiumNet).toBe(engineTotals.totalPremiumNet);
    expect(totals.totalAdminFee).toBe(engineTotals.totalAdminFee);
    expect(totals.totalAmount).toBe(engineTotals.totalAmount);
    // Premi hasil engine harus > 0 — bukan workbook kosong.
    expect(totals.totalAmount).toBeGreaterThan(0);
  });

  it('sheet Quotation berisi header lengkap + angka premi per baris yang bisa dibaca ulang', () => {
    const { base64 } = buildBulkQuoteWorkbook(previewRows, { batchNumber: 'B2B-2026-001', companyName: 'PT MMF' });
    const wb = XLSX.read(base64, { type: 'base64' });
    expect(wb.SheetNames).toContain('Quotation');

    const aoa = XLSX.utils.sheet_to_json<Array<unknown>>(wb.Sheets['Quotation'], { header: 1, defval: null });
    const headerIdx = aoa.findIndex(row => Array.isArray(row) && row.includes('Total Premi (Rp)'));
    expect(headerIdx).toBeGreaterThan(0); // judul + meta di atasnya

    const header = aoa[headerIdx] as Array<string>;
    ['Premi Gross (Rp)', 'Diskon (Rp)', 'Premi Setelah Diskon (Rp)', 'Biaya Admin (Rp)', 'Total Premi (Rp)']
      .forEach(col => expect(header).toContain(col));

    // Baris data pertama: total premi di sheet = total premi engine.
    const firstData = aoa[headerIdx + 1] as Array<string | number>;
    expect(firstData[1]).toBe('Budi Santoso');
    expect(firstData[14]).toBe(lineItems[0].totalPremium);
    expect(firstData[9]).toBe(lineItems[0].premiumGross);

    // Baris TOTAL di bawah data.
    const totalRow = aoa[headerIdx + 1 + previewRows.length + 1] as Array<string | number>;
    expect(totalRow[0]).toBe('TOTAL');
    expect(totalRow[14]).toBe(calcBulkTotals(lineItems).totalAmount);
  });

  it('sheet Ringkasan memuat total ditagihkan + breakdown per kelas', () => {
    const { base64 } = buildBulkQuoteWorkbook(previewRows);
    const wb = XLSX.read(base64, { type: 'base64' });
    expect(wb.SheetNames).toContain('Ringkasan');
    const aoa = XLSX.utils.sheet_to_json<Array<unknown>>(wb.Sheets['Ringkasan'], { header: 1, defval: null });
    const flat = aoa.flat().map(String);
    expect(flat).toContain('Total Ditagihkan (Rp)');
    expect(flat.some(v => v === 'MOTOR' || v === 'MOBIL')).toBe(true);
    // Nilai total ditagihkan ada di sebelah labelnya.
    const labelIdx = aoa.findIndex(row => Array.isArray(row) && row[0] === 'Total Ditagihkan (Rp)');
    expect(aoa[labelIdx][1]).toBe(calcBulkTotals(lineItems).totalAmount);
  });

  it('adapter batch item server (snake_case) memetakan kolom uang apa adanya', () => {
    const item = {
      id: 'it-1', batch_id: 'b1', row_no: 1, nasabah_name: 'Andi', nasabah_ktp: null,
      nasabah_phone: null, nasabah_address: null, contract_no: 'C-9', contract_date: null,
      tenor_months: 24, financing_value: 30_000_000, vehicle_class: 'MOTORCYCLE' as const,
      make: 'Honda', model: 'Beat', model_year: 2024, otr: 19_000_000, plate_no: 'B 1 A',
      chassis_no: null, engine_no: null, bpkb_no: null, region_text: null, zone: 1 as const,
      coverage_type: 'TLO', rate: 0.0032, premium_gross: 96_000, discount_rate: 0.25,
      discount_amount: 24_000, premium_after_discount: 72_000, admin_fee: 25_000,
      total_premium: 97_000, flags: [], status: 'PENDING' as const,
      policy_number: null, certificate_document_url: null,
      created_at: '', updated_at: '',
    } satisfies SpB2BBatchItem;
    const row = quoteRowFromBatchItem(item);
    expect(row.totalPremium).toBe(97_000);
    expect(row.discountAmount).toBe(24_000);
    expect(row.kelasUnit).toBe('MOTORCYCLE');
    const { totals } = buildBulkQuoteWorkbook([row]);
    expect(totals.totalAmount).toBe(97_000);
  });

  it('baris dengan catatan membawa flag engine ke kolom Catatan', () => {
    // Zona tak terdeteksi → flag verifikasi manual.
    const flagged = buildLineItem({ rowNo: 1, nasabahName: 'X', financingValue: 20_000_000, otr: 0, tenorMonths: 12, jenisBrg: 'MOBIL', plateNo: '', regionText: '' });
    const row = quoteRowFromLineItem(flagged, { nasabahName: 'X', financingValue: 20_000_000, otr: 0, tenorMonths: 12 });
    expect(row.catatan).toBeTruthy();
  });
});

// Sanity engine: arahan owner (2026-11-11) — premi = nilai pencairan × rate
// OJK batas bawah per zona × tenor/12 (rate acuan 12 bulan); disc = premi ×
// 25%; biaya admin flat Rp 25.000; total = premi − disc + admin.
describe('engine smoke', () => {
  const motorRate = getBaseRateByBand('MOTORCYCLE', 'TLO', 2, 1, 'MIN');

  it('motor: pro-rata tenor 3/6/12/18 bln dari rate 12 bulan, disc 25%, admin 25rb', () => {
    expect(motorRate).toBeGreaterThan(0);
    for (const tenor of [3, 6, 12, 18]) {
      const p = calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 25_000_000, otr: 0, tenorMonths: tenor });
      expect(p.rate).toBe(motorRate); // rate OJK batas bawah, sesuai zona
      const premi = Math.round(25_000_000 * motorRate * (tenor / 12));
      expect(p.premiumGross).toBe(premi);
      const disc = Math.round(premi * 0.25);
      expect(p.discountRate).toBe(0.25);
      expect(p.discountAmount).toBe(disc);
      expect(p.premiumAfterDiscount).toBe(premi - disc);
      expect(p.adminFee).toBe(25_000);
      expect(p.totalPremium).toBe(premi - disc + 25_000);
    }
  });

  it('mobil: rate dari tabel lantai TLO OJK (kategori OTR × zona), basis premi tetap nilai pencairan', () => {
    const cat = getVehicleCategory(150_000_000);
    const rate = CAR_TLO_MIN[cat][2];
    const p = calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 120_000_000, otr: 150_000_000, tenorMonths: 18 });
    expect(p.rate).toBe(rate);
    const premi = Math.round(120_000_000 * rate * (18 / 12));
    expect(p.premiumGross).toBe(premi);
    expect(p.discountAmount).toBe(Math.round(premi * 0.25));
    expect(p.totalPremium).toBe(premi - Math.round(premi * 0.25) + 25_000);
  });

  it('tanpa lantai: premi kecil mengikuti formula penuh (motor 5jt, 3 bln → Rp 22.500)', () => {
    const p = calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 5_000_000, otr: 0, tenorMonths: 3 });
    expect(p.premiumGross).toBe(Math.round(5_000_000 * motorRate * (3 / 12)));
    expect(p.premiumGross).toBe(22_500);
  });

  it('lantai premi tetap bisa diaktifkan via rate config admin (mekanisme utuh)', () => {
    const floored = calcBulkPremium(
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 5_000_000, otr: 0, tenorMonths: 3 },
      { ...DEFAULT_BULK_RATE_CONFIG, minPremiumGross: 50_000 },
    );
    expect(floored.premiumGross).toBe(50_000);
  });
});
