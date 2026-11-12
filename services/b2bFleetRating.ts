// B2B bulk fleet TLO rating engine — multifinance block business.
//
// A multifinance company (leasing/pembiayaan) ships a spreadsheet of financed
// vehicles that all need Total Loss Only cover in one shot. This reproduces,
// in code, the manual audit methodology the first pilot partner (Mutiara
// Finance / PT MMF) already uses: zone from plate/region, rate from the OJK
// TLO floor table, a minimum gross premium, a flat discount and admin fee,
// pro-rated by tenor. See docs/PATHY_AGENT.md's rate-parity note — the same
// discipline applies here: supabase/functions/_shared/b2bFleetRating.ts must
// mirror this file exactly (services/__tests__/b2bFleetRating.test.ts asserts
// parity), because this module computes money server-side on re-submit.
//
// Deliberate rounding choice: premiumGross is rounded to the nearest rupiah
// before the discount is taken, so every downstream figure is a clean whole
// rupiah. (A manually-audited reference spreadsheet for this same data kept
// unrounded floating-point remainders — e.g. a premium landing on
// Rp53,999.999999999993 instead of Rp54,000 — which is invisible once a
// spreadsheet formats the cell, but wrong to persist in a database or show
// on an invoice.)

import {
  getZone as getOjkZoneByProvince,
  getVehicleCategory,
  getBaseRateByBand,
  CAR_TLO_MIN,
  type Zone,
  type VehicleCategory,
} from './ojkRates';

export type { Zone };
export type VehicleClass = 'MOTORCYCLE' | 'CAR' | 'HEAVY_EQUIPMENT';

// ─── Vehicle classification ────────────────────────────────────────────────

const MOTORCYCLE_HINTS = ['MOTOR'];
const HEAVY_EQUIPMENT_HINTS = ['ALAT BERAT', 'HEAVY EQUIPMENT', 'EXCAVATOR', 'CRAWLER'];

export function classifyVehicleClass(jenisBrg: string): VehicleClass {
  const s = (jenisBrg || '').toUpperCase();
  if (HEAVY_EQUIPMENT_HINTS.some(h => s.includes(h))) return 'HEAVY_EQUIPMENT';
  if (MOTORCYCLE_HINTS.some(h => s.includes(h))) return 'MOTORCYCLE';
  return 'CAR';
}

// Within JENIS BRG="MOBIL ..." the OJK TLO floor table has two different
// rates depending on body type: passenger cars use the sum-insured-banded
// table (CAR_TLO_MIN), pickups/trucks/vans use a flat commercial-body rate.
// There is no reliable column for this in a multifinance export — it has to
// be read off the model name, exactly like the audit note that caught
// "Suzuki GC 415 T adalah pickup/mobil barang" by inspecting the TYPE text.
// Keyword-based, not exhaustive — ambiguous rows are flagged (not guessed)
// so a human confirms before the batch is submitted.
const COMMERCIAL_BODY_HINTS = [
  'PICKUP', 'PICK UP', 'PICK-UP', 'TRUCK', 'TRUK', 'BAK', 'BOX', 'BLIND VAN',
  'L300', 'CARRY', 'GC 415', 'GC415', 'COLT DIESEL', 'ENGKEL', 'GRAN MAX PICKUP',
  'GRANMAX PICKUP', 'DOUBLE CABIN', 'DOUBLE CABIN', 'PU ',
];

export function isLikelyCommercialBody(typeName: string): boolean {
  const s = (typeName || '').toUpperCase();
  return COMMERCIAL_BODY_HINTS.some(h => s.includes(h));
}

// ─── Zone detection ─────────────────────────────────────────────────────────
// Primary signal: the plate prefix (what the reference audit used first).
// Secondary: a city/district keyword match on the free-text region column.
// Neither match → default Zone 3 + a flag asking for manual verification,
// exactly the caveat the reference audit itself carries ("Verifikasi
// terhadap STNK tetap diperlukan").

// Grouped by the same 3-zone split as PROVINCE_ZONES in ojkRates.ts:
// Zone 1 = Sumatera, Zone 2 = Jabodetabek + Jawa Barat + Banten, Zone 3 = rest.
const PLATE_PREFIX_ZONE: Record<string, Zone> = {
  // Zone 1 — Sumatera
  BL: 1, BB: 1, BK: 1, BA: 1, BM: 1, BG: 1, BN: 1, BE: 1, BD: 1, BH: 1, BP: 1,
  // Zone 2 — DKI Jakarta / Jawa Barat / Banten
  B: 2, A: 2, D: 2, E: 2, F: 2, T: 2, Z: 2,
  // Zone 3 — everything else (Jateng/DIY/Jatim/Kalimantan/Sulawesi/Bali/NT/Maluku/Papua)
  G: 3, H: 3, K: 3, R: 3, AA: 3, AB: 3, AD: 3, AE: 3, AG: 3, L: 3, M: 3, N: 3,
  P: 3, S: 3, W: 3, DK: 3, DR: 3, EA: 3, EB: 3, ED: 3, DA: 3, KB: 3, KH: 3,
  KT: 3, KU: 3, DB: 3, DL: 3, DM: 3, DN: 3, DT: 3, DD: 3, DC: 3, DE: 3, DG: 3,
  PA: 3, PB: 3,
};

export function zoneFromPlate(plateNo: string | null | undefined): Zone | null {
  const s = (plateNo || '').trim().toUpperCase();
  const m = s.match(/^([A-Z]{1,2})\s*\d/);
  if (!m) return null;
  return PLATE_PREFIX_ZONE[m[1]] ?? null;
}

// City/regency/district keyword → zone. Not exhaustive — covers the regions
// seen in the pilot partner's book plus other common multifinance branch
// cities. zoneFromPlate() is tried first and is the more reliable signal;
// this is the fallback when the plate can't be parsed.
const REGION_ZONE_KEYWORDS: Array<[Zone, string[]]> = [
  [1, [
    'PALEMBANG', 'BATURAJA', 'LAHAT', 'MEDAN', 'PADANG', 'PEKANBARU', 'JAMBI',
    'BENGKULU', 'LAMPUNG', 'BATAM', 'ACEH', 'BANDA ACEH', 'DUMAI', 'BATURAJA',
    'PRABUMULIH', 'LUBUKLINGGAU', 'PANGKAL PINANG', 'TANJUNG PINANG',
  ]],
  [2, [
    'JAKARTA', 'GALUR', 'BEKASI', 'DEPOK', 'TANGERANG', 'CIPONDOH', 'CILEDUG',
    'PAMULANG', 'SERANG', 'CILEGON', 'BANDUNG', 'UJUNGBERUNG', 'UJUNG BERUNG',
    'BOGOR', 'KARAWANG', 'PURWAKARTA', 'SUKABUMI', 'CIREBON', 'KUNINGAN',
    'CIANJUR', 'GARUT', 'TASIKMALAYA', 'SUMEDANG', 'INDRAMAYU', 'SUBANG',
  ]],
  [3, [
    'YOGYAKARTA', 'SAMARINDA', 'SEMARANG', 'SURABAYA', 'MALANG', 'SOLO',
    'SURAKARTA', 'DENPASAR', 'BALI', 'MAKASSAR', 'MANADO', 'BALIKPAPAN',
    'PONTIANAK', 'BANJARMASIN', 'KUPANG', 'MATARAM', 'AMBON', 'JAYAPURA',
    'PALU', 'KENDARI', 'GORONTALO',
  ]],
];

export function zoneFromRegionText(region: string | null | undefined): Zone | null {
  const s = (region || '').toUpperCase();
  for (const [zone, keywords] of REGION_ZONE_KEYWORDS) {
    if (keywords.some(k => s.includes(k))) return zone;
  }
  return null;
}

export interface ZoneDetection {
  zone: Zone;
  source: 'plate' | 'region' | 'default';
  confident: boolean;
}

export function detectZone(regionText: string | null | undefined, plateNo: string | null | undefined): ZoneDetection {
  const byPlate = zoneFromPlate(plateNo);
  if (byPlate) return { zone: byPlate, source: 'plate', confident: true };
  const byRegion = zoneFromRegionText(regionText);
  if (byRegion) return { zone: byRegion, source: 'region', confident: true };
  return { zone: 3, source: 'default', confident: false };
}

export { getOjkZoneByProvince };

// ─── Rates ──────────────────────────────────────────────────────────────────
// Motorcycle + passenger-car bands come straight from the existing OJK TLO
// floor table in ojkRates.ts (SEOJK No. 6/SEOJK.05/2017, Lampiran IV Tabel
// IV.B) so this stays in lock-step with every other product on the
// platform. Pickup/truck and heavy-equipment rates are NOT in that table —
// they're block-business floor rates confirmed with the pilot partner and
// live only here (mirrored in the Deno copy for parity).

// Commercial body (pickup/truck/van) OJK TLO floor rate by zone.
export const PICKUP_TRUCK_TLO_MIN: Record<Zone, number> = { 1: 0.0088, 2: 0.0168, 3: 0.0081 };

// Heavy equipment — not an OJK motor-vehicle TLO rate; a flat rate agreed
// with the pilot partner for block business (alat berat/crawler/excavator).
export const HEAVY_EQUIPMENT_TLO_RATE = 0.0085;

export const DISCOUNT_RATE_STANDARD = 0.25; // motor & mobil
export const DISCOUNT_RATE_HEAVY = 0.15;    // alat berat

export const ADMIN_FEE_MOTORCYCLE = 25_000;
// Araahan owner (2026-11-11): biaya admin FLAT Rp 25.000 untuk motor & mobil
// (sebelumnya mobil/pickup/truk 45.000). Alat berat tetap 65.000 per
// kesepakatan block business — bisa diubah lewat rate set admin.
export const ADMIN_FEE_CAR = 25_000;
export const ADMIN_FEE_HEAVY = 65_000;

// Nilai lantai premi gross yang dipakai metodologi audit manual mitra pilot.
// Araahan owner (2026-11-11): premi mengikuti formula penuh
// (nilai pencairan × rate × tenor/12) TANPA lantai — jadi DEFAULT config di
// bawah memakai 0. Konstanta ini tetap diekspor sebagai dokumentasi nilai
// historis dan bisa diaktifkan lagi kapan saja dari rate set admin
// (minPremiumGross di sp_b2b_fleet_rate_sets).
export const MIN_PREMIUM_GROSS = 50_000;

// ─── Admin-editable override (sp_b2b_fleet_rate_sets) ──────────────────────
// The constants above are the built-in defaults — kept as plain exports so
// services/__tests__/b2bFleetRating.test.ts can assert byte-for-byte parity
// against the Deno mirror's own defaults. Everything that actually PRICES a
// batch (selectRate/calcBulkPremium below) reads from this mutable "active
// config" instead, which starts out equal to the defaults and is reassigned
// by setActiveBulkRateConfig() once the gateway/admin screen loads the
// currently-active sp_b2b_fleet_rate_sets row — the exact same shape of
// indirection services/ojkRates.ts already uses for CAR_TLO_MIN/MOTO_TLO_MIN.
export interface BulkRateConfig {
  pickupTruckTloMin: Record<Zone, number>;
  heavyEquipmentRate: number;
  discountRateStandard: number;
  discountRateHeavy: number;
  adminFeeMotorcycle: number;
  adminFeeCar: number;
  adminFeeHeavy: number;
  minPremiumGross: number;
}

export const DEFAULT_BULK_RATE_CONFIG: BulkRateConfig = {
  pickupTruckTloMin: PICKUP_TRUCK_TLO_MIN,
  heavyEquipmentRate: HEAVY_EQUIPMENT_TLO_RATE,
  discountRateStandard: DISCOUNT_RATE_STANDARD,
  discountRateHeavy: DISCOUNT_RATE_HEAVY,
  adminFeeMotorcycle: ADMIN_FEE_MOTORCYCLE,
  adminFeeCar: ADMIN_FEE_CAR,
  adminFeeHeavy: ADMIN_FEE_HEAVY,
  // Araahan owner (2026-11-11): premi = nilai pencairan × rate × tenor/12
  // tanpa lantai — default 0. Aktifkan lagi via rate set admin bila perlu.
  minPremiumGross: 0,
};

let activeBulkRateConfig: BulkRateConfig = DEFAULT_BULK_RATE_CONFIG;

export function setActiveBulkRateConfig(config: BulkRateConfig): void {
  activeBulkRateConfig = config;
}

export function getActiveBulkRateConfig(): BulkRateConfig {
  return activeBulkRateConfig;
}

export interface RateSelection {
  rate: number;
  category: VehicleCategory | null; // only meaningful for CAR
  commercialBody: boolean;          // only meaningful for CAR
}

export function selectRate(
  vehicleClass: VehicleClass,
  zone: Zone,
  otr: number,
  commercialBodyHint: boolean,
  rateConfig: BulkRateConfig = activeBulkRateConfig,
): RateSelection {
  if (vehicleClass === 'MOTORCYCLE') {
    // getBaseRateByBand() reads whatever OJK rate set is currently active
    // (CMS override, or the built-in default) — never a private, possibly
    // stale copy of the motorcycle TLO table.
    return { rate: getBaseRateByBand('MOTORCYCLE', 'TLO', zone, 1, 'MIN'), category: null, commercialBody: false };
  }
  if (vehicleClass === 'HEAVY_EQUIPMENT') {
    return { rate: rateConfig.heavyEquipmentRate, category: null, commercialBody: false };
  }
  if (commercialBodyHint) {
    return { rate: rateConfig.pickupTruckTloMin[zone], category: null, commercialBody: true };
  }
  const category = getVehicleCategory(otr || 0);
  return { rate: CAR_TLO_MIN[category][zone], category, commercialBody: false };
}

// ─── Premium calc ───────────────────────────────────────────────────────────

// ─── Order unit multi-tahun ─────────────────────────────────────────────────
// Arahan owner (2026-11-08): polis sampai 6 tahun, nilai pertanggungan
// menyusut 10% per tahun (majemuk). Berlaku hanya untuk order unit yang
// memintanya — impor massal tetap tanpa penyusutan.
export const MULTI_YEAR_DEPRECIATION_RATE = 0.10;
export const MULTI_YEAR_MAX_TENOR_MONTHS = 72;
export const MAX_DEPRECIATION_RATE = 0.5; // pagar pengaman mesin, bukan produk

// Tanggal efektif: "YYYY-MM-DD" yang benar-benar ada di kalender.
export function isValidIsoDate(iso: string | null | undefined): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

// Akhir pertanggungan = tanggal yang sama N bulan kemudian (31 Jan + 1 bulan
// → 28/29 Feb). Mengembalikan '' untuk input yang bukan tanggal valid.
export function addMonthsToIsoDate(startIso: string, months: number): string {
  if (!isValidIsoDate(startIso)) return '';
  const [y, mo, d] = startIso.split('-').map(Number);
  const total = (mo - 1) + Math.round(months);
  const ty = y + Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, lastDay))}`;
}

export interface BulkPremiumInput {
  vehicleClass: VehicleClass;
  zone: Zone;
  financingValue: number; // "nilai pencairan/pembiayaan" — the premium basis
  otr: number;            // used only to band passenger-car category
  tenorMonths: number;
  commercialBodyHint?: boolean;
  // Order unit multi-tahun (v2.8.23): nilai pertanggungan menyusut per tahun
  // polis. 0/undefined = perilaku lama (impor massal tidak pernah menyusut,
  // supaya tetap cocok dengan metodologi audit mitra).
  depreciationRate?: number;
  // Diskon yang dipilih klien untuk unit ini. Selalu dijepit ke 0..diskon
  // rate set aktif untuk kelasnya — klien hanya bisa MENURUNKAN, tidak pernah
  // menaikkan. undefined = pakai diskon rate set (perilaku lama).
  discountRateOverride?: number;
}

// Satu baris jadwal premi per tahun polis (hanya terisi bila menyusut).
export interface PremiumScheduleRow {
  year: number;         // tahun polis ke-n (mulai 1)
  months: number;       // bulan yang ditanggung di tahun itu (≤ 12)
  sumInsured: number;   // nilai pertanggungan tahun itu, setelah penyusutan
  premiumGross: number; // premi gross tahun itu, rupiah bulat
}

export interface BulkPremiumResult {
  rate: number;
  category: VehicleCategory | null;
  commercialBody: boolean;
  premiumGross: number;
  discountRate: number;
  discountAmount: number;
  premiumAfterDiscount: number;
  adminFee: number;
  totalPremium: number;
  depreciationRate: number;       // yang benar-benar diterapkan (0 bila tenor ≤ 12 bln)
  schedule: PremiumScheduleRow[]; // kosong bila tidak menyusut
}

export function calcBulkPremium(input: BulkPremiumInput, rateConfig: BulkRateConfig = activeBulkRateConfig): BulkPremiumResult {
  const { vehicleClass, zone, financingValue, otr, tenorMonths } = input;
  const { rate, category, commercialBody } = selectRate(
    vehicleClass, zone, otr, input.commercialBodyHint ?? false, rateConfig,
  );

  const tenor = Math.max(1, Math.round(tenorMonths || 12));

  // Penyusutan hanya bermakna bila polis melewati tahun pertama. Rate dikunci
  // dari tahun pertama (kategori OTR saat order), yang menyusut hanya nilai
  // pertanggungannya: TSI tahun ke-n = TSI × (1 − d)^(n−1).
  const requestedDep = Number.isFinite(input.depreciationRate) ? (input.depreciationRate as number) : 0;
  const depreciationRate = tenor > 12 ? Math.min(Math.max(requestedDep, 0), MAX_DEPRECIATION_RATE) : 0;
  const schedule: PremiumScheduleRow[] = [];
  let rawGross: number;
  if (depreciationRate > 0) {
    const years = Math.ceil(tenor / 12);
    for (let y = 1; y <= years; y++) {
      const months = Math.min(12, tenor - 12 * (y - 1));
      const sumInsured = Math.round(financingValue * Math.pow(1 - depreciationRate, y - 1));
      schedule.push({ year: y, months, sumInsured, premiumGross: Math.round(sumInsured * rate * (months / 12)) });
    }
    rawGross = schedule.reduce((s, r) => s + r.premiumGross, 0);
  } else {
    rawGross = financingValue * rate * (tenor / 12);
  }
  const premiumGross = Math.round(Math.max(rawGross, rateConfig.minPremiumGross));

  const configDiscount = vehicleClass === 'HEAVY_EQUIPMENT' ? rateConfig.discountRateHeavy : rateConfig.discountRateStandard;
  const discountRate = Number.isFinite(input.discountRateOverride)
    ? Math.min(Math.max(input.discountRateOverride as number, 0), configDiscount)
    : configDiscount;
  const discountAmount = Math.round(premiumGross * discountRate);
  const premiumAfterDiscount = premiumGross - discountAmount;

  const adminFee =
    vehicleClass === 'MOTORCYCLE' ? rateConfig.adminFeeMotorcycle :
    vehicleClass === 'HEAVY_EQUIPMENT' ? rateConfig.adminFeeHeavy :
    rateConfig.adminFeeCar;

  const totalPremium = premiumAfterDiscount + adminFee;

  return { rate, category, commercialBody, premiumGross, discountRate, discountAmount, premiumAfterDiscount, adminFee, totalPremium, depreciationRate, schedule };
}

// ─── Batch totals ───────────────────────────────────────────────────────────

export interface BulkTotals {
  itemCount: number;
  totalPremiumGross: number;
  totalDiscount: number;
  totalPremiumNet: number;
  totalAdminFee: number;
  totalAmount: number;
}

export function calcBulkTotals(items: Array<Pick<BulkPremiumResult, 'premiumGross' | 'discountAmount' | 'premiumAfterDiscount' | 'adminFee' | 'totalPremium'>>): BulkTotals {
  return items.reduce((acc, it) => ({
    itemCount: acc.itemCount + 1,
    totalPremiumGross: acc.totalPremiumGross + it.premiumGross,
    totalDiscount: acc.totalDiscount + it.discountAmount,
    totalPremiumNet: acc.totalPremiumNet + it.premiumAfterDiscount,
    totalAdminFee: acc.totalAdminFee + it.adminFee,
    totalAmount: acc.totalAmount + it.totalPremium,
  }), { itemCount: 0, totalPremiumGross: 0, totalDiscount: 0, totalPremiumNet: 0, totalAdminFee: 0, totalAmount: 0 });
}

// ─── Line-item builder (raw spreadsheet row → rated line item) ────────────
// Used by the B2B bulk-import review screen. Classification/zone are
// judgment calls a human can override (buildLineItem honours the override
// fields); the premium MATH itself is never trusted from the client — the
// gateway recomputes it from whatever vehicleClass/zone/commercialBody the
// client ends up submitting, via the same calcBulkPremium() above.

export interface RawBulkRow {
  rowNo: number;
  nasabahName: string;
  nasabahKtp?: string;
  nasabahPhone?: string;
  nasabahAddress?: string;
  contractNo?: string;
  contractDate?: string;
  tenorMonths: number;
  financingValue: number;
  jenisBrg: string;
  make?: string;
  typeName?: string;
  modelYear?: number;
  otr: number;
  plateNo?: string;
  chassisNo?: string;
  engineNo?: string;
  bpkbNo?: string;
  regionText?: string;
  zoneOverride?: Zone;
  vehicleClassOverride?: VehicleClass;
  commercialBodyOverride?: boolean;
  // Order unit saja — diteruskan apa adanya ke calcBulkPremium (lihat
  // BulkPremiumInput). Baris impor massal tidak pernah mengisinya.
  depreciationRate?: number;
  discountRateOverride?: number;
  // Reference figures already present in the uploaded file (if any) — shown
  // for comparison, never trusted as the final number. Mirrors exactly what
  // the reference partner's own manual audit methodology does: recompute,
  // then flag anything that doesn't match what was provided.
  referenceZone?: Zone;
  referenceTotalPremium?: number;
}

export interface BuiltLineItem extends BulkPremiumResult {
  rowNo: number;
  vehicleClass: VehicleClass;
  zone: Zone;
  zoneSource: ZoneDetection['source'] | 'override';
  flags: string[];
}

export function buildLineItem(raw: RawBulkRow): BuiltLineItem {
  const flags: string[] = [];

  const vehicleClass = raw.vehicleClassOverride ?? classifyVehicleClass(raw.jenisBrg);
  const commercialBodyHint = raw.commercialBodyOverride ?? (vehicleClass === 'CAR' ? isLikelyCommercialBody(raw.typeName ?? '') : false);

  let zone: Zone;
  let zoneSource: BuiltLineItem['zoneSource'];
  if (raw.zoneOverride) {
    zone = raw.zoneOverride;
    zoneSource = 'override';
  } else {
    const detected = detectZone(raw.regionText, raw.plateNo);
    zone = detected.zone;
    zoneSource = detected.source;
    if (!detected.confident) {
      flags.push(`Zona tidak terdeteksi dari plat/wilayah "${raw.regionText ?? '—'}" — default Zona 3, perlu verifikasi manual.`);
    }
  }

  if (!raw.nasabahName?.trim()) flags.push('Nama nasabah kosong.');
  if (!raw.financingValue || raw.financingValue <= 0) flags.push('Nilai pencairan/pembiayaan kosong atau nol.');
  if (vehicleClass === 'CAR' && !commercialBodyHint && (!raw.otr || raw.otr <= 0)) {
    flags.push('OTR kosong — kategori tarif mobil penumpang memakai OTR, hasil mungkin tidak akurat.');
  }
  if (raw.referenceZone && raw.referenceZone !== zone) {
    flags.push(`Zona pada file (Wilayah ${raw.referenceZone}) berbeda dari hasil deteksi (Wilayah ${zone}).`);
  }

  const result = calcBulkPremium({
    vehicleClass,
    zone,
    financingValue: raw.financingValue || 0,
    otr: raw.otr || 0,
    tenorMonths: raw.tenorMonths || 12,
    commercialBodyHint,
    depreciationRate: raw.depreciationRate,
    discountRateOverride: raw.discountRateOverride,
  });

  if (raw.referenceTotalPremium != null && raw.referenceTotalPremium > 0) {
    const diff = Math.abs(result.totalPremium - raw.referenceTotalPremium);
    if (diff / raw.referenceTotalPremium > 0.01) {
      flags.push(`Premi pada file (Rp${raw.referenceTotalPremium.toLocaleString('id-ID')}) berbeda dari hasil hitung ulang (Rp${result.totalPremium.toLocaleString('id-ID')}).`);
    }
  }

  return { ...result, rowNo: raw.rowNo, vehicleClass, zone, zoneSource, flags };
}
