// Shared B2B bulk fleet TLO rating engine for edge functions (Deno).
//
// Mirrors services/b2bFleetRating.ts (the browser/review-UI engine) so the
// figures a B2B client sees while reviewing an uploaded batch match what the
// gateway recomputes and persists on submit. Keep the two in sync when
// either changes — services/__tests__/b2bFleetRating.test.ts asserts parity,
// the same discipline docs/PATHY_AGENT.md documents for the OJK engine.

export type VehicleClass = 'MOTORCYCLE' | 'CAR' | 'HEAVY_EQUIPMENT';
export type FleetCoverage = 'TLO' | 'COMPREHENSIVE';
export type Zone = 1 | 2 | 3;
export type VehicleCategory = 1 | 2 | 3 | 4 | 5;

// ─── Vehicle classification ────────────────────────────────────────────────

const HEAVY_EQUIPMENT_HINTS = ['ALAT BERAT', 'HEAVY EQUIPMENT', 'EXCAVATOR', 'CRAWLER'];
const MOTORCYCLE_HINTS = ['MOTOR'];

export function classifyVehicleClass(jenisBrg: string): VehicleClass {
  const s = (jenisBrg || '').toUpperCase();
  if (HEAVY_EQUIPMENT_HINTS.some(h => s.includes(h))) return 'HEAVY_EQUIPMENT';
  if (MOTORCYCLE_HINTS.some(h => s.includes(h))) return 'MOTORCYCLE';
  return 'CAR';
}

const COMMERCIAL_BODY_HINTS = [
  'PICKUP', 'PICK UP', 'PICK-UP', 'TRUCK', 'TRUK', 'BAK', 'BOX', 'BLIND VAN',
  'L300', 'CARRY', 'GC 415', 'GC415', 'COLT DIESEL', 'ENGKEL', 'GRAN MAX PICKUP',
  'GRANMAX PICKUP', 'DOUBLE CABIN', 'PU ',
];

export function isLikelyCommercialBody(typeName: string): boolean {
  const s = (typeName || '').toUpperCase();
  return COMMERCIAL_BODY_HINTS.some(h => s.includes(h));
}

// ─── Zone detection ─────────────────────────────────────────────────────────

const PLATE_PREFIX_ZONE: Record<string, Zone> = {
  BL: 1, BB: 1, BK: 1, BA: 1, BM: 1, BG: 1, BN: 1, BE: 1, BD: 1, BH: 1, BP: 1,
  B: 2, A: 2, D: 2, E: 2, F: 2, T: 2, Z: 2,
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

const REGION_ZONE_KEYWORDS: Array<[Zone, string[]]> = [
  [1, [
    'PALEMBANG', 'BATURAJA', 'LAHAT', 'MEDAN', 'PADANG', 'PEKANBARU', 'JAMBI',
    'BENGKULU', 'LAMPUNG', 'BATAM', 'ACEH', 'BANDA ACEH', 'DUMAI',
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

// ─── Rates (mirrors CAR_TLO_MIN / MOTO_TLO_MIN from ojk.ts's BUILTIN_RATE_SET) ──

type ZoneTable = Record<VehicleCategory, Record<Zone, number>>;

const CAR_TLO_MIN: ZoneTable = {
  1: { 1: 0.0047, 2: 0.0065, 3: 0.0051 },
  2: { 1: 0.0063, 2: 0.0044, 3: 0.0044 },
  3: { 1: 0.0041, 2: 0.0038, 3: 0.0029 },
  4: { 1: 0.0025, 2: 0.0025, 3: 0.0023 },
  5: { 1: 0.0020, 2: 0.0020, 3: 0.0020 },
};

const MOTO_TLO_MIN: Record<Zone, number> = { 1: 0.0176, 2: 0.0180, 3: 0.0067 };

// Comprehensive batas bawah (mirror DEFAULT_CAR_COMP_MIN / DEFAULT_MOTO_COMP_MIN
// di services/ojkRates.ts) — dipakai order unit Comprehensive.
const CAR_COMP_MIN: ZoneTable = {
  1: { 1: 0.0382, 2: 0.0326, 3: 0.0253 },
  2: { 1: 0.0267, 2: 0.0247, 3: 0.0269 },
  3: { 1: 0.0218, 2: 0.0208, 3: 0.0179 },
  4: { 1: 0.0120, 2: 0.0120, 3: 0.0114 },
  5: { 1: 0.0105, 2: 0.0105, 3: 0.0105 },
};
const MOTO_COMP_MIN = 0.0318;

const CATEGORY_BANDS: Record<1 | 2 | 3 | 4, number> = {
  1: 125_000_000, 2: 200_000_000, 3: 400_000_000, 4: 800_000_000,
};

export function getVehicleCategory(sumInsured: number): VehicleCategory {
  if (sumInsured <= CATEGORY_BANDS[1]) return 1;
  if (sumInsured <= CATEGORY_BANDS[2]) return 2;
  if (sumInsured <= CATEGORY_BANDS[3]) return 3;
  if (sumInsured <= CATEGORY_BANDS[4]) return 4;
  return 5;
}

export const PICKUP_TRUCK_TLO_MIN: Record<Zone, number> = { 1: 0.0088, 2: 0.0168, 3: 0.0081 };
export const HEAVY_EQUIPMENT_TLO_RATE = 0.0085;

// Comprehensive truk & pickup — SEOJK No. 6/SEOJK.05/2017 Lampiran IV Tabel
// IV.A kategori 6 (batas bawah, semua uang pertanggungan), per wilayah.
export const PICKUP_TRUCK_COMP_MIN: Record<Zone, number> = { 1: 0.0242, 2: 0.0239, 3: 0.0223 };

export const DISCOUNT_RATE_STANDARD = 0.25;
export const DISCOUNT_RATE_HEAVY = 0.15;

export const ADMIN_FEE_MOTORCYCLE = 25_000;
// Araahan owner (2026-11-11): biaya admin FLAT Rp 25.000 untuk motor & mobil
// (sebelumnya mobil/pickup/truk 45.000). Alat berat tetap 65.000 per
// kesepakatan block business — bisa diubah lewat rate set admin.
export const ADMIN_FEE_CAR = 25_000;
export const ADMIN_FEE_HEAVY = 65_000;

// Nilai lantai premi gross metodologi audit manual mitra pilot. Araahan owner
// (2026-11-11): premi mengikuti formula penuh TANPA lantai — DEFAULT config
// memakai 0; konstanta tetap diekspor sebagai dokumentasi historis dan
// bisa diaktifkan lagi via rate set admin (minPremiumGross).
export const MIN_PREMIUM_GROSS = 50_000;

// ─── Admin-editable override (sp_b2b_fleet_rate_sets) ──────────────────────
// Mirrors services/b2bFleetRating.ts — see the comment there. The constants
// above stay as the parity-tested defaults; calcBulkPremium/selectRate price
// from this mutable "active config" instead, set per-request by the gateway
// action after it loads the active sp_b2b_fleet_rate_sets row.
export interface BulkRateConfig {
  pickupTruckTloMin: Record<Zone, number>;
  /** Opsional: rate set lama tidak punya kunci ini → PICKUP_TRUCK_COMP_MIN. */
  pickupTruckCompMin?: Record<Zone, number>;
  heavyEquipmentRate: number;
  discountRateStandard: number;
  discountRateHeavy: number;
  adminFeeMotorcycle: number;
  adminFeeCar: number;
  adminFeeHeavy: number;
  minPremiumGross: number;
  /** Opsional: rate perluasan. Default DEFAULT_FLEET_ADDON_RATES. */
  addonRates?: FleetAddonRates;
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
  category: VehicleCategory | null;
  commercialBody: boolean;
}

export function selectRate(
  vehicleClass: VehicleClass,
  zone: Zone,
  otr: number,
  commercialBodyHint: boolean,
  rateConfig: BulkRateConfig = activeBulkRateConfig,
  coverage: FleetCoverage = 'TLO',
): RateSelection {
  const comp = coverage === 'COMPREHENSIVE';
  if (vehicleClass === 'MOTORCYCLE') {
    return { rate: comp ? MOTO_COMP_MIN : MOTO_TLO_MIN[zone], category: null, commercialBody: false };
  }
  if (vehicleClass === 'HEAVY_EQUIPMENT') {
    return { rate: rateConfig.heavyEquipmentRate, category: null, commercialBody: false };
  }
  if (commercialBodyHint) {
    // Rate set lama (atau suntingan admin yang tidak lengkap) tidak punya
    // tabel comprehensive pickup → jatuh ke tarif OJK bawaan per zona.
    const rate = comp
      ? (rateConfig.pickupTruckCompMin?.[zone] ?? PICKUP_TRUCK_COMP_MIN[zone])
      : rateConfig.pickupTruckTloMin[zone];
    return { rate, category: null, commercialBody: true };
  }
  const category = getVehicleCategory(otr || 0);
  return { rate: (comp ? CAR_COMP_MIN : CAR_TLO_MIN)[category][zone], category, commercialBody: false };
}

// ─── Order unit multi-tahun ─────────────────────────────────────────────────
// Arahan owner (2026-11-08): polis sampai 6 tahun, nilai pertanggungan
// menyusut 10% per tahun (majemuk). Berlaku hanya untuk order unit yang
// memintanya — impor massal tetap tanpa penyusutan.
export const MULTI_YEAR_DEPRECIATION_RATE = 0.10;
export const MULTI_YEAR_MAX_TENOR_MONTHS = 72;
export const MAX_DEPRECIATION_RATE = 0.5; // pagar pengaman mesin, bukan produk

// ─── Perluasan (add-ons) — mirror services/b2bFleetRating.ts ────────────────
export interface FleetAddOns {
  flood?: boolean;
  earthquake?: boolean;
  srcc?: boolean;
  terrorism?: boolean;
  tplLimit?: number;
  authorizedWorkshop?: boolean;
  paDriver?: boolean;
  paPassengerSeats?: number;
}

export interface FleetAddonRates {
  flood: number;
  earthquake: number;
  srccComp: number;
  srccTlo: number;
  tplBand1Rate: number; tplBand1Cap: number;
  tplBand2Rate: number; tplBand2Cap: number;
  tplBand3Rate: number; tplBand3Cap: number;
  paDriver: number;
  paPassengerPerSeat: number;
  authorizedWorkshopLoading: number;
}

export const DEFAULT_FLEET_ADDON_RATES: FleetAddonRates = {
  flood: 0.0015,
  earthquake: 0.0012,
  srccComp: 0.0005,
  srccTlo: 0.00035,
  tplBand1Rate: 0.01,   tplBand1Cap: 25_000_000,
  tplBand2Rate: 0.005,  tplBand2Cap: 25_000_000,
  tplBand3Rate: 0.0025, tplBand3Cap: 50_000_000,
  paDriver: 50_000,
  paPassengerPerSeat: 25_000,
  authorizedWorkshopLoading: 0.10,
};

function calcTplPremiumFleet(limit: number, rates: FleetAddonRates): number {
  if (!limit || limit <= 0) return 0;
  const { tplBand1Rate, tplBand1Cap, tplBand2Rate, tplBand2Cap, tplBand3Rate, tplBand3Cap } = rates;
  let p = 0;
  p += Math.min(limit, tplBand1Cap) * tplBand1Rate;
  if (limit > tplBand1Cap) p += Math.min(limit - tplBand1Cap, tplBand2Cap) * tplBand2Rate;
  if (limit > tplBand1Cap + tplBand2Cap) {
    p += Math.min(limit - tplBand1Cap - tplBand2Cap, tplBand3Cap) * tplBand3Rate;
  }
  return Math.round(p);
}

export interface FleetAddonCalcResult {
  total: number;
  detail: Record<string, number>;
}

export function calcFleetAddonPremium(
  addons: FleetAddOns | undefined,
  sumInsured: number,
  coverage: FleetCoverage,
  basePremium: number,
  vehicleClass: VehicleClass,
  rateConfig: BulkRateConfig = activeBulkRateConfig,
): FleetAddonCalcResult {
  if (!addons || vehicleClass === 'HEAVY_EQUIPMENT') return { total: 0, detail: {} };
  const rates = rateConfig.addonRates ?? DEFAULT_FLEET_ADDON_RATES;
  const srccRate = coverage === 'COMPREHENSIVE' ? rates.srccComp : rates.srccTlo;
  const detail: Record<string, number> = {};
  if (addons.flood)            detail.flood        = Math.round(sumInsured * rates.flood);
  if (addons.earthquake)       detail.earthquake   = Math.round(sumInsured * rates.earthquake);
  if (addons.srcc)             detail.srcc         = Math.round(sumInsured * srccRate);
  if (addons.terrorism)        detail.terrorism    = Math.round(sumInsured * srccRate);
  const tplPrem = calcTplPremiumFleet(addons.tplLimit ?? 0, rates);
  if (tplPrem > 0)             detail.tpl          = tplPrem;
  if (addons.authorizedWorkshop && coverage === 'COMPREHENSIVE') {
    detail.authorizedWorkshop  = Math.round(basePremium * rates.authorizedWorkshopLoading);
  }
  if (addons.paDriver)         detail.paDriver     = rates.paDriver;
  const seats = Math.max(0, Math.min(7, Math.round(addons.paPassengerSeats ?? 0)));
  if (seats > 0)               detail.paPassenger  = seats * rates.paPassengerPerSeat;
  const total = Object.values(detail).reduce((x, y) => x + y, 0);
  return { total, detail };
}

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
  financingValue: number;
  otr: number;
  tenorMonths: number;
  commercialBodyHint?: boolean;
  // Jenis pertanggungan (v2.8.24). undefined = TLO (perilaku lama; impor massal
  // tidak pernah mengisinya). Alat berat selalu TLO apa pun yang diminta.
  coverage?: FleetCoverage;
  // Order unit multi-tahun (v2.8.23): nilai pertanggungan menyusut per tahun
  // polis. 0/undefined = perilaku lama (impor massal tidak pernah menyusut,
  // supaya tetap cocok dengan metodologi audit mitra).
  depreciationRate?: number;
  // Diskon yang dipilih klien untuk unit ini. Selalu dijepit ke 0..diskon
  // rate set aktif untuk kelasnya — klien hanya bisa MENURUNKAN, tidak pernah
  // menaikkan. undefined = pakai diskon rate set (perilaku lama).
  discountRateOverride?: number;
  addons?: FleetAddOns;
  planLoadingRate?: number;
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
  coverage: FleetCoverage;
  depreciationRate: number;
  schedule: PremiumScheduleRow[];
  addonPremium: number;
  addonsDetail: Record<string, number>;
  planLoading: number;
}

export function calcBulkPremium(input: BulkPremiumInput, rateConfig: BulkRateConfig = activeBulkRateConfig): BulkPremiumResult {
  const { vehicleClass, zone, financingValue, otr, tenorMonths } = input;
  const coverage: FleetCoverage =
    input.coverage === 'COMPREHENSIVE' && vehicleClass !== 'HEAVY_EQUIPMENT' ? 'COMPREHENSIVE' : 'TLO';
  const { rate, category, commercialBody } = selectRate(
    vehicleClass, zone, otr, input.commercialBodyHint ?? false, rateConfig, coverage,
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

  const { total: addonPremium, detail: addonsDetail } = calcFleetAddonPremium(
    input.addons, financingValue, coverage, premiumGross, vehicleClass, rateConfig,
  );
  const planLoadingRate = Math.max(-0.5, Math.min(1, Number.isFinite(input.planLoadingRate) ? (input.planLoadingRate as number) : 0));
  const planLoading = Math.round(premiumAfterDiscount * planLoadingRate);

  const totalPremium = premiumAfterDiscount + planLoading + addonPremium + adminFee;

  return {
    rate, category, commercialBody, premiumGross, discountRate, discountAmount,
    premiumAfterDiscount, adminFee, totalPremium, coverage, depreciationRate, schedule,
    addonPremium, addonsDetail, planLoading,
  };
}

export interface BulkTotals {
  itemCount: number;
  totalPremiumGross: number;
  totalDiscount: number;
  totalPremiumNet: number;
  totalAdminFee: number;
  totalAddons: number;
  totalPlanLoading: number;
  totalAmount: number;
}

export function calcBulkTotals(items: Array<Pick<BulkPremiumResult, 'premiumGross' | 'discountAmount' | 'premiumAfterDiscount' | 'adminFee' | 'totalPremium' | 'addonPremium' | 'planLoading'>>): BulkTotals {
  return items.reduce((acc, it) => ({
    itemCount: acc.itemCount + 1,
    totalPremiumGross: acc.totalPremiumGross + it.premiumGross,
    totalDiscount: acc.totalDiscount + it.discountAmount,
    totalPremiumNet: acc.totalPremiumNet + it.premiumAfterDiscount,
    totalAdminFee: acc.totalAdminFee + it.adminFee,
    totalAddons: acc.totalAddons + (it.addonPremium ?? 0),
    totalPlanLoading: acc.totalPlanLoading + (it.planLoading ?? 0),
    totalAmount: acc.totalAmount + it.totalPremium,
  }), { itemCount: 0, totalPremiumGross: 0, totalDiscount: 0, totalPremiumNet: 0, totalAdminFee: 0, totalAddons: 0, totalPlanLoading: 0, totalAmount: 0 });
}
