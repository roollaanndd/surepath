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
import { buildLineItem, calcBulkPremium, calcBulkTotals } from '../b2bFleetRating';
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

// Sanity engine: sifat mesin yang bisa diandalkan quotation (bukan asumsi
// lintas kelas — rate TLO motor di tabel lantai OJK memang lebih tinggi dari
// mobil pada nilai pembiayaan sama).
describe('engine smoke', () => {
  it('pro-rata tenor: tenor 24 > tenor 12 untuk unit sama, angka bulat rupiah', () => {
    const t12 = calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 1, financingValue: 100_000_000, otr: 0, tenorMonths: 12 });
    const t24 = calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 1, financingValue: 100_000_000, otr: 0, tenorMonths: 24 });
    expect(t12.totalPremium).toBeGreaterThan(0);
    expect(t24.totalPremium).toBeGreaterThan(t12.totalPremium);
    expect(t12.totalPremium).toBe(Math.round(t12.totalPremium));
    expect(t24.totalPremium).toBe(Math.round(t24.totalPremium));
  });

  it('lantai premi minimum (Rp 50.000) ditegakkan untuk unit kecil', () => {
    const kecil = calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 3, financingValue: 2_000_000, otr: 0, tenorMonths: 12 });
    expect(kecil.premiumGross).toBeGreaterThanOrEqual(50_000);
    expect(kecil.totalPremium).toBeGreaterThan(0);
  });
});
