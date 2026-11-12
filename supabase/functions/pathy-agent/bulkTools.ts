// ─────────────────────────────────────────────────────────────────────────────
// bulkTools — Pathy membedah file Excel/CSV yang diunggah mitra B2B.
//
// Menepati janji yang sudah tertulis di B2BBulkImport ("Pathy bisa membaca
// Excel") sejak rencana awal: klien mem-parse workbook di browser-nya sendiri
// (services/b2bBulkParser.ts — formula/scripts TIDAK dievaluasi, hanya nilai
// sel) dan mengirim ringkasan + baris sampel sebagai lampiran SHEET. Tool di
// sini yang menghitung: angka TIDAK pernah diarang model.
//
// v2.8.18 — `analyze_bulk_pricing` punya dua mode, dipilih otomatis dari
// bentuk kolom file:
//  1. FLEET (kolom pembiayaan/tenor terdeteksi) — mesin yang SAMA dengan alur
//     impor resmi: _shared/b2bFleetRating.calcBulkPremium (TLO armada: zona
//     dari plat/wilayah, rate per kelas unit, pro-rata tenor, diskon, biaya
//     admin, lantai premi minimum, rate set admin yang aktif). Output per
//     baris: premi gross, diskon, premi setelah diskon, biaya admin, total
//     premi — persis kolom quotation Excel yang dikembalikan ke klien.
//     Identik dengan angka layar Tinjau Premi B2BBulkImport dan recompute
//     otoritatif server karena modul engine-nya satu dan diuji paritas.
//  2. STANDAR (polis per-unit) — calcPremium dari _shared/ojk.ts seperti
//     sebelum v2.8.18 (band MIN, tanpa perluasan).
//
// Sengaja read-only: hasil analisa tidak menyentuh sp_b2b_submissions atau
// tabel uang apa pun. Pengunggah tetap yang menekan kirim di alur bulk resmi.
// ─────────────────────────────────────────────────────────────────────────────

import {
  calcPremium, getZone, loadRateSet, type AddOns, type CoverageType,
  type RateSet, type VehicleType, type Zone,
} from '../_shared/ojk.ts';
import {
  calcBulkPremium, calcBulkTotals, classifyVehicleClass, detectZone,
  isLikelyCommercialBody, setActiveBulkRateConfig,
  type BulkPremiumResult, type BulkRateConfig, type VehicleClass,
} from '../_shared/b2bFleetRating.ts';
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

// ─── v2.8.18: mode fleet (TLO armada) ───────────────────────────────────────

const FLEET_HEADER_HINTS = {
  financing: ['financing', 'pembiayaan', 'pencairan', 'plafond', 'pinjaman'],
  tenor: ['tenor', 'jangka waktu'],
  otr: ['otr', 'harga pasar', 'harga kendaraan'],
  plate: ['plat', 'polisi', 'nopol'],
  region: ['wilayah', 'region', 'kota', 'area', 'daerah'],
  model: ['merk', 'merek', 'model', 'tipe'],
};

/** Kolom jenis UNIT ('MOBIL'/'MOTOR'/'EXCAVATOR') — bukan jenis pertanggungan. */
function findFleetJenisCol(headers: string[]): number {
  return headers.findIndex(h => {
    const s = h.toLowerCase().trim();
    return s.includes('jenis') && !s.includes('pertanggungan') && !s.includes('kondisi') && !s.includes('asuransi');
  });
}

/** Angka uang id-ID: "Rp 120.000.000", "1.250.000,5", "25.000" → ribuan; "12.5" → desimal. */
function parseMoney(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v !== 'string') return 0;
  let s = v.trim().replace(/rp/ig, '').replace(/[\s$]/g, '');
  if (!s) return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) s = s.replace(/\./g, '').replace(/,/g, '.');
  else if (hasComma) s = s.replace(/,/g, '.');
  else if (hasDot) {
    const groups = s.split('.');
    const last = groups[groups.length - 1];
    // "1.000.000"/"25.000" → pemisah ribuan (grup terakhir pas 3 digit); "12.5" → desimal.
    if (groups.length > 2 || (groups.length === 2 && last.length === 3 && groups[0].length <= 3 && s.length > 4)) {
      s = s.replace(/\./g, '');
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Bentuk rates sp_b2b_fleet_rate_sets — replika isValidRateConfig di
 *  data-gateway/actions/b2bSettings.ts (tidak bisa diimpor lintas function). */
function isValidFleetRateConfig(r: unknown): r is BulkRateConfig {
  if (!r || typeof r !== 'object') return false;
  const c = r as Record<string, unknown>;
  const pickup = c.pickupTruckTloMin as Record<string, unknown> | undefined;
  if (!pickup || typeof pickup !== 'object') return false;
  const numsOk = ['1', '2', '3'].every(z => typeof pickup[z] === 'number' && (pickup[z] as number) >= 0)
    && ['heavyEquipmentRate', 'discountRateStandard', 'discountRateHeavy',
      'adminFeeMotorcycle', 'adminFeeCar', 'adminFeeHeavy', 'minPremiumGross']
      .every(k => typeof c[k] === 'number' && (c[k] as number) >= 0);
  return numsOk;
}

/** Pasang rate set armada aktif (edit admin) sebelum harga dihitung — sama
 *  seperti loadActiveBulkRateConfig di data-gateway. Gagal diam-diam: pricing
 *  tidak boleh hard-fail karena edit admin yang rusak. */
// deno-lint-ignore no-explicit-any
async function loadActiveFleetRateConfig(db: any): Promise<void> {
  try {
    const { data } = await db.from('sp_b2b_fleet_rate_sets').select('rates').eq('is_active', true).maybeSingle();
    if (data?.rates && isValidFleetRateConfig(data.rates)) {
      setActiveBulkRateConfig(data.rates as BulkRateConfig);
    }
  } catch { /* keep built-in defaults */ }
}

const FLEET_CLASS_LABEL: Record<VehicleClass, string> = {
  MOTORCYCLE: 'MOTOR',
  CAR: 'MOBIL',
  HEAVY_EQUIPMENT: 'ALAT BERAT',
};

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
          'Bedah lampiran Excel/CSV (SHEET) berisi daftar kendaraan: hitung estimasi premi untuk SETIAP baris ' +
          'plus totalnya, dan laporkan baris yang datanya kurang/salah. Dua mode otomatis: (a) file census armada ' +
          'dengan kolom pembiayaan/tenor dihitung pakai mesin TLO armada B2B (premi gross, diskon, biaya admin, ' +
          'total premi per baris — sama dengan alur impor resmi), (b) file polis per-unit dihitung pakai tarif OJK ' +
          'standar. WAJIB dipakai saat pengguna (terutama mitra B2B) minta "bedah/dianalisa/hitung" file yang ' +
          'dilampirkan — jangan pernah menghitung sendiri atau menebak isinya.',
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

/** Mode FLEET: census armada (kolom pembiayaan/tenor) dinilai baris per baris
 *  dengan calcBulkPremium — engine yang sama dengan layar Tinjau Premi dan
 *  recompute otoritatif server (b2b_bulk_create_batch). Read-only. */
function runFleetAnalysis(
  doc: { label?: string; fields: Record<string, unknown> },
  headers: string[],
  rows: unknown[][],
): ToolOutcome {
  const col = {
    name: findCol(headers, HEADER_HINTS.name),
    jenis: findFleetJenisCol(headers),
    financing: findCol(headers, FLEET_HEADER_HINTS.financing),
    tenor: findCol(headers, FLEET_HEADER_HINTS.tenor),
    otr: findCol(headers, FLEET_HEADER_HINTS.otr),
    plate: findCol(headers, FLEET_HEADER_HINTS.plate),
    region: findCol(headers, FLEET_HEADER_HINTS.region),
    model: findCol(headers, FLEET_HEADER_HINTS.model),
  };

  const results: Record<string, unknown>[] = [];
  const premiums: BulkPremiumResult[] = [];
  let okCount = 0;
  let errCount = 0;

  rows.forEach((row, i) => {
    const pick = (idx: number) => (idx >= 0 ? row[idx] : undefined);
    const label = str(pick(col.name) ?? `Baris ${i + 1}`, 60);

    const fail = (reason: string) => {
      errCount += 1;
      results.push({ baris: i + 1, nama: label, error: reason });
    };

    // Nilai pembiayaan = kolom kunci fleet; tanpa itu baris tidak bisa dihitung.
    const financingValue = Math.round(parseMoney(pick(col.financing)));
    if (!financingValue || financingValue <= 0) {
      fail('Nilai pembiayaan/pencairan kosong atau tidak valid — baris tidak bisa dihitung.');
      return;
    }

    const flags: string[] = [];
    const jenisRaw = str(pick(col.jenis), 60);
    if (!jenisRaw) flags.push('Jenis kendaraan kosong — kelas unit diperkirakan, perlu verifikasi.');
    const vehicleClass = classifyVehicleClass(jenisRaw);

    const regionText = str(pick(col.region), 60);
    const plateNo = str(pick(col.plate), 20);
    const detected = detectZone(regionText || null, plateNo || null);
    if (!detected.confident) {
      flags.push(`Zona tidak terdeteksi dari plat/wilayah "${regionText || plateNo || '—'}" — default Zona 3, perlu verifikasi manual.`);
    }

    const tenorRaw = pick(col.tenor);
    const tenorMonths = Math.round(parseMoney(tenorRaw)) || 12;
    if (!tenorRaw) flags.push('Tenor kosong — dipakai default 12 bulan.');

    const otr = Math.round(parseMoney(pick(col.otr)));
    const modelText = str(pick(col.model), 60);
    const commercialBodyHint = vehicleClass === 'CAR' ? isLikelyCommercialBody(`${modelText} ${jenisRaw}`) : false;
    if (vehicleClass === 'CAR' && !commercialBodyHint && otr <= 0) {
      flags.push('OTR kosong — kategori tarif mobil penumpang memakai OTR, hasil mungkin tidak akurat.');
    }

    try {
      const premium = calcBulkPremium({
        vehicleClass,
        zone: detected.zone,
        financingValue,
        otr,
        tenorMonths,
        commercialBodyHint,
      });
      premiums.push(premium);
      okCount += 1;
      results.push({
        baris: i + 1,
        nama: label,
        kelas: FLEET_CLASS_LABEL[vehicleClass],
        zona: detected.zone,
        sumber_zona: detected.source,
        nilai_pembiayaan: financingValue,
        otr: otr || null,
        tenor_bulan: tenorMonths,
        rate_persen: Number((premium.rate * 100).toFixed(4)),
        premi_gross: premium.premiumGross,
        diskon_persen: Number((premium.discountRate * 100).toFixed(2)),
        diskon_rp: premium.discountAmount,
        premi_setelah_diskon: premium.premiumAfterDiscount,
        biaya_admin: premium.adminFee,
        total_premi: premium.totalPremium,
        ...(flags.length ? { catatan: flags } : {}),
      });
    } catch (e) {
      fail(`Gagal menghitung: ${e instanceof Error ? e.message : 'kesalahan tak dikenal'}`);
    }
  });

  const totals = calcBulkTotals(premiums);
  const truncated = doc.fields.rows_total != null && Number(doc.fields.rows_total) > rows.length;
  const fileLabel = str(doc.label ?? doc.fields.file_name, 80);

  return {
    result: {
      file: fileLabel,
      mode: 'fleet',
      kolom_terdeteksi: {
        kelas_unit: col.jenis >= 0 ? headers[col.jenis] : null,
        pembiayaan: col.financing >= 0 ? headers[col.financing] : null,
        tenor: col.tenor >= 0 ? headers[col.tenor] : null,
        otr: col.otr >= 0 ? headers[col.otr] : null,
        plat: col.plate >= 0 ? headers[col.plate] : null,
        wilayah: col.region >= 0 ? headers[col.region] : null,
        nama: col.name >= 0 ? headers[col.name] : null,
      },
      ringkasan: {
        baris_diproses: rows.length,
        berhasil: okCount,
        gagal: errCount,
        total_premi_gross: totals.totalPremiumGross,
        total_diskon: totals.totalDiscount,
        total_premi_setelah_diskon: totals.totalPremiumNet,
        total_biaya_admin: totals.totalAdminFee,
        total_ditagihkan: totals.totalAmount,
        dipotong: truncated ? `File punya ${String(doc.fields.rows_total)} baris; hanya ${rows.length} pertama dianalisa.` : null,
        mesin: 'calcBulkPremium — TLO armada (zona dari plat/wilayah, pro-rata tenor, diskon + biaya admin, lantai premi minimum, rate set aktif)',
        disclaimer: PRICE_DISCLAIMER,
      },
      hasil: results.slice(0, 120),
      gagal_hitung: errCount > 0 ? results.filter(r => r.error).slice(0, 40) : null,
    },
    card: {
      type: 'bulk_analysis',
      data: {
        file: fileLabel,
        mode: 'fleet',
        berhasil: okCount,
        gagal: errCount,
        total_premium: totals.totalAmount,
        totals: {
          premi_gross: totals.totalPremiumGross,
          diskon: totals.totalDiscount,
          premi_setelah_diskon: totals.totalPremiumNet,
          biaya_admin: totals.totalAdminFee,
          total_ditagihkan: totals.totalAmount,
        },
        rows: results.filter(r => !r.error).slice(0, 30),
        errors: results.filter(r => r.error).slice(0, 10),
      },
    },
  };
}

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

  // v2.8.18 — census armada (ada kolom pembiayaan/tenor) → mode fleet dengan
  // engine yang sama seperti impor resmi. Rate set aktif dipasang dulu agar
  // harga tidak memakai nilai sisa request lain di isolate yang sama.
  if (findCol(headers, FLEET_HEADER_HINTS.financing) >= 0 || findCol(headers, FLEET_HEADER_HINTS.tenor) >= 0) {
    await loadActiveFleetRateConfig(ctx.db);
    return runFleetAnalysis(doc, headers, rows);
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
