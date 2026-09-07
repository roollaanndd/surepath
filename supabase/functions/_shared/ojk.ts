// Shared OJK motor rate engine for edge functions (Deno).
//
// Mirrors services/ojkRates.ts (the browser engine) so a premium quoted by
// Pathy server-side matches the number the buy-wizard shows in the app.
// Source of truth at runtime is the active row in sp_ojk_rate_sets (managed
// via the admin OJK Rate CMS); the tables below are the compiled-in fallback
// used when that fetch fails or no row is active — identical to the defaults
// in services/ojkRates.ts. Keep the two in sync when either changes.
//
// Basis: SEOJK No. 6/SEOJK.05/2017.

export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type CoverageType = 'COMPREHENSIVE' | 'TLO';
export type Zone = 1 | 2 | 3;
export type VehicleCategory = 1 | 2 | 3 | 4 | 5;
export type OjkBand = 'MIN' | 'MID' | 'MAX';

type ZoneTable = Record<number, Record<number, number>>;

export interface AddOns {
  flood: boolean;
  earthquake: boolean;
  riot: boolean;
  terrorism: boolean;
  tplLimit: number;
  paDriver: boolean;
  paPassengerSeats: number;
}

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

export interface RateSet {
  version: string;
  sourceReference: string;
  provinceZones: Record<string, Zone>;
  categoryBands: Record<number, number>;
  carCompMin: ZoneTable; carCompMid: ZoneTable; carCompMax: ZoneTable;
  carTloMin: ZoneTable;  carTloMid: ZoneTable;  carTloMax: ZoneTable;
  motoCompMin: number; motoCompMid: number; motoCompMax: number;
  motoTloMin: Record<number, number>;
  motoTloMid: Record<number, number>;
  motoTloMax: Record<number, number>;
  addonRates: AddonRates;
}

const DEFAULT_PROVINCE_ZONES: Record<string, Zone> = {
  'Aceh': 1, 'Sumatera Utara': 1, 'Sumatera Barat': 1, 'Riau': 1,
  'Kepulauan Riau': 1, 'Kepulauan Bangka Belitung': 1, 'Jambi': 1,
  'Bengkulu': 1, 'Sumatera Selatan': 1, 'Lampung': 1,
  'DKI Jakarta': 2, 'Jawa Barat': 2, 'Banten': 2,
  'Jawa Tengah': 3, 'DI Yogyakarta': 3, 'Jawa Timur': 3, 'Bali': 3,
  'Kalimantan Barat': 3, 'Kalimantan Tengah': 3, 'Kalimantan Selatan': 3,
  'Kalimantan Timur': 3, 'Kalimantan Utara': 3, 'Sulawesi Utara': 3,
  'Sulawesi Tengah': 3, 'Sulawesi Selatan': 3, 'Sulawesi Tenggara': 3,
  'Gorontalo': 3, 'Sulawesi Barat': 3, 'Nusa Tenggara Barat': 3,
  'Nusa Tenggara Timur': 3, 'Maluku': 3, 'Maluku Utara': 3, 'Papua': 3,
  'Papua Barat': 3, 'Papua Barat Daya': 3, 'Papua Pegunungan': 3,
  'Papua Tengah': 3, 'Papua Selatan': 3,
};

export const BUILTIN_RATE_SET: RateSet = {
  version: 'SEOJK-6-2017-v1 (built-in)',
  sourceReference: 'SEOJK No. 6/SEOJK.05/2017',
  provinceZones: DEFAULT_PROVINCE_ZONES,
  categoryBands: { 1: 125_000_000, 2: 200_000_000, 3: 400_000_000, 4: 800_000_000 },
  carCompMid: {
    1: { 1: 0.0401, 2: 0.0343, 3: 0.0266 }, 2: { 1: 0.0281, 2: 0.0260, 3: 0.0283 },
    3: { 1: 0.0229, 2: 0.0219, 3: 0.0188 }, 4: { 1: 0.0126, 2: 0.0126, 3: 0.0120 },
    5: { 1: 0.0111, 2: 0.0111, 3: 0.0111 },
  },
  carCompMin: {
    1: { 1: 0.0382, 2: 0.0326, 3: 0.0253 }, 2: { 1: 0.0267, 2: 0.0247, 3: 0.0269 },
    3: { 1: 0.0218, 2: 0.0208, 3: 0.0179 }, 4: { 1: 0.0120, 2: 0.0120, 3: 0.0114 },
    5: { 1: 0.0105, 2: 0.0105, 3: 0.0105 },
  },
  carCompMax: {
    1: { 1: 0.0420, 2: 0.0359, 3: 0.0278 }, 2: { 1: 0.0294, 2: 0.0272, 3: 0.0296 },
    3: { 1: 0.0240, 2: 0.0229, 3: 0.0197 }, 4: { 1: 0.0132, 2: 0.0132, 3: 0.0125 },
    5: { 1: 0.0116, 2: 0.0116, 3: 0.0116 },
  },
  carTloMid: {
    1: { 1: 0.0052, 2: 0.0072, 3: 0.0054 }, 2: { 1: 0.0066, 2: 0.0049, 3: 0.0046 },
    3: { 1: 0.0044, 2: 0.0040, 3: 0.0032 }, 4: { 1: 0.0028, 2: 0.0028, 3: 0.0025 },
    5: { 1: 0.0022, 2: 0.0022, 3: 0.0022 },
  },
  carTloMin: {
    1: { 1: 0.0047, 2: 0.0065, 3: 0.0051 }, 2: { 1: 0.0063, 2: 0.0044, 3: 0.0044 },
    3: { 1: 0.0041, 2: 0.0038, 3: 0.0029 }, 4: { 1: 0.0025, 2: 0.0025, 3: 0.0023 },
    5: { 1: 0.0020, 2: 0.0020, 3: 0.0020 },
  },
  carTloMax: {
    1: { 1: 0.0056, 2: 0.0078, 3: 0.0056 }, 2: { 1: 0.0069, 2: 0.0053, 3: 0.0048 },
    3: { 1: 0.0046, 2: 0.0042, 3: 0.0035 }, 4: { 1: 0.0030, 2: 0.0030, 3: 0.0027 },
    5: { 1: 0.0024, 2: 0.0024, 3: 0.0024 },
  },
  motoCompMin: 0.0318, motoCompMid: 0.0334, motoCompMax: 0.0350,
  motoTloMin: { 1: 0.0176, 2: 0.0180, 3: 0.0067 },
  motoTloMid: { 1: 0.0194, 2: 0.0198, 3: 0.0074 },
  motoTloMax: { 1: 0.0211, 2: 0.0216, 3: 0.0080 },
  addonRates: {
    flood: 0.0015, earthquake: 0.0012, srccComp: 0.0005, srccTlo: 0.00035,
    tplBand1Rate: 0.01,   tplBand1Cap: 25_000_000,
    tplBand2Rate: 0.005,  tplBand2Cap: 25_000_000,
    tplBand3Rate: 0.0025, tplBand3Cap: 50_000_000,
    paDriver: 50_000, paPassengerPerSeat: 25_000,
  },
};

// Admin fee + stamp duty applied by the buy wizard (services/ojkRates.ts).
export const ADMIN_FEE = 50_000;
export const STAMP_DUTY = 10_000;

/**
 * Loads the active rate set from sp_ojk_rate_sets, falling back to the
 * compiled-in tables. Never throws — a quote is better served with the
 * built-in OJK tables than not served at all.
 */
// deno-lint-ignore no-explicit-any
export async function loadRateSet(db: any): Promise<RateSet> {
  try {
    const { data, error } = await db
      .from('sp_ojk_rate_sets')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return BUILTIN_RATE_SET;
    const bands = data.category_bands ?? {};
    return {
      version: data.version ?? BUILTIN_RATE_SET.version,
      sourceReference: data.source_reference ?? BUILTIN_RATE_SET.sourceReference,
      provinceZones: data.province_zones ?? BUILTIN_RATE_SET.provinceZones,
      categoryBands: {
        1: Number(bands['1'] ?? BUILTIN_RATE_SET.categoryBands[1]),
        2: Number(bands['2'] ?? BUILTIN_RATE_SET.categoryBands[2]),
        3: Number(bands['3'] ?? BUILTIN_RATE_SET.categoryBands[3]),
        4: Number(bands['4'] ?? BUILTIN_RATE_SET.categoryBands[4]),
      },
      carCompMin: data.car_comp_min ?? BUILTIN_RATE_SET.carCompMin,
      carCompMid: data.car_comp_mid ?? BUILTIN_RATE_SET.carCompMid,
      carCompMax: data.car_comp_max ?? BUILTIN_RATE_SET.carCompMax,
      carTloMin:  data.car_tlo_min  ?? BUILTIN_RATE_SET.carTloMin,
      carTloMid:  data.car_tlo_mid  ?? BUILTIN_RATE_SET.carTloMid,
      carTloMax:  data.car_tlo_max  ?? BUILTIN_RATE_SET.carTloMax,
      motoCompMin: Number(data.moto_comp_min ?? BUILTIN_RATE_SET.motoCompMin),
      motoCompMid: Number(data.moto_comp_mid ?? BUILTIN_RATE_SET.motoCompMid),
      motoCompMax: Number(data.moto_comp_max ?? BUILTIN_RATE_SET.motoCompMax),
      motoTloMin: data.moto_tlo_min ?? BUILTIN_RATE_SET.motoTloMin,
      motoTloMid: data.moto_tlo_mid ?? BUILTIN_RATE_SET.motoTloMid,
      motoTloMax: data.moto_tlo_max ?? BUILTIN_RATE_SET.motoTloMax,
      addonRates: { ...BUILTIN_RATE_SET.addonRates, ...(data.addon_rates ?? {}) },
    };
  } catch {
    return BUILTIN_RATE_SET;
  }
}

export function getZone(rs: RateSet, province: string): Zone {
  return rs.provinceZones[province] ?? 3;
}

export function getVehicleCategory(rs: RateSet, sumInsured: number): VehicleCategory {
  if (sumInsured <= rs.categoryBands[1]) return 1;
  if (sumInsured <= rs.categoryBands[2]) return 2;
  if (sumInsured <= rs.categoryBands[3]) return 3;
  if (sumInsured <= rs.categoryBands[4]) return 4;
  return 5;
}

export function getBaseRateByBand(
  rs: RateSet, vehicleType: VehicleType, coverage: CoverageType,
  zone: Zone, category: VehicleCategory, band: OjkBand,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    if (coverage === 'COMPREHENSIVE') {
      return band === 'MIN' ? rs.motoCompMin : band === 'MAX' ? rs.motoCompMax : rs.motoCompMid;
    }
    const t = band === 'MIN' ? rs.motoTloMin : band === 'MAX' ? rs.motoTloMax : rs.motoTloMid;
    return Number(t[zone]);
  }
  const table = coverage === 'COMPREHENSIVE'
    ? (band === 'MIN' ? rs.carCompMin : band === 'MAX' ? rs.carCompMax : rs.carCompMid)
    : (band === 'MIN' ? rs.carTloMin  : band === 'MAX' ? rs.carTloMax  : rs.carTloMid);
  return Number(table[category][zone]);
}

function calcTplPremium(rs: RateSet, limit: number): number {
  if (limit <= 0) return 0;
  const a = rs.addonRates;
  let p = Math.min(limit, a.tplBand1Cap) * a.tplBand1Rate;
  if (limit > a.tplBand1Cap) p += Math.min(limit - a.tplBand1Cap, a.tplBand2Cap) * a.tplBand2Rate;
  if (limit > a.tplBand1Cap + a.tplBand2Cap) {
    p += Math.min(limit - a.tplBand1Cap - a.tplBand2Cap, a.tplBand3Cap) * a.tplBand3Rate;
  }
  return Math.round(p);
}

export interface PremiumBreakdown {
  vehicleType: VehicleType;
  coverageType: CoverageType;
  zone: Zone;
  category: VehicleCategory;
  sumInsured: number;
  rate: number;
  ratePercent: number;
  basePremium: number;
  addonPremium: number;
  adminFee: number;
  stampDuty: number;
  total: number;
  addonsDetail: Record<string, number>;
  rateSetVersion: string;
}

export function calcPremium(
  rs: RateSet,
  vehicleType: VehicleType,
  coverage: CoverageType,
  sumInsured: number,
  zone: Zone,
  addons: AddOns,
  band: OjkBand = 'MID',
): PremiumBreakdown {
  const category = vehicleType === 'CAR' ? getVehicleCategory(rs, sumInsured) : 1;
  const rate = getBaseRateByBand(rs, vehicleType, coverage, zone, category, band);
  const basePremium = Math.round(sumInsured * rate);
  const a = rs.addonRates;
  const srccRate = coverage === 'COMPREHENSIVE' ? a.srccComp : a.srccTlo;

  const addonsDetail = {
    flood:       addons.flood      ? Math.round(sumInsured * a.flood) : 0,
    earthquake:  addons.earthquake ? Math.round(sumInsured * a.earthquake) : 0,
    riot:        addons.riot       ? Math.round(sumInsured * srccRate) : 0,
    terrorism:   addons.terrorism  ? Math.round(sumInsured * srccRate) : 0,
    tpl:         calcTplPremium(rs, addons.tplLimit),
    paDriver:    addons.paDriver   ? a.paDriver : 0,
    paPassenger: addons.paPassengerSeats * a.paPassengerPerSeat,
  };
  const addonPremium = Object.values(addonsDetail).reduce((x, y) => x + y, 0);

  return {
    vehicleType, coverageType: coverage, zone, category, sumInsured,
    rate, ratePercent: Number((rate * 100).toFixed(3)),
    basePremium, addonPremium,
    adminFee: ADMIN_FEE, stampDuty: STAMP_DUTY,
    total: basePremium + addonPremium + ADMIN_FEE + STAMP_DUTY,
    addonsDetail,
    rateSetVersion: rs.version,
  };
}
