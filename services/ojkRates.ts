// OJK Motor Vehicle Insurance Rate Engine
// Based on SEOJK No. 6/SEOJK.05/2017 (Surat Edaran OJK tentang Tarif Premi Asuransi Kendaraan Bermotor)
//
// The tables below are the compiled-in seed/fallback — the source of truth
// once the app has loaded is whatever's active in the `sp_ojk_rate_sets`
// table (managed via the admin OJK Rate CMS). applyOjkRateSet() overwrites
// these `let` bindings in place, so every existing caller (calcPremium,
// getBaseRateByBand, etc.) picks up the DB values transparently without
// changing its own signature — if the DB fetch fails or hasn't run yet,
// these hardcoded defaults keep quoting correctly.

export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type CoverageType = 'COMPREHENSIVE' | 'TLO';
export type Zone = 1 | 2 | 3;
export type VehicleCategory = 1 | 2 | 3 | 4 | 5;
export type OjkBand = 'MIN' | 'MID' | 'MAX';

type ZoneTable = Record<VehicleCategory, Record<Zone, number>>;

// ─── Province → Zone Mapping ──────────────────────────────────────────────────

const DEFAULT_PROVINCE_ZONES: Record<string, Zone> = {
  // Zone 1 — Sumatera & islands
  'Aceh': 1,
  'Sumatera Utara': 1,
  'Sumatera Barat': 1,
  'Riau': 1,
  'Kepulauan Riau': 1,
  'Kepulauan Bangka Belitung': 1,
  'Jambi': 1,
  'Bengkulu': 1,
  'Sumatera Selatan': 1,
  'Lampung': 1,
  // Zone 2 — DKI Jakarta, West Java, Banten
  'DKI Jakarta': 2,
  'Jawa Barat': 2,
  'Banten': 2,
  // Zone 3 — Rest of Indonesia
  'Jawa Tengah': 3,
  'DI Yogyakarta': 3,
  'Jawa Timur': 3,
  'Bali': 3,
  'Kalimantan Barat': 3,
  'Kalimantan Tengah': 3,
  'Kalimantan Selatan': 3,
  'Kalimantan Timur': 3,
  'Kalimantan Utara': 3,
  'Sulawesi Utara': 3,
  'Sulawesi Tengah': 3,
  'Sulawesi Selatan': 3,
  'Sulawesi Tenggara': 3,
  'Gorontalo': 3,
  'Sulawesi Barat': 3,
  'Nusa Tenggara Barat': 3,
  'Nusa Tenggara Timur': 3,
  'Maluku': 3,
  'Maluku Utara': 3,
  'Papua': 3,
  'Papua Barat': 3,
  'Papua Barat Daya': 3,
  'Papua Pegunungan': 3,
  'Papua Tengah': 3,
  'Papua Selatan': 3,
};

const DEFAULT_CATEGORY_BANDS: Record<1 | 2 | 3 | 4, number> = {
  1: 125_000_000,
  2: 200_000_000,
  3: 400_000_000,
  4: 800_000_000,
};

// Comprehensive (All Risk) midpoint rates — Roda 4
// [category][zone]: e.g. 0.0401 = 4.01% per annum
const DEFAULT_CAR_COMP_MID: ZoneTable = {
  1: { 1: 0.0401, 2: 0.0343, 3: 0.0266 },
  2: { 1: 0.0281, 2: 0.0260, 3: 0.0283 },
  3: { 1: 0.0229, 2: 0.0219, 3: 0.0188 },
  4: { 1: 0.0126, 2: 0.0126, 3: 0.0120 },
  5: { 1: 0.0111, 2: 0.0111, 3: 0.0111 },
};

const DEFAULT_CAR_COMP_MIN: ZoneTable = {
  1: { 1: 0.0382, 2: 0.0326, 3: 0.0253 },
  2: { 1: 0.0267, 2: 0.0247, 3: 0.0269 },
  3: { 1: 0.0218, 2: 0.0208, 3: 0.0179 },
  4: { 1: 0.0120, 2: 0.0120, 3: 0.0114 },
  5: { 1: 0.0105, 2: 0.0105, 3: 0.0105 },
};

const DEFAULT_CAR_COMP_MAX: ZoneTable = {
  1: { 1: 0.0420, 2: 0.0359, 3: 0.0278 },
  2: { 1: 0.0294, 2: 0.0272, 3: 0.0296 },
  3: { 1: 0.0240, 2: 0.0229, 3: 0.0197 },
  4: { 1: 0.0132, 2: 0.0132, 3: 0.0125 },
  5: { 1: 0.0116, 2: 0.0116, 3: 0.0116 },
};

// TLO midpoint rates — Roda 4 (decreases with vehicle value, varies by zone)
const DEFAULT_CAR_TLO_MID: ZoneTable = {
  1: { 1: 0.0052, 2: 0.0072, 3: 0.0054 },
  2: { 1: 0.0066, 2: 0.0049, 3: 0.0046 },
  3: { 1: 0.0044, 2: 0.0040, 3: 0.0032 },
  4: { 1: 0.0028, 2: 0.0028, 3: 0.0025 },
  5: { 1: 0.0022, 2: 0.0022, 3: 0.0022 },
};

const DEFAULT_CAR_TLO_MIN: ZoneTable = {
  1: { 1: 0.0047, 2: 0.0065, 3: 0.0051 },
  2: { 1: 0.0063, 2: 0.0044, 3: 0.0044 },
  3: { 1: 0.0041, 2: 0.0038, 3: 0.0029 },
  4: { 1: 0.0025, 2: 0.0025, 3: 0.0023 },
  5: { 1: 0.0020, 2: 0.0020, 3: 0.0020 },
};

const DEFAULT_CAR_TLO_MAX: ZoneTable = {
  1: { 1: 0.0056, 2: 0.0078, 3: 0.0056 },
  2: { 1: 0.0069, 2: 0.0053, 3: 0.0048 },
  3: { 1: 0.0046, 2: 0.0042, 3: 0.0035 },
  4: { 1: 0.0030, 2: 0.0030, 3: 0.0027 },
  5: { 1: 0.0024, 2: 0.0024, 3: 0.0024 },
};

// Motorcycle (Roda 2) — COMP same nationwide; TLO zone-dependent
const DEFAULT_MOTO_COMP_MIN = 0.0318;
const DEFAULT_MOTO_COMP_MID = 0.0334;
const DEFAULT_MOTO_COMP_MAX = 0.0350;
const DEFAULT_MOTO_TLO_MIN: Record<Zone, number> = { 1: 0.0176, 2: 0.0180, 3: 0.0067 };
const DEFAULT_MOTO_TLO_MID: Record<Zone, number> = { 1: 0.0194, 2: 0.0198, 3: 0.0074 };
const DEFAULT_MOTO_TLO_MAX: Record<Zone, number> = { 1: 0.0211, 2: 0.0216, 3: 0.0080 };

export interface AddonRates {
  flood: number;
  earthquake: number;
  srccComp: number;
  srccTlo: number;
  tplBand1Rate: number; tplBand1Cap: number;
  tplBand2Rate: number; tplBand2Cap: number;
  tplBand3Rate: number; tplBand3Cap: number;
  paDriver: number;
  paPassengerPerSeat: number;
}

const DEFAULT_ADDON_RATES: AddonRates = {
  flood: 0.0015,
  earthquake: 0.0012,
  srccComp: 0.0005,
  srccTlo: 0.00035,
  tplBand1Rate: 0.01,   tplBand1Cap: 25_000_000,
  tplBand2Rate: 0.005,  tplBand2Cap: 25_000_000,
  tplBand3Rate: 0.0025, tplBand3Cap: 50_000_000,
  paDriver: 50_000,
  paPassengerPerSeat: 25_000,
};

export interface NonVehicleRates {
  TRAVEL: { domestic: { min: number; mid: number; max: number }; international: { min: number; mid: number; max: number }; label: string };
  PA: { label: string; bands: { min: number; mid: number; max: number } };
  MPAR: { label: string; bands: { min: number; mid: number; max: number } };
}

const DEFAULT_NON_VEHICLE_RATES: NonVehicleRates = {
  TRAVEL: {
    domestic:      { min: 0.0014, mid: 0.0017, max: 0.0020 },
    international: { min: 0.0025, mid: 0.0035, max: 0.0045 },
    label: '% dari nilai perjalanan',
  },
  PA: {
    label: 'Rp per orang per tahun',
    bands: { min: 30_000, mid: 75_000, max: 120_000 },
  },
  MPAR: {
    label: '% dari nilai perangkat per tahun',
    bands: { min: 0.025, mid: 0.035, max: 0.045 },
  },
};

// ─── Mutable "active" tables ──────────────────────────────────────────────────
// Start out equal to the defaults; applyOjkRateSet() swaps these in place.

export let PROVINCE_ZONES: Record<string, Zone> = { ...DEFAULT_PROVINCE_ZONES };
let CATEGORY_BANDS = { ...DEFAULT_CATEGORY_BANDS };
let CAR_COMP_MID = DEFAULT_CAR_COMP_MID;
export let CAR_COMP_MIN = DEFAULT_CAR_COMP_MIN;
export let CAR_COMP_MAX = DEFAULT_CAR_COMP_MAX;
let CAR_TLO_MID = DEFAULT_CAR_TLO_MID;
export let CAR_TLO_MIN = DEFAULT_CAR_TLO_MIN;
export let CAR_TLO_MAX = DEFAULT_CAR_TLO_MAX;
let MOTO_COMP_MIN = DEFAULT_MOTO_COMP_MIN;
let MOTO_COMP_MID = DEFAULT_MOTO_COMP_MID;
let MOTO_COMP_MAX = DEFAULT_MOTO_COMP_MAX;
let MOTO_TLO_MIN = DEFAULT_MOTO_TLO_MIN;
let MOTO_TLO_MID = DEFAULT_MOTO_TLO_MID;
let MOTO_TLO_MAX = DEFAULT_MOTO_TLO_MAX;
let ADDON_RATES: AddonRates = DEFAULT_ADDON_RATES;
export let NON_VEHICLE_RATES: NonVehicleRates = DEFAULT_NON_VEHICLE_RATES;

let activeMeta: { version: string; sourceReference: string; effectiveDate: string } = {
  version: 'SEOJK-6-2017-v1 (built-in)',
  sourceReference: 'SEOJK No. 6/SEOJK.05/2017',
  effectiveDate: '2017-01-01',
};

export function getActiveOjkRateMeta() {
  return activeMeta;
}

// Row shape mirrors the sp_ojk_rate_sets table columns (see
// supabase/migrations/20260704_ojk_rate_sets.sql and getActiveOjkRateSet()
// in services/supabaseService.ts). Called once at app startup, and again
// whenever the admin CMS activates a different/edited rate set.
export function applyOjkRateSet(row: {
  version: string;
  source_reference: string;
  effective_date: string;
  province_zones: Record<string, Zone>;
  category_bands: Record<string, number>;
  car_comp_min: ZoneTable; car_comp_mid: ZoneTable; car_comp_max: ZoneTable;
  car_tlo_min: ZoneTable; car_tlo_mid: ZoneTable; car_tlo_max: ZoneTable;
  moto_comp_min: number; moto_comp_mid: number; moto_comp_max: number;
  moto_tlo_min: Record<Zone, number>; moto_tlo_mid: Record<Zone, number>; moto_tlo_max: Record<Zone, number>;
  addon_rates: AddonRates;
  non_vehicle_rates: NonVehicleRates;
}): void {
  PROVINCE_ZONES = row.province_zones;
  CATEGORY_BANDS = {
    1: Number(row.category_bands['1']), 2: Number(row.category_bands['2']),
    3: Number(row.category_bands['3']), 4: Number(row.category_bands['4']),
  };
  CAR_COMP_MID = row.car_comp_mid; CAR_COMP_MIN = row.car_comp_min; CAR_COMP_MAX = row.car_comp_max;
  CAR_TLO_MID  = row.car_tlo_mid;  CAR_TLO_MIN  = row.car_tlo_min;  CAR_TLO_MAX  = row.car_tlo_max;
  MOTO_COMP_MIN = row.moto_comp_min; MOTO_COMP_MID = row.moto_comp_mid; MOTO_COMP_MAX = row.moto_comp_max;
  MOTO_TLO_MIN = row.moto_tlo_min; MOTO_TLO_MID = row.moto_tlo_mid; MOTO_TLO_MAX = row.moto_tlo_max;
  ADDON_RATES = row.addon_rates;
  NON_VEHICLE_RATES = row.non_vehicle_rates;
  activeMeta = { version: row.version, sourceReference: row.source_reference, effectiveDate: row.effective_date };
}

export const PROVINCES = Object.keys(DEFAULT_PROVINCE_ZONES).sort();

export function getZone(province: string): Zone {
  return PROVINCE_ZONES[province] ?? 3;
}

// ─── Vehicle Category (Roda 4) ────────────────────────────────────────────────
// Category based on Sum Insured / Harga Pertanggungan

export function getVehicleCategory(sumInsured: number): VehicleCategory {
  if (sumInsured <= CATEGORY_BANDS[1]) return 1;
  if (sumInsured <= CATEGORY_BANDS[2]) return 2;
  if (sumInsured <= CATEGORY_BANDS[3]) return 3;
  if (sumInsured <= CATEGORY_BANDS[4]) return 4;
  return 5;
}

export function getBaseRate(
  vehicleType: VehicleType,
  coverage: CoverageType,
  zone: Zone,
  category: VehicleCategory,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    return coverage === 'COMPREHENSIVE' ? MOTO_COMP_MID : MOTO_TLO_MID[zone];
  }
  const table = coverage === 'COMPREHENSIVE' ? CAR_COMP_MID : CAR_TLO_MID;
  return table[category][zone];
}

// ─── Add-on Rates ─────────────────────────────────────────────────────────────

export interface AddOns {
  flood: boolean;
  earthquake: boolean;
  riot: boolean;          // SRCC — Huru-hara dan Kerusuhan (OJK IV.B No.3)
  terrorism?: boolean;    // Terorisme dan Sabotase (OJK IV.B No.4)
  tplLimit: number;       // 0 | 10_000_000 | 25_000_000 | 50_000_000
  paDriver: boolean;      // PA for driver
  paPassengerSeats: number; // 0-7
}

export const TPL_OPTIONS = [
  { value: 0,          label: 'Tidak Ada' },
  { value: 10_000_000, label: 'Rp 10 Juta' },
  { value: 25_000_000, label: 'Rp 25 Juta' },
  { value: 50_000_000, label: 'Rp 50 Juta' },
];

// Progressive TPL (Tanggung Jawab Hukum Pihak Ketiga) per OJK IV.B No.5
// Kendaraan Penumpang & Sepeda Motor: 1% (≤25M) / 0.5% (25M-50M) / 0.25% (50M-100M)
function calcTplPremium(limit: number): number {
  if (limit <= 0) return 0;
  const { tplBand1Rate, tplBand1Cap, tplBand2Rate, tplBand2Cap, tplBand3Rate, tplBand3Cap } = ADDON_RATES;
  let p = 0;
  p += Math.min(limit, tplBand1Cap) * tplBand1Rate;
  if (limit > tplBand1Cap) p += Math.min(limit - tplBand1Cap, tplBand2Cap) * tplBand2Rate;
  if (limit > tplBand1Cap + tplBand2Cap) p += Math.min(limit - tplBand1Cap - tplBand2Cap, tplBand3Cap) * tplBand3Rate;
  return Math.round(p);
}

export function calcAddonPremium(addons: AddOns, sumInsured: number, coverage: CoverageType = 'COMPREHENSIVE'): number {
  // SRCC & Terorisme: COMP 0.05%, TLO 0.035% (OJK IV.B No.3 & No.4)
  const srccRate = coverage === 'COMPREHENSIVE' ? ADDON_RATES.srccComp : ADDON_RATES.srccTlo;
  let total = 0;
  if (addons.flood)            total += sumInsured * ADDON_RATES.flood;      // per Lampiran II Tabel II.B
  if (addons.earthquake)       total += sumInsured * ADDON_RATES.earthquake; // per Lampiran III Tabel III.E
  if (addons.riot)             total += sumInsured * srccRate;               // SRCC OJK IV.B No.3
  if (addons.terrorism)        total += sumInsured * srccRate;               // Terorisme OJK IV.B No.4
  total += calcTplPremium(addons.tplLimit);                                  // progressive OJK IV.B No.5
  if (addons.paDriver)         total += ADDON_RATES.paDriver;                // OJK IV.B No.6a
  total += addons.paPassengerSeats * ADDON_RATES.paPassengerPerSeat;         // OJK IV.B No.6b
  return Math.round(total);
}

export function getBaseRateByBand(
  vehicleType: VehicleType,
  coverage: CoverageType,
  zone: Zone,
  category: VehicleCategory,
  band: OjkBand,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    if (coverage === 'COMPREHENSIVE') {
      if (band === 'MIN') return MOTO_COMP_MIN;
      if (band === 'MAX') return MOTO_COMP_MAX;
      return MOTO_COMP_MID;
    }
    // TLO — zone-dependent for motorcycles
    if (band === 'MIN') return MOTO_TLO_MIN[zone];
    if (band === 'MAX') return MOTO_TLO_MAX[zone];
    return MOTO_TLO_MID[zone];
  }
  if (band === 'MID') {
    const table = coverage === 'COMPREHENSIVE' ? CAR_COMP_MID : CAR_TLO_MID;
    return table[category][zone];
  }
  const minT = coverage === 'COMPREHENSIVE' ? CAR_COMP_MIN : CAR_TLO_MIN;
  const maxT = coverage === 'COMPREHENSIVE' ? CAR_COMP_MAX : CAR_TLO_MAX;
  return band === 'MIN' ? minT[category][zone] : maxT[category][zone];
}

// ─── Full Premium Breakdown ───────────────────────────────────────────────────

export interface PremiumBreakdown {
  vehicleType: VehicleType;
  coverageType: CoverageType;
  zone: Zone;
  category: VehicleCategory;
  sumInsured: number;
  rate: number;
  basePremium: number;
  addonPremium: number;
  adminFee: number;
  stampDuty: number;
  total: number;
  addonsDetail: {
    flood: number;
    earthquake: number;
    riot: number;
    terrorism: number;
    tpl: number;
    paDriver: number;
    paPassenger: number;
  };
}

export function calcPremium(
  vehicleType: VehicleType,
  coverage: CoverageType,
  sumInsured: number,
  zone: Zone,
  addons: AddOns,
  band: OjkBand = 'MID',
): PremiumBreakdown {
  const category = vehicleType === 'CAR' ? getVehicleCategory(sumInsured) : 1;
  const rate      = getBaseRateByBand(vehicleType, coverage, zone, category, band);
  const basePremium = Math.round(sumInsured * rate);

  const srccRate = coverage === 'COMPREHENSIVE' ? ADDON_RATES.srccComp : ADDON_RATES.srccTlo;
  const addonDetail = {
    flood:       addons.flood        ? Math.round(sumInsured * ADDON_RATES.flood)      : 0,
    earthquake:  addons.earthquake   ? Math.round(sumInsured * ADDON_RATES.earthquake) : 0,
    riot:        addons.riot         ? Math.round(sumInsured * srccRate)               : 0,
    terrorism:   addons.terrorism    ? Math.round(sumInsured * srccRate)               : 0,
    tpl:         calcTplPremium(addons.tplLimit),
    paDriver:    addons.paDriver     ? ADDON_RATES.paDriver : 0,
    paPassenger: addons.paPassengerSeats * ADDON_RATES.paPassengerPerSeat,
  };

  const addonPremium = Object.values(addonDetail).reduce((a, b) => a + b, 0);
  const adminFee     = 50_000;
  const stampDuty    = 10_000;
  const total        = basePremium + addonPremium + adminFee + stampDuty;

  return {
    vehicleType,
    coverageType: coverage,
    zone,
    category,
    sumInsured,
    rate,
    basePremium,
    addonPremium,
    adminFee,
    stampDuty,
    total,
    addonsDetail: addonDetail,
  };
}

// ─── Constants for UI ─────────────────────────────────────────────────────────

export const CAR_MAKES = [
  'Toyota', 'Honda', 'Daihatsu', 'Suzuki', 'Mitsubishi', 'Hyundai', 'Kia',
  'Nissan', 'Isuzu', 'Wuling', 'Chery', 'DFSK', 'BYD', 'BMW', 'Mercedes-Benz',
  'Audi', 'Lexus', 'Ford', 'Volkswagen', 'Mazda', 'Subaru', 'Jeep',
  'Hino', 'Fuso', 'Lainnya',
];

export const MOTO_MAKES = [
  'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'TVS', 'Royal Enfield',
  'Harley-Davidson', 'Ducati', 'Vespa', 'Lainnya',
];

export const VEHICLE_USAGES = [
  { value: 'PERSONAL',    label: 'Pribadi / Keluarga' },
  { value: 'COMMERCIAL',  label: 'Komersial / Niaga' },
  { value: 'SOCIAL',      label: 'Sosial & Keagamaan' },
];

export const ZONE_LABELS: Record<Zone, string> = {
  1: 'Zona 1 — Sumatera',
  2: 'Zona 2 — Jakarta, Jabar, Banten',
  3: 'Zona 3 — Jawa Tengah–Timur, Kalimantan, Sulawesi, dll',
};
