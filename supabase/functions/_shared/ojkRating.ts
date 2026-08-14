// ─────────────────────────────────────────────────────────────────────────────
// Server-side OJK motor rating engine (SEOJK No. 6/SEOJK.05/2017).
//
// A Deno port of services/ojkRates.ts. The browser bundle computes premiums for
// the agent/customer wizards; the public API cannot reuse that, and must never
// trust a premium supplied by a partner — so quotes and orders coming in over
// the API are priced here, server-side, from the same tables.
//
// Source of truth at runtime is the active row in sp_ojk_rate_sets (managed by
// the admin OJK Rate CMS). The compiled-in tables below are the same seed used
// by the browser engine and are the fallback when no active row exists.
//
// Keep the numbers in this file in sync with services/ojkRates.ts.
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type Db = any;

export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type CoverageType = 'COMPREHENSIVE' | 'TLO';
export type Zone = 1 | 2 | 3;
export type VehicleCategory = 1 | 2 | 3 | 4 | 5;
export type OjkBand = 'MIN' | 'MID' | 'MAX';

type ZoneTable = Record<VehicleCategory, Record<Zone, number>>;

const DEFAULT_PROVINCE_ZONES: Record<string, Zone> = {
  'Aceh': 1, 'Sumatera Utara': 1, 'Sumatera Barat': 1, 'Riau': 1, 'Kepulauan Riau': 1,
  'Kepulauan Bangka Belitung': 1, 'Jambi': 1, 'Bengkulu': 1, 'Sumatera Selatan': 1, 'Lampung': 1,
  'DKI Jakarta': 2, 'Jawa Barat': 2, 'Banten': 2,
  'Jawa Tengah': 3, 'DI Yogyakarta': 3, 'Jawa Timur': 3, 'Bali': 3,
  'Kalimantan Barat': 3, 'Kalimantan Tengah': 3, 'Kalimantan Selatan': 3,
  'Kalimantan Timur': 3, 'Kalimantan Utara': 3,
  'Sulawesi Utara': 3, 'Sulawesi Tengah': 3, 'Sulawesi Selatan': 3, 'Sulawesi Tenggara': 3,
  'Gorontalo': 3, 'Sulawesi Barat': 3, 'Nusa Tenggara Barat': 3, 'Nusa Tenggara Timur': 3,
  'Maluku': 3, 'Maluku Utara': 3, 'Papua': 3, 'Papua Barat': 3, 'Papua Barat Daya': 3,
  'Papua Pegunungan': 3, 'Papua Tengah': 3, 'Papua Selatan': 3,
};

const DEFAULT_CATEGORY_BANDS: Record<1 | 2 | 3 | 4, number> = {
  1: 125_000_000, 2: 200_000_000, 3: 400_000_000, 4: 800_000_000,
};

const DEFAULT_CAR_COMP_MID: ZoneTable = {
  1: { 1: 0.0401, 2: 0.0343, 3: 0.0266 }, 2: { 1: 0.0281, 2: 0.0260, 3: 0.0283 },
  3: { 1: 0.0229, 2: 0.0219, 3: 0.0188 }, 4: { 1: 0.0126, 2: 0.0126, 3: 0.0120 },
  5: { 1: 0.0111, 2: 0.0111, 3: 0.0111 },
};
const DEFAULT_CAR_COMP_MIN: ZoneTable = {
  1: { 1: 0.0382, 2: 0.0326, 3: 0.0253 }, 2: { 1: 0.0267, 2: 0.0247, 3: 0.0269 },
  3: { 1: 0.0218, 2: 0.0208, 3: 0.0179 }, 4: { 1: 0.0120, 2: 0.0120, 3: 0.0114 },
  5: { 1: 0.0105, 2: 0.0105, 3: 0.0105 },
};
const DEFAULT_CAR_COMP_MAX: ZoneTable = {
  1: { 1: 0.0420, 2: 0.0359, 3: 0.0278 }, 2: { 1: 0.0294, 2: 0.0272, 3: 0.0296 },
  3: { 1: 0.0240, 2: 0.0229, 3: 0.0197 }, 4: { 1: 0.0132, 2: 0.0132, 3: 0.0125 },
  5: { 1: 0.0116, 2: 0.0116, 3: 0.0116 },
};
const DEFAULT_CAR_TLO_MID: ZoneTable = {
  1: { 1: 0.0052, 2: 0.0072, 3: 0.0054 }, 2: { 1: 0.0066, 2: 0.0049, 3: 0.0046 },
  3: { 1: 0.0044, 2: 0.0040, 3: 0.0032 }, 4: { 1: 0.0028, 2: 0.0028, 3: 0.0025 },
  5: { 1: 0.0022, 2: 0.0022, 3: 0.0022 },
};
const DEFAULT_CAR_TLO_MIN: ZoneTable = {
  1: { 1: 0.0047, 2: 0.0065, 3: 0.0051 }, 2: { 1: 0.0063, 2: 0.0044, 3: 0.0044 },
  3: { 1: 0.0041, 2: 0.0038, 3: 0.0029 }, 4: { 1: 0.0025, 2: 0.0025, 3: 0.0023 },
  5: { 1: 0.0020, 2: 0.0020, 3: 0.0020 },
};
const DEFAULT_CAR_TLO_MAX: ZoneTable = {
  1: { 1: 0.0056, 2: 0.0078, 3: 0.0056 }, 2: { 1: 0.0069, 2: 0.0053, 3: 0.0048 },
  3: { 1: 0.0046, 2: 0.0042, 3: 0.0035 }, 4: { 1: 0.0030, 2: 0.0030, 3: 0.0027 },
  5: { 1: 0.0024, 2: 0.0024, 3: 0.0024 },
};

const DEFAULT_MOTO_COMP = { min: 0.0318, mid: 0.0334, max: 0.0350 };
const DEFAULT_MOTO_TLO_MIN: Record<Zone, number> = { 1: 0.0176, 2: 0.0180, 3: 0.0067 };
const DEFAULT_MOTO_TLO_MID: Record<Zone, number> = { 1: 0.0194, 2: 0.0198, 3: 0.0074 };
const DEFAULT_MOTO_TLO_MAX: Record<Zone, number> = { 1: 0.0211, 2: 0.0216, 3: 0.0080 };

export interface AddonRates {
  flood: number; earthquake: number; srccComp: number; srccTlo: number;
  tplBand1Rate: number; tplBand1Cap: number;
  tplBand2Rate: number; tplBand2Cap: number;
  tplBand3Rate: number; tplBand3Cap: number;
  paDriver: number; paPassengerPerSeat: number;
}

const DEFAULT_ADDON_RATES: AddonRates = {
  flood: 0.0015, earthquake: 0.0012, srccComp: 0.0005, srccTlo: 0.00035,
  tplBand1Rate: 0.01, tplBand1Cap: 25_000_000,
  tplBand2Rate: 0.005, tplBand2Cap: 25_000_000,
  tplBand3Rate: 0.0025, tplBand3Cap: 50_000_000,
  paDriver: 50_000, paPassengerPerSeat: 25_000,
};

/** A fully resolved rate set — either the active DB row or the built-in seed. */
export interface RateSet {
  version: string;
  sourceReference: string;
  effectiveDate: string;
  provinceZones: Record<string, Zone>;
  categoryBands: Record<1 | 2 | 3 | 4, number>;
  carComp: Record<OjkBand, ZoneTable>;
  carTlo: Record<OjkBand, ZoneTable>;
  motoComp: Record<OjkBand, number>;
  motoTlo: Record<OjkBand, Record<Zone, number>>;
  addonRates: AddonRates;
}

export const BUILTIN_RATE_SET: RateSet = {
  version: 'SEOJK-6-2017-v1 (built-in)',
  sourceReference: 'SEOJK No. 6/SEOJK.05/2017',
  effectiveDate: '2017-01-01',
  provinceZones: DEFAULT_PROVINCE_ZONES,
  categoryBands: DEFAULT_CATEGORY_BANDS,
  carComp: { MIN: DEFAULT_CAR_COMP_MIN, MID: DEFAULT_CAR_COMP_MID, MAX: DEFAULT_CAR_COMP_MAX },
  carTlo:  { MIN: DEFAULT_CAR_TLO_MIN,  MID: DEFAULT_CAR_TLO_MID,  MAX: DEFAULT_CAR_TLO_MAX },
  motoComp: { MIN: DEFAULT_MOTO_COMP.min, MID: DEFAULT_MOTO_COMP.mid, MAX: DEFAULT_MOTO_COMP.max },
  motoTlo:  { MIN: DEFAULT_MOTO_TLO_MIN,  MID: DEFAULT_MOTO_TLO_MID,  MAX: DEFAULT_MOTO_TLO_MAX },
  addonRates: DEFAULT_ADDON_RATES,
};

// Isolates are short-lived but serve many requests; one fetch per isolate is
// plenty and keeps a burst of quote calls off the database.
let cached: { at: number; set: RateSet } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadRateSet(db: Db): Promise<RateSet> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.set;
  try {
    const { data } = await db.from('sp_ojk_rate_sets').select('*').eq('is_active', true).maybeSingle();
    const set: RateSet = data
      ? {
          version: data.version,
          sourceReference: data.source_reference,
          effectiveDate: data.effective_date,
          provinceZones: data.province_zones,
          categoryBands: {
            1: Number(data.category_bands['1']), 2: Number(data.category_bands['2']),
            3: Number(data.category_bands['3']), 4: Number(data.category_bands['4']),
          },
          carComp: { MIN: data.car_comp_min, MID: data.car_comp_mid, MAX: data.car_comp_max },
          carTlo:  { MIN: data.car_tlo_min,  MID: data.car_tlo_mid,  MAX: data.car_tlo_max },
          motoComp: { MIN: Number(data.moto_comp_min), MID: Number(data.moto_comp_mid), MAX: Number(data.moto_comp_max) },
          motoTlo:  { MIN: data.moto_tlo_min, MID: data.moto_tlo_mid, MAX: data.moto_tlo_max },
          addonRates: data.addon_rates,
        }
      : BUILTIN_RATE_SET;
    cached = { at: Date.now(), set };
    return set;
  } catch {
    // A rate-table outage must not take quoting down — fall back to the seed.
    return BUILTIN_RATE_SET;
  }
}

export function getZone(set: RateSet, province: string): Zone {
  return set.provinceZones[province] ?? 3;
}

export function listProvinces(set: RateSet): Array<{ province: string; zone: Zone }> {
  return Object.entries(set.provinceZones)
    .map(([province, zone]) => ({ province, zone: zone as Zone }))
    .sort((a, b) => a.province.localeCompare(b.province));
}

export function getVehicleCategory(set: RateSet, sumInsured: number): VehicleCategory {
  const b = set.categoryBands;
  if (sumInsured <= b[1]) return 1;
  if (sumInsured <= b[2]) return 2;
  if (sumInsured <= b[3]) return 3;
  if (sumInsured <= b[4]) return 4;
  return 5;
}

export function getBaseRate(
  set: RateSet, vehicleType: VehicleType, coverage: CoverageType,
  zone: Zone, category: VehicleCategory, band: OjkBand,
): number {
  if (vehicleType === 'MOTORCYCLE') {
    return coverage === 'COMPREHENSIVE' ? set.motoComp[band] : set.motoTlo[band][zone];
  }
  const table = coverage === 'COMPREHENSIVE' ? set.carComp[band] : set.carTlo[band];
  return table[category][zone];
}

export interface AddOns {
  flood: boolean;
  earthquake: boolean;
  riot: boolean;
  terrorism: boolean;
  tplLimit: number;
  paDriver: boolean;
  paPassengerSeats: number;
}

export const EMPTY_ADDONS: AddOns = {
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
};

// Progressive TPL per OJK IV.B No.5: 1% (≤25jt) / 0.5% (25–50jt) / 0.25% (50–100jt)
function calcTplPremium(rates: AddonRates, limit: number): number {
  if (limit <= 0) return 0;
  const { tplBand1Rate, tplBand1Cap, tplBand2Rate, tplBand2Cap, tplBand3Rate, tplBand3Cap } = rates;
  let p = Math.min(limit, tplBand1Cap) * tplBand1Rate;
  if (limit > tplBand1Cap) p += Math.min(limit - tplBand1Cap, tplBand2Cap) * tplBand2Rate;
  if (limit > tplBand1Cap + tplBand2Cap) p += Math.min(limit - tplBand1Cap - tplBand2Cap, tplBand3Cap) * tplBand3Rate;
  return Math.round(p);
}

export interface PremiumBreakdown {
  vehicleType: VehicleType;
  coverageType: CoverageType;
  band: OjkBand;
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
    flood: number; earthquake: number; riot: number; terrorism: number;
    tpl: number; pa_driver: number; pa_passenger: number;
  };
  rateSetVersion: string;
}

export interface Fees { adminFee: number; stampDuty: number }

export const DEFAULT_FEES: Fees = { adminFee: 50_000, stampDuty: 10_000 };

export function calcPremium(
  set: RateSet,
  vehicleType: VehicleType,
  coverage: CoverageType,
  sumInsured: number,
  zone: Zone,
  addons: AddOns,
  band: OjkBand = 'MID',
  fees: Fees = DEFAULT_FEES,
): PremiumBreakdown {
  const category = vehicleType === 'CAR' ? getVehicleCategory(set, sumInsured) : 1;
  const rate = getBaseRate(set, vehicleType, coverage, zone, category, band);
  const basePremium = Math.round(sumInsured * rate);

  const r = set.addonRates;
  const srccRate = coverage === 'COMPREHENSIVE' ? r.srccComp : r.srccTlo;
  const addonsDetail = {
    flood:        addons.flood      ? Math.round(sumInsured * r.flood)      : 0,
    earthquake:   addons.earthquake ? Math.round(sumInsured * r.earthquake) : 0,
    riot:         addons.riot       ? Math.round(sumInsured * srccRate)     : 0,
    terrorism:    addons.terrorism  ? Math.round(sumInsured * srccRate)     : 0,
    tpl:          calcTplPremium(r, addons.tplLimit),
    pa_driver:    addons.paDriver   ? r.paDriver : 0,
    pa_passenger: addons.paPassengerSeats * r.paPassengerPerSeat,
  };
  const addonPremium = Object.values(addonsDetail).reduce((a, b) => a + b, 0);

  return {
    vehicleType, coverageType: coverage, band, zone, category, sumInsured, rate,
    basePremium, addonPremium,
    adminFee: fees.adminFee, stampDuty: fees.stampDuty,
    total: basePremium + addonPremium + fees.adminFee + fees.stampDuty,
    addonsDetail,
    rateSetVersion: set.version,
  };
}

/** Normalises the `addons` object accepted by the public API. */
export function parseAddons(raw: Record<string, unknown>): AddOns {
  const bool = (v: unknown) => v === true || v === 'true';
  const tplLimit = Number(raw.tpl_limit ?? 0);
  const seats = Number(raw.pa_passenger_seats ?? 0);
  return {
    flood: bool(raw.flood),
    earthquake: bool(raw.earthquake),
    riot: bool(raw.riot),
    terrorism: bool(raw.terrorism),
    tplLimit: Number.isFinite(tplLimit) && tplLimit > 0 ? Math.min(tplLimit, 100_000_000) : 0,
    paDriver: bool(raw.pa_driver),
    paPassengerSeats: Number.isFinite(seats) ? Math.max(0, Math.min(Math.floor(seats), 7)) : 0,
  };
}
