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

// ─── OJK Rate Tables ──────────────────────────────────────────────────────────
// Source: SEOJK No. 6/SEOJK.05/2017 — midpoints of tarif bawah–tarif atas
// Zone: 1=Sumatera, 2=Jakarta/Jabar/Banten, 3=rest of Indonesia

// Comprehensive (All Risk) midpoint rates — Roda 4
// [category][zone]: e.g. 0.0401 = 4.01% per annum
const CAR_COMP_RATES: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0401, 2: 0.0343, 3: 0.0266 },
  2: { 1: 0.0281, 2: 0.0260, 3: 0.0283 },
  3: { 1: 0.0229, 2: 0.0219, 3: 0.0188 },
  4: { 1: 0.0126, 2: 0.0126, 3: 0.0120 },
  5: { 1: 0.0111, 2: 0.0111, 3: 0.0111 },
};

// TLO midpoint rates — Roda 4 (decreases with vehicle value, varies by zone)
const CAR_TLO_RATES: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0052, 2: 0.0072, 3: 0.0054 },
  2: { 1: 0.0066, 2: 0.0049, 3: 0.0046 },
  3: { 1: 0.0044, 2: 0.0040, 3: 0.0032 },
  4: { 1: 0.0028, 2: 0.0028, 3: 0.0025 },
  5: { 1: 0.0022, 2: 0.0022, 3: 0.0022 },
};

// Motorcycle (Roda 2) — COMP same nationwide; TLO zone-dependent
const MOTO_COMP_MIN = 0.0318;
const MOTO_COMP_MID = 0.0334;
const MOTO_COMP_MAX = 0.0350;
const MOTO_TLO_MIN: Record<Zone, number> = { 1: 0.0176, 2: 0.0180, 3: 0.0067 };
const MOTO_TLO_MID: Record<Zone, number> = { 1: 0.0194, 2: 0.0198, 3: 0.0074 };
const MOTO_TLO_MAX: Record<Zone, number> = { 1: 0.0211, 2: 0.0216, 3: 0.0080 };

export function getBaseRate(
  vehicleType: VehicleType,
  coverage: CoverageType,
  zone: Zone,
  category: VehicleCategory,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    return coverage === 'COMPREHENSIVE' ? MOTO_COMP_MID : MOTO_TLO_MID[zone];
  }
  const table = coverage === 'COMPREHENSIVE' ? CAR_COMP_RATES : CAR_TLO_RATES;
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
  let p = 0;
  p += Math.min(limit, 25_000_000) * 0.01;
  if (limit > 25_000_000) p += Math.min(limit - 25_000_000, 25_000_000) * 0.005;
  if (limit > 50_000_000) p += Math.min(limit - 50_000_000, 50_000_000) * 0.0025;
  return Math.round(p);
}

export function calcAddonPremium(addons: AddOns, sumInsured: number, coverage: CoverageType = 'COMPREHENSIVE'): number {
  // SRCC & Terorisme: COMP 0.05%, TLO 0.035% (OJK IV.B No.3 & No.4)
  const srccRate = coverage === 'COMPREHENSIVE' ? 0.0005 : 0.00035;
  let total = 0;
  if (addons.flood)            total += sumInsured * 0.0015;    // per Lampiran II Tabel II.B
  if (addons.earthquake)       total += sumInsured * 0.0012;    // per Lampiran III Tabel III.E
  if (addons.riot)             total += sumInsured * srccRate;  // SRCC OJK IV.B No.3
  if (addons.terrorism)        total += sumInsured * srccRate;  // Terorisme OJK IV.B No.4
  total += calcTplPremium(addons.tplLimit);                     // progressive OJK IV.B No.5
  if (addons.paDriver)         total += 50_000;                 // 0.5% × Rp10M PA sum assured OJK IV.B No.6a
  total += addons.paPassengerSeats * 25_000;                    // 0.1% × Rp25M PA sum assured/seat OJK IV.B No.6b
  return Math.round(total);
}

// ─── OJK Min/Max Rate Tables ──────────────────────────────────────────────────
// Source: SEOJK No. 6/SEOJK.05/2017 — tarif bawah (MIN) and tarif atas (MAX)

export const CAR_COMP_MIN: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0382, 2: 0.0326, 3: 0.0253 },
  2: { 1: 0.0267, 2: 0.0247, 3: 0.0269 },
  3: { 1: 0.0218, 2: 0.0208, 3: 0.0179 },
  4: { 1: 0.0120, 2: 0.0120, 3: 0.0114 },
  5: { 1: 0.0105, 2: 0.0105, 3: 0.0105 },
};

export const CAR_COMP_MAX: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0420, 2: 0.0359, 3: 0.0278 },
  2: { 1: 0.0294, 2: 0.0272, 3: 0.0296 },
  3: { 1: 0.0240, 2: 0.0229, 3: 0.0197 },
  4: { 1: 0.0132, 2: 0.0132, 3: 0.0125 },
  5: { 1: 0.0116, 2: 0.0116, 3: 0.0116 },
};

export const CAR_TLO_MIN: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0047, 2: 0.0065, 3: 0.0051 },
  2: { 1: 0.0063, 2: 0.0044, 3: 0.0044 },
  3: { 1: 0.0041, 2: 0.0038, 3: 0.0029 },
  4: { 1: 0.0025, 2: 0.0025, 3: 0.0023 },
  5: { 1: 0.0020, 2: 0.0020, 3: 0.0020 },
};

export const CAR_TLO_MAX: Record<VehicleCategory, Record<Zone, number>> = {
  1: { 1: 0.0056, 2: 0.0078, 3: 0.0056 },
  2: { 1: 0.0069, 2: 0.0053, 3: 0.0048 },
  3: { 1: 0.0046, 2: 0.0042, 3: 0.0035 },
  4: { 1: 0.0030, 2: 0.0030, 3: 0.0027 },
  5: { 1: 0.0024, 2: 0.0024, 3: 0.0024 },
};

export type OjkBand = 'MIN' | 'MID' | 'MAX';

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
    const table = coverage === 'COMPREHENSIVE' ? CAR_COMP_RATES : CAR_TLO_RATES;
    return table[category][zone];
  }
  const minT = coverage === 'COMPREHENSIVE' ? CAR_COMP_MIN : CAR_TLO_MIN;
  const maxT = coverage === 'COMPREHENSIVE' ? CAR_COMP_MAX : CAR_TLO_MAX;
  return band === 'MIN' ? minT[category][zone] : maxT[category][zone];
}

// Non-CAR product rate ranges (SEOJK 6/2017)
export const NON_VEHICLE_RATES = {
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
} as const;

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

  const srccRate = coverage === 'COMPREHENSIVE' ? 0.0005 : 0.00035;
  const addonDetail = {
    flood:       addons.flood        ? Math.round(sumInsured * 0.0015)    : 0,
    earthquake:  addons.earthquake   ? Math.round(sumInsured * 0.0012)    : 0,
    riot:        addons.riot         ? Math.round(sumInsured * srccRate)  : 0,
    terrorism:   addons.terrorism    ? Math.round(sumInsured * srccRate)  : 0,
    tpl:         calcTplPremium(addons.tplLimit),
    paDriver:    addons.paDriver     ? 50_000 : 0,
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
