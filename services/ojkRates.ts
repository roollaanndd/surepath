// OJK Motor Vehicle Insurance Rate Engine
// Based on SEOJK No. 6/SEOJK.05/2017 (Surat Edaran OJK tentang Tarif Premi Asuransi Kendaraan Bermotor)

export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type CoverageType = 'COMPREHENSIVE' | 'TLO';
export type Zone = 1 | 2 | 3;
export type VehicleCategory = 1 | 2 | 3 | 4 | 5;

// ─── Province → Zone Mapping ──────────────────────────────────────────────────

export const PROVINCE_ZONES: Record<string, Zone> = {
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

export const PROVINCES = Object.keys(PROVINCE_ZONES).sort();

export function getZone(province: string): Zone {
  return PROVINCE_ZONES[province] ?? 3;
}

// ─── Vehicle Category (Roda 4) ────────────────────────────────────────────────
// Category based on Sum Insured / Harga Pertanggungan

export function getVehicleCategory(sumInsured: number): VehicleCategory {
  if (sumInsured <= 125_000_000)  return 1;
  if (sumInsured <= 200_000_000)  return 2;
  if (sumInsured <= 400_000_000)  return 3;
  if (sumInsured <= 800_000_000)  return 4;
  return 5;
}

// ─── OJK Rate Tables (midpoint of tarif bawah–tarif atas) ────────────────────
// Source: SEOJK No. 6/SEOJK.05/2017

// Comprehensive (All Risk) rates — Roda 4
// [category][zone]: percentage (e.g. 0.0401 = 4.01%)
const CAR_COMP_RATES: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0401, 2: 0.0343, 3: 0.0266 },
  2: { 1: 0.0281, 2: 0.0260, 3: 0.0218 },
  3: { 1: 0.0229, 2: 0.0218, 3: 0.0188 },
  4: { 1: 0.0189, 2: 0.0180, 3: 0.0176 },
  5: { 1: 0.0140, 2: 0.0140, 3: 0.0140 },
};

// TLO rates — Roda 4
const CAR_TLO_RATES: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0056, 2: 0.0044, 3: 0.0047 },
  2: { 1: 0.0069, 2: 0.0064, 3: 0.0063 },
  3: { 1: 0.0099, 2: 0.0095, 3: 0.0090 },
  4: { 1: 0.0121, 2: 0.0114, 3: 0.0110 },
  5: { 1: 0.0132, 2: 0.0126, 3: 0.0120 },
};

// Motorcycle (Roda 2) — same rate nationwide
const MOTO_COMP_RATE = 0.0290; // 2.90%
const MOTO_TLO_RATE  = 0.0065; // 0.65%

export function getBaseRate(
  vehicleType: VehicleType,
  coverage: CoverageType,
  zone: Zone,
  category: VehicleCategory,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    return coverage === 'COMPREHENSIVE' ? MOTO_COMP_RATE : MOTO_TLO_RATE;
  }
  const table = coverage === 'COMPREHENSIVE' ? CAR_COMP_RATES : CAR_TLO_RATES;
  return table[category][zone];
}

// ─── Add-on Rates ─────────────────────────────────────────────────────────────

export interface AddOns {
  flood: boolean;
  earthquake: boolean;
  riot: boolean;
  tplLimit: number;      // 0 | 10_000_000 | 25_000_000 | 50_000_000
  paDriver: boolean;     // PA for driver
  paPassengerSeats: number; // 0-7
}

export const TPL_OPTIONS = [
  { value: 0,          label: 'Tidak Ada' },
  { value: 10_000_000, label: 'Rp 10 Juta' },
  { value: 25_000_000, label: 'Rp 25 Juta' },
  { value: 50_000_000, label: 'Rp 50 Juta' },
];

const TPL_PREMIUM: Record<number, number> = {
  0:          0,
  10_000_000: 50_000,
  25_000_000: 100_000,
  50_000_000: 200_000,
};

export function calcAddonPremium(addons: AddOns, sumInsured: number): number {
  let total = 0;
  if (addons.flood)      total += sumInsured * 0.0015;   // 0.15%
  if (addons.earthquake) total += sumInsured * 0.0012;   // 0.12%
  if (addons.riot)       total += sumInsured * 0.0007;   // 0.07%
  total += TPL_PREMIUM[addons.tplLimit] ?? 0;
  if (addons.paDriver)   total += 50_000;                // Rp 50k/tahun
  total += addons.paPassengerSeats * 25_000;             // Rp 25k/seat/tahun
  return Math.round(total);
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
): PremiumBreakdown {
  const category = vehicleType === 'CAR' ? getVehicleCategory(sumInsured) : 1;
  const rate      = getBaseRate(vehicleType, coverage, zone, category);
  const basePremium = Math.round(sumInsured * rate);

  const addonDetail = {
    flood:       addons.flood      ? Math.round(sumInsured * 0.0015) : 0,
    earthquake:  addons.earthquake ? Math.round(sumInsured * 0.0012) : 0,
    riot:        addons.riot       ? Math.round(sumInsured * 0.0007) : 0,
    tpl:         TPL_PREMIUM[addons.tplLimit] ?? 0,
    paDriver:    addons.paDriver ? 50_000 : 0,
    paPassenger: addons.paPassengerSeats * 25_000,
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
