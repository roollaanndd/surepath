// Shared B2B bulk fleet TLO rating engine for edge functions (Deno).
//
// Mirrors services/b2bFleetRating.ts (the browser/review-UI engine) so the
// figures a B2B client sees while reviewing an uploaded batch match what the
// gateway recomputes and persists on submit. Keep the two in sync when
// either changes — services/__tests__/b2bFleetRating.test.ts asserts parity,
// the same discipline docs/PATHY_AGENT.md documents for the OJK engine.

export type VehicleClass = 'MOTORCYCLE' | 'CAR' | 'HEAVY_EQUIPMENT';
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
  category: VehicleCategory | null;
  commercialBody: boolean;
}

export function selectRate(
  vehicleClass: VehicleClass,
  zone: Zone,
  otr: number,
  commercialBodyHint: boolean,
  rateConfig: BulkRateConfig = activeBulkRateConfig,
): RateSelection {
  if (vehicleClass === 'MOTORCYCLE') {
    return { rate: MOTO_TLO_MIN[zone], category: null, commercialBody: false };
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

export interface BulkPremiumInput {
  vehicleClass: VehicleClass;
  zone: Zone;
  financingValue: number;
  otr: number;
  tenorMonths: number;
  commercialBodyHint?: boolean;
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
}

export function calcBulkPremium(input: BulkPremiumInput, rateConfig: BulkRateConfig = activeBulkRateConfig): BulkPremiumResult {
  const { vehicleClass, zone, financingValue, otr, tenorMonths } = input;
  const { rate, category, commercialBody } = selectRate(
    vehicleClass, zone, otr, input.commercialBodyHint ?? false, rateConfig,
  );

  const tenor = Math.max(1, Math.round(tenorMonths || 12));
  const rawGross = financingValue * rate * (tenor / 12);
  const premiumGross = Math.round(Math.max(rawGross, rateConfig.minPremiumGross));

  const discountRate = vehicleClass === 'HEAVY_EQUIPMENT' ? rateConfig.discountRateHeavy : rateConfig.discountRateStandard;
  const discountAmount = Math.round(premiumGross * discountRate);
  const premiumAfterDiscount = premiumGross - discountAmount;

  const adminFee =
    vehicleClass === 'MOTORCYCLE' ? rateConfig.adminFeeMotorcycle :
    vehicleClass === 'HEAVY_EQUIPMENT' ? rateConfig.adminFeeHeavy :
    rateConfig.adminFeeCar;

  const totalPremium = premiumAfterDiscount + adminFee;

  return { rate, category, commercialBody, premiumGross, discountRate, discountAmount, premiumAfterDiscount, adminFee, totalPremium };
}

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
