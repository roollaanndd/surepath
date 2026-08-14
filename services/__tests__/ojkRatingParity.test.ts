// Parity between the two OJK rating engines.
//
// The browser prices quotes with services/ojkRates.ts; the public API prices
// them server-side with supabase/functions/_shared/ojkRating.ts, because it
// must never trust a premium supplied by a partner. That means the seed rate
// tables exist in two files, and a partner quote silently disagreeing with the
// agent wizard would be a very expensive kind of bug to find in production.
//
// These tests sweep the rating inputs and assert both engines agree to the
// rupiah. If you change a rate in one file, this fails until you change the
// other.
//
// Only the compiled-in seed tables are compared. At runtime both engines are
// overridden by the active sp_ojk_rate_sets row, which is a single source by
// construction.

import { describe, it, expect } from 'vitest';

import {
  calcPremium as calcPremiumWeb,
  getVehicleCategory as getCategoryWeb,
  getZone as getZoneWeb,
  PROVINCE_ZONES,
  type AddOns as AddOnsWeb,
  type CoverageType,
  type OjkBand,
  type VehicleType,
  type Zone,
} from '../ojkRates';

import {
  BUILTIN_RATE_SET,
  calcPremium as calcPremiumEdge,
  getVehicleCategory as getCategoryEdge,
  getZone as getZoneEdge,
  listProvinces,
  parseAddons,
  type AddOns as AddOnsEdge,
} from '../../supabase/functions/_shared/ojkRating';

const VEHICLE_TYPES: VehicleType[] = ['CAR', 'MOTORCYCLE'];
const COVERAGES: CoverageType[] = ['COMPREHENSIVE', 'TLO'];
const BANDS: OjkBand[] = ['MIN', 'MID', 'MAX'];
const ZONES: Zone[] = [1, 2, 3];

// One sum insured inside each category band, plus the boundaries themselves.
const SUMS = [
  50_000_000, 125_000_000, 125_000_001, 200_000_000, 200_000_001,
  400_000_000, 400_000_001, 800_000_000, 800_000_001, 2_500_000_000,
];

const NO_ADDONS: AddOnsWeb = {
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
};

const ALL_ADDONS: AddOnsWeb = {
  flood: true, earthquake: true, riot: true, terrorism: true,
  tplLimit: 50_000_000, paDriver: true, paPassengerSeats: 7,
};

// Straddles both progressive TPL band boundaries (25jt and 50jt).
const TPL_LIMITS = [0, 10_000_000, 25_000_000, 50_000_000, 100_000_000];

function compare(
  vehicleType: VehicleType, coverage: CoverageType, sumInsured: number,
  zone: Zone, addons: AddOnsWeb, band: OjkBand,
) {
  const web = calcPremiumWeb(vehicleType, coverage, sumInsured, zone, addons, band);
  const edge = calcPremiumEdge(BUILTIN_RATE_SET, vehicleType, coverage, sumInsured, zone, addons as AddOnsEdge, band);
  return { web, edge };
}

describe('OJK rating engine parity — web vs edge', () => {
  it('agrees on every vehicle type / coverage / zone / band / sum insured, with no add-ons', () => {
    for (const vehicleType of VEHICLE_TYPES) {
      for (const coverage of COVERAGES) {
        for (const zone of ZONES) {
          for (const band of BANDS) {
            for (const sumInsured of SUMS) {
              const { web, edge } = compare(vehicleType, coverage, sumInsured, zone, NO_ADDONS, band);
              const where = `${vehicleType}/${coverage}/zone${zone}/${band}/${sumInsured}`;
              expect(edge.rate, `rate @ ${where}`).toBe(web.rate);
              expect(edge.basePremium, `base @ ${where}`).toBe(web.basePremium);
              expect(edge.category, `category @ ${where}`).toBe(web.category);
              expect(edge.total, `total @ ${where}`).toBe(web.total);
            }
          }
        }
      }
    }
  });

  it('agrees with every add-on switched on', () => {
    for (const vehicleType of VEHICLE_TYPES) {
      for (const coverage of COVERAGES) {
        for (const zone of ZONES) {
          const { web, edge } = compare(vehicleType, coverage, 300_000_000, zone, ALL_ADDONS, 'MID');
          const where = `${vehicleType}/${coverage}/zone${zone}`;
          expect(edge.addonPremium, `addons @ ${where}`).toBe(web.addonPremium);
          expect(edge.total, `total @ ${where}`).toBe(web.total);
        }
      }
    }
  });

  it('agrees on each add-on in isolation, so no single rate can drift unnoticed', () => {
    const singles: Array<[string, Partial<AddOnsWeb>]> = [
      ['flood', { flood: true }],
      ['earthquake', { earthquake: true }],
      ['riot', { riot: true }],
      ['terrorism', { terrorism: true }],
      ['paDriver', { paDriver: true }],
      ['paPassengerSeats', { paPassengerSeats: 4 }],
    ];
    for (const [label, patch] of singles) {
      for (const coverage of COVERAGES) {
        const addons = { ...NO_ADDONS, ...patch };
        const { web, edge } = compare('CAR', coverage, 250_000_000, 2, addons, 'MID');
        expect(edge.addonPremium, `${label} / ${coverage}`).toBe(web.addonPremium);
      }
    }
  });

  it('agrees on progressive TPL across both band boundaries', () => {
    for (const tplLimit of TPL_LIMITS) {
      const addons = { ...NO_ADDONS, tplLimit };
      const { web, edge } = compare('CAR', 'COMPREHENSIVE', 250_000_000, 2, addons, 'MID');
      expect(edge.addonsDetail.tpl, `tpl ${tplLimit}`).toBe(web.addonsDetail.tpl);
    }
  });

  it('agrees on the per-add-on breakdown, not just the total', () => {
    const { web, edge } = compare('CAR', 'COMPREHENSIVE', 400_000_000, 1, ALL_ADDONS, 'MAX');
    expect(edge.addonsDetail.flood).toBe(web.addonsDetail.flood);
    expect(edge.addonsDetail.earthquake).toBe(web.addonsDetail.earthquake);
    expect(edge.addonsDetail.riot).toBe(web.addonsDetail.riot);
    expect(edge.addonsDetail.terrorism).toBe(web.addonsDetail.terrorism);
    expect(edge.addonsDetail.tpl).toBe(web.addonsDetail.tpl);
    // The edge engine snake_cases these two for the JSON API; same numbers.
    expect(edge.addonsDetail.pa_driver).toBe(web.addonsDetail.paDriver);
    expect(edge.addonsDetail.pa_passenger).toBe(web.addonsDetail.paPassenger);
  });

  it('agrees on category banding and province → zone mapping', () => {
    for (const sumInsured of SUMS) {
      expect(getCategoryEdge(BUILTIN_RATE_SET, sumInsured), `category @ ${sumInsured}`)
        .toBe(getCategoryWeb(sumInsured));
    }
    for (const province of Object.keys(PROVINCE_ZONES)) {
      expect(getZoneEdge(BUILTIN_RATE_SET, province), `zone @ ${province}`).toBe(getZoneWeb(province));
    }
    // An unknown province must fall back to zone 3 in both engines, not throw.
    expect(getZoneEdge(BUILTIN_RATE_SET, 'Atlantis')).toBe(getZoneWeb('Atlantis'));
  });

  it('exposes the same province list the browser engine uses', () => {
    const edgeProvinces = listProvinces(BUILTIN_RATE_SET).map((p) => p.province);
    expect(edgeProvinces).toEqual(Object.keys(PROVINCE_ZONES).sort());
  });
});

describe('parseAddons — the public API input coercion', () => {
  it('defaults everything off for an empty payload', () => {
    expect(parseAddons({})).toEqual({
      flood: false, earthquake: false, riot: false, terrorism: false,
      tplLimit: 0, paDriver: false, paPassengerSeats: 0,
    });
  });

  it('accepts booleans and their string forms, and rejects anything else as false', () => {
    const parsed = parseAddons({ flood: true, earthquake: 'true', riot: 'yes', terrorism: 1 });
    expect(parsed.flood).toBe(true);
    expect(parsed.earthquake).toBe(true);
    expect(parsed.riot).toBe(false);
    expect(parsed.terrorism).toBe(false);
  });

  it('clamps passenger seats to 0–7 and floors fractions', () => {
    expect(parseAddons({ pa_passenger_seats: 12 }).paPassengerSeats).toBe(7);
    expect(parseAddons({ pa_passenger_seats: -3 }).paPassengerSeats).toBe(0);
    expect(parseAddons({ pa_passenger_seats: 3.9 }).paPassengerSeats).toBe(3);
    expect(parseAddons({ pa_passenger_seats: 'abc' }).paPassengerSeats).toBe(0);
  });

  it('caps the TPL limit at 100jt and treats negatives as no cover', () => {
    expect(parseAddons({ tpl_limit: 500_000_000 }).tplLimit).toBe(100_000_000);
    expect(parseAddons({ tpl_limit: -1 }).tplLimit).toBe(0);
    expect(parseAddons({ tpl_limit: 25_000_000 }).tplLimit).toBe(25_000_000);
  });
});
