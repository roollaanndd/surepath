// ─────────────────────────────────────────────────────────────────────────────
// bulkTools — Pathy membedah file Excel/CSV yang diunggah mitra B2B.
//
// Menepati janji yang sudah tertulis di B2BBulkImport ("Pathy bisa membaca
// Excel") sejak rencana awal: klien mem-parse workbook di browser-nya sendiri
// (services/b2bBulkParser.ts — formula/scripts TIDAK dievaluasi, hanya nilai
// sel) dan mengirim ringkasan + baris sampel sebagai lampiran SHEET. Tool di
// sini yang menghitung: setiap baris kendaraan dinilai pakai tarif OJK yang
// aktif (calcPremium) — angka TIDAK pernah diarang model.
//
// Sengaja read-only: hasil analisa tidak menyentuh sp_b2b_submissions atau
// tabel uang apa pun. Pengunggah tetap yang menekan kirim di alur bulk resmi.
// ─────────────────────────────────────────────────────────────────────────────

import {
  calcPremium, getZone, loadRateSet, type AddOns, type CoverageType,
  type RateSet, type VehicleType, type Zone,
} from '../_shared/ojk.ts';
import type { ToolContext, ToolOutcome } from './common.ts';
import { clamp, num, str } from './common.ts';
import { PRICE_DISCLAIMER } from './disclaimers.ts';

export const MAX_SHEET_ROWS = 200;

/** Baris SHEET dikirim klien sebagai field `row_1..row_N` berisi JSON array. */
function sheetRows(doc: { fields: Record<string, unknown> }): { headers: string[]; rows: unknown[][] } {
  let headers: string[] = [];
  try {
    const h = JSON.parse(String(doc.fields.headers ?? '[]'));
    if (Array.isArray(h)) headers = h.map(x => String(x));
  } catch { /* headers rusak — baris tetap dicoba dipetakan posisional */ }

  const rows: unknown[][] = [];
  for (let i = 1; i <= MAX_SHEET_ROWS; i++) {
    const raw = doc.fields[`row_${i}`];
    if (raw === undefined || raw === null) continue;
    try {
      const parsed = JSON.parse(String(raw));
      if (Array.isArray(parsed)) rows.push(parsed);
    } catch { /* baris satu ini rusak, lanjut */ }
  }
  return { headers, rows };
}

const HEADER_HINTS = {
  vehicle: ['vehicle_type', 'jenis', 'kendaraan', 'tipe kendaraan', 'car/motor', 'mobil/motor'],
  si: ['sum_insured', 'nilai', 'harga', 'tsi', 'pertanggungan', 'nilai pertanggungan', 'harga kendaraan'],
  province: ['provinsi', 'province', 'wilayah', 'daerah'],
  coverage: ['coverage', 'pertanggungan_jenis', 'jenis pertanggungan', 'kondisi', 'comprehensive', 'tlo'],
  name: ['nama', 'name', 'pemilik', 'tertanggung', 'unit', 'keterangan'],
};

function findCol(headers: string[], hints: string[]): number {
  for (const hint of hints) {
    const idx = headers.findIndex(h => h.toLowerCase().trim().includes(hint));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseVehicleType(v: unknown): VehicleType {
  const s = String(v ?? '').toLowerCase();
  return /(motor|sepeda motor|motorcycle|roda ?2)/.test(s) && !/mobil/.test(s)
    ? 'MOTORCYCLE'
    : 'CAR';
}

function parseCoverage(v: unknown): CoverageType {
  return String(v ?? '').toUpperCase().includes('TLO') ? 'TLO' : 'COMPREHENSIVE';
}

const NO_ADDONS: AddOns = {
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
};

export function bulkToolSchemas(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'analyze_bulk_pricing',
        description:
          'Bedah lampiran Excel/CSV (SHEET) berisi daftar kendaraan: hitung estimasi premi OJK untuk SETIAP baris ' +
          'plus totalnya, dan laporkan baris yang datanya kurang/salah. WAJIB dipakai saat pengguna (terutama mitra B2B) ' +
          'minta "bedah/dianalisa/hitung" file yang dilampirkan — jangan pernah menghitung sendiri atau menebak isinya.',
        parameters: {
          type: 'object',
          properties: {
            coverage: {
              type: 'string',
              enum: ['COMPREHENSIVE', 'TLO'],
              description: 'Jenis pertanggungan default bila kolomnya tidak ada di file. Default COMPREHENSIVE.',
            },
          },
        },
      },
    },
  ];
}

export const isBulkTool = (name: string) => name === 'analyze_bulk_pricing';

export async function runBulkTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  if (name !== 'analyze_bulk_pricing') return { result: { error: `Tool tidak dikenal: ${name}` } };

  const sheets = (ctx.documents ?? []).filter(d => d.type === 'SHEET');
  if (sheets.length === 0) {
    return { result: { error: 'Tidak ada lampiran Excel/CSV di pesan ini. Minta pengguna melampirkannya dulu.' } };
  }

  const defaultCoverage: CoverageType = str(args.coverage, 20).toUpperCase() === 'TLO' ? 'TLO' : 'COMPREHENSIVE';
  const rs: RateSet = ctx.rateSet ?? await loadRateSet(ctx.db);
  ctx.rateSet = rs;

  const doc = sheets[0];
  const { headers, rows } = sheetRows(doc);
  if (rows.length === 0) {
    return { result: { error: 'File terbaca tapi tidak berisi baris data yang bisa diproses.' } };
  }

  const col = {
    vehicle: findCol(headers, HEADER_HINTS.vehicle),
    si: findCol(headers, HEADER_HINTS.si),
    province: findCol(headers, HEADER_HINTS.province),
    coverage: findCol(headers, HEADER_HINTS.coverage),
    name: findCol(headers, HEADER_HINTS.name),
  };

  const results: Record<string, unknown>[] = [];
  let totalPremium = 0;
  let okCount = 0;
  let errCount = 0;

  rows.forEach((row, i) => {
    const pick = (idx: number) => (idx >= 0 ? row[idx] : undefined);
    const label = str(pick(col.name) ?? `Baris ${i + 1}`, 60);
    const siValue = Math.round(num(
      typeof pick(col.si) === 'string' ? Number(String(pick(col.si)).replace(/[^\d.]/g, '')) : pick(col.si),
      0,
    ));

    const fail = (reason: string) => {
      errCount += 1;
      results.push({ baris: i + 1, nama: label, error: reason });
    };

    if (!siValue || siValue < 5_000_000 || siValue > 20_000_000_000) {
      fail(`Nilai pertanggungan tidak valid (${siValue || 'kosong'}). Wajib Rp 5 juta - Rp 20 miliar.`);
      return;
    }

    const province = str(pick(col.province), 60);
    const zone: Zone = province ? getZone(rs, province) : 3;
    const coverage: CoverageType = col.coverage >= 0 && pick(col.coverage) != null
      ? parseCoverage(pick(col.coverage))
      : defaultCoverage;
    const vehicleType = parseVehicleType(pick(col.vehicle));

    try {
      const breakdown = calcPremium(rs, vehicleType, coverage, siValue, zone, NO_ADDONS, 'MIN');
      okCount += 1;
      totalPremium += breakdown.total;
      results.push({
        baris: i + 1,
        nama: label,
        kendaraan: vehicleType,
        nilai_pertanggungan: siValue,
        provinsi: province || null,
        zona: zone,
        jenis: coverage,
        estimasi_premi: breakdown.total,
      });
    } catch (e) {
      fail(`Gagal menghitung: ${e instanceof Error ? e.message : 'kesalahan tak dikenal'}`);
    }
  });

  const truncated = doc.fields.rows_total != null && Number(doc.fields.rows_total) > rows.length;

  return {
    result: {
      file: str(doc.label ?? doc.fields.file_name, 80),
      kolom_terdeteksi: {
        kendaraan: col.vehicle >= 0 ? headers[col.vehicle] : null,
        nilai: col.si >= 0 ? headers[col.si] : null,
        provinsi: col.province >= 0 ? headers[col.province] : null,
        coverage: col.coverage >= 0 ? headers[col.coverage] : null,
        nama: col.name >= 0 ? headers[col.name] : null,
      },
      ringkasan: {
        baris_diproses: rows.length,
        berhasil: okCount,
        gagal: errCount,
        total_estimasi_premi: totalPremium,
        dipotong: truncated ? `File punya ${String(doc.fields.rows_total)} baris; hanya ${rows.length} pertama dianalisa.` : null,
        band_tarif: 'MIN (batas bawah OJK, tanpa perluasan)',
        disclaimer: PRICE_DISCLAIMER,
      },
      hasil: results.slice(0, 120),
      gagal_hitung: results.filter(r => r.error).length > 0
        ? results.filter(r => r.error).slice(0, 40)
        : null,
    },
    card: {
      type: 'bulk_analysis',
      data: {
        file: str(doc.label ?? doc.fields.file_name, 80),
        berhasil: okCount,
        gagal: errCount,
        total_premium: totalPremium,
        rows: results.filter(r => !r.error).slice(0, 30),
        errors: results.filter(r => r.error).slice(0, 10),
        band: 'MIN',
      },
    },
  };
}

// clamp dipakai kalau nanti perlu membatasi jumlah baris yang dirender kartu;
// diimpor eksplisit agar linter tidak menandai modul ini tidak konsisten.
export const _sheetRowsClamp = (n: number) => clamp(n, 0, MAX_SHEET_ROWS);
