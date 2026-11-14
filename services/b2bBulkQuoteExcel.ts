// ─────────────────────────────────────────────────────────────────────────────
// b2bBulkQuoteExcel — Quotation Excel untuk batch bulk B2B (v2.8.18).
//
// Menepati flow yang diminta mitra: klien mengunggah Excel berisi ratusan
// motor/mobil, mesin fleet (b2bFleetRating.calcBulkPremium) menghitung premi
// per baris, dan file yang kembali ke klien adalah quotation Excel dengan
// kolom uang terisi (rate, premi gross, diskon, premi setelah diskon, biaya
// admin, total premi) sesuai zona dan cover TLO armada.
//
// Disiplin uang: builder ini MURNI format. Setiap rupiah yang masuk berasal
// dari mesin hitung — nilai preview klien (buildLineItem, engine yang sama
// dengan server, diuji paritas) atau recompute otoritatif di data-gateway
// (b2b_bulk_create_batch). Tidak ada satu pun aritmetika premi baru di sini;
// satu-satunya penjumlahan adalah total kolom lewat calcBulkTotals agar
// identik dengan cara server menjumlahkan batch.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx';
import { calcBulkTotals, type BulkTotals, type VehicleClass, type Zone } from './b2bFleetRating';
import type { BuiltLineItem, RawBulkRow } from './b2bFleetRating';
import type { SpB2BBatchItem } from './b2bBulk';

export interface QuoteExcelRow {
  nama: string;
  contractNo?: string;
  kelasUnit: VehicleClass;
  zona: Zone;
  financingValue: number;
  otr?: number;
  tenorMonths: number;
  rate: number;
  premiumGross: number;
  discountRate: number;
  discountAmount: number;
  premiumAfterDiscount: number;
  adminFee: number;
  totalPremium: number;
  // v2.9.1 — perluasan + paket (opsional; 0 untuk baris lama & impor massal).
  addonPremium?: number;
  planLoading?: number;
  planName?: string;
  catatan?: string;
}

export const BULK_CLASS_LABEL: Record<VehicleClass, string> = {
  MOTORCYCLE: 'MOTOR',
  CAR: 'MOBIL',
  HEAVY_EQUIPMENT: 'ALAT BERAT',
};

const QUOTE_HEADERS = [
  'No', 'Nama Nasabah', 'No. Kontrak', 'Kelas Unit', 'Zona',
  'Nilai Pembiayaan (Rp)', 'OTR (Rp)', 'Tenor (bln)',
  'Rate (%)', 'Premi Gross (Rp)', 'Diskon (%)', 'Diskon (Rp)',
  'Premi Setelah Diskon (Rp)', 'Biaya Admin (Rp)', 'Total Premi (Rp)', 'Catatan',
];

const RINGKASAN_TITLE = 'RINGKASAN QUOTATION TLO ARMADA';

const DISCLAIMER =
  'Rate mengacu pada tarif TLO OJK (SEOJK No. 6/SEOJK.05/2017 Lampiran IV) ' +
  'dan rate set armada yang aktif; angka final mengikuti verifikasi underwriting.';

/** Server-authoritative batch item (sp_b2b_batch_items) → baris quotation. */
export function quoteRowFromBatchItem(it: SpB2BBatchItem): QuoteExcelRow {
  return {
    nama: it.nasabah_name || `Baris ${it.row_no}`,
    contractNo: it.contract_no ?? undefined,
    kelasUnit: it.vehicle_class,
    zona: it.zone,
    financingValue: it.financing_value,
    otr: it.otr ?? undefined,
    tenorMonths: it.tenor_months,
    rate: it.rate,
    premiumGross: it.premium_gross,
    discountRate: it.discount_rate,
    discountAmount: it.discount_amount,
    premiumAfterDiscount: it.premium_after_discount,
    adminFee: it.admin_fee,
    totalPremium: it.total_premium,
    addonPremium: it.addon_premium ?? 0,
    planLoading: it.plan_loading ?? 0,
    catatan: batchItemNotes(it),
  };
}

// Catatan baris: flag verifikasi + (order unit, v2.8.23) periode pertanggungan,
// penyusutan multi-tahun, dan diskon yang tidak dicetak di polis. Murni teks —
// tidak ada angka premi yang dihitung di sini.
function batchItemNotes(it: SpB2BBatchItem): string | undefined {
  const notes: string[] = [...(it.flags ?? [])];
  if (it.coverage_type && it.coverage_type !== 'TLO') {
    notes.push(`Pertanggungan: ${it.coverage_type === 'COMPREHENSIVE' ? 'Comprehensive' : it.coverage_type}`);
  }
  if (it.coverage_start_date && it.coverage_end_date) {
    notes.push(`Periode ${it.coverage_start_date} s/d ${it.coverage_end_date}`);
  }
  if (it.depreciation_rate > 0) {
    notes.push(`Multi-tahun: nilai pertanggungan menyusut ${Number((it.depreciation_rate * 100).toFixed(2))}% per tahun`);
  }
  if (it.discount_shown_on_policy === false && it.discount_amount > 0) {
    notes.push('Diskon tidak tertera di polis');
  }
  return notes.length ? notes.join(' | ') : undefined;
}

/** Preview line item di layar review (B2BBulkImport) + baris mentah → quotation. */
export function quoteRowFromLineItem(
  item: BuiltLineItem,
  raw: Pick<RawBulkRow, 'nasabahName' | 'contractNo' | 'financingValue' | 'otr' | 'tenorMonths'>,
  extras: { planName?: string } = {},
): QuoteExcelRow {
  return {
    nama: raw.nasabahName || `Baris ${item.rowNo}`,
    contractNo: raw.contractNo,
    kelasUnit: item.vehicleClass,
    zona: item.zone,
    financingValue: raw.financingValue,
    otr: raw.otr || undefined,
    tenorMonths: raw.tenorMonths,
    rate: item.rate,
    premiumGross: item.premiumGross,
    discountRate: item.discountRate,
    discountAmount: item.discountAmount,
    premiumAfterDiscount: item.premiumAfterDiscount,
    adminFee: item.adminFee,
    totalPremium: item.totalPremium,
    addonPremium: item.addonPremium,
    planLoading: item.planLoading,
    planName: extras.planName,
    catatan: item.flags.length ? item.flags.join(' | ') : undefined,
  };
}

export interface BulkQuoteOptions {
  companyName?: string;
  batchNumber?: string;
  sourceFileName?: string;
}

export interface BulkQuoteWorkbook {
  base64: string;
  fileName: string;
  totals: BulkTotals;
}

export function buildBulkQuoteWorkbook(rows: QuoteExcelRow[], opts: BulkQuoteOptions = {}): BulkQuoteWorkbook {
  // calcBulkTotals hanya menjumlahkan kolom uang — persis seperti server.
  const totals = calcBulkTotals(rows.map(r => ({
    premiumGross: r.premiumGross,
    discountAmount: r.discountAmount,
    premiumAfterDiscount: r.premiumAfterDiscount,
    adminFee: r.adminFee,
    totalPremium: r.totalPremium,
    addonPremium: r.addonPremium ?? 0,
    planLoading: r.planLoading ?? 0,
  })));

  const today = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  const aoa: Array<Array<string | number>> = [
    [`QUOTATION ASURANSI TLO ARMADA${opts.companyName ? ` — ${opts.companyName}` : ''}`],
    [
      'No. Batch', opts.batchNumber ?? '-', '', 'Tanggal', today, '',
      'Jumlah Unit', rows.length, '',
      opts.sourceFileName ? `Sumber: ${opts.sourceFileName}` : '',
    ],
    [],
    QUOTE_HEADERS,
    ...rows.map((r, i) => ([
      i + 1,
      r.nama,
      r.contractNo ?? '-',
      BULK_CLASS_LABEL[r.kelasUnit],
      r.zona,
      r.financingValue,
      r.otr ?? 0,
      r.tenorMonths,
      Number((r.rate * 100).toFixed(4)),
      r.premiumGross,
      Number((r.discountRate * 100).toFixed(2)),
      r.discountAmount,
      r.premiumAfterDiscount,
      r.adminFee,
      r.totalPremium,
      r.catatan ?? '-',
    ])),
    [],
    [
      'TOTAL', '', '', '', '', '', '', '', '',
      totals.totalPremiumGross, '', totals.totalDiscount,
      totals.totalPremiumNet, totals.totalAdminFee, totals.totalAmount, '',
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 4 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 5 },
    { wch: 20 }, { wch: 16 }, { wch: 10 },
    { wch: 9 }, { wch: 16 }, { wch: 9 }, { wch: 14 },
    { wch: 22 }, { wch: 15 }, { wch: 16 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Quotation');

  // ── Sheet ringkasan: total batch + breakdown per kelas unit ───────────────
  const perClass = (Object.keys(BULK_CLASS_LABEL) as VehicleClass[]).map(k => {
    const cls = rows.filter(r => r.kelasUnit === k);
    return [
      BULK_CLASS_LABEL[k],
      cls.length,
      cls.reduce((s, r) => s + r.totalPremium, 0),
      cls.reduce((s, r) => s + r.financingValue, 0),
    ];
  });
  const ringkasan: Array<Array<string | number>> = [
    [RINGKASAN_TITLE + (opts.companyName ? ` — ${opts.companyName}` : '')],
    [],
    ['Keterangan', 'Nilai'],
    ['Jumlah Unit', totals.itemCount],
    ['Total Premi Gross (Rp)', totals.totalPremiumGross],
    ['Total Diskon (Rp)', totals.totalDiscount],
    ['Total Premi Setelah Diskon (Rp)', totals.totalPremiumNet],
    ['Total Biaya Admin (Rp)', totals.totalAdminFee],
    ['Total Ditagihkan (Rp)', totals.totalAmount],
    [],
    ['Kelas Unit', 'Jumlah Unit', 'Total Premi (Rp)', 'Total Pembiayaan (Rp)'],
    ...perClass,
    [],
    ['Catatan', DISCLAIMER],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(ringkasan);
  wsR['!cols'] = [{ wch: 34 }, { wch: 20 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsR, 'Ringkasan');

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const label = (opts.batchNumber || opts.companyName || 'B2B').replace(/[^\w-]+/g, '_');
  return { base64, fileName: `Quotation-TLO-${label}.xlsx`, totals };
}

/** Browser download — hanya dipanggil dari komponen (butuh DOM). */
export function downloadBulkQuoteExcel(rows: QuoteExcelRow[], opts: BulkQuoteOptions = {}): { fileName: string; totals: BulkTotals } {
  const { base64, fileName, totals } = buildBulkQuoteWorkbook(rows, opts);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { fileName, totals };
}
