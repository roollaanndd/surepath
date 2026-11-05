// B2B bulk fleet TLO rating engine — correctness against the pilot partner's
// (Mutiara Finance / PT MMF) reference audit figures, + Deno/browser parity.
import { describe, it, expect } from 'vitest';
import * as browser from '../b2bFleetRating';
import * as deno from '../../supabase/functions/_shared/b2bFleetRating.ts';

describe('b2bFleetRating — browser/Deno parity', () => {
  it('exposes the same rate tables and constants', () => {
    expect(deno.PICKUP_TRUCK_TLO_MIN).toEqual(browser.PICKUP_TRUCK_TLO_MIN);
    expect(deno.HEAVY_EQUIPMENT_TLO_RATE).toBe(browser.HEAVY_EQUIPMENT_TLO_RATE);
    expect(deno.DISCOUNT_RATE_STANDARD).toBe(browser.DISCOUNT_RATE_STANDARD);
    expect(deno.DISCOUNT_RATE_HEAVY).toBe(browser.DISCOUNT_RATE_HEAVY);
    expect(deno.ADMIN_FEE_MOTORCYCLE).toBe(browser.ADMIN_FEE_MOTORCYCLE);
    expect(deno.ADMIN_FEE_CAR).toBe(browser.ADMIN_FEE_CAR);
    expect(deno.ADMIN_FEE_HEAVY).toBe(browser.ADMIN_FEE_HEAVY);
    expect(deno.MIN_PREMIUM_GROSS).toBe(browser.MIN_PREMIUM_GROSS);
  });

  it('calcBulkPremium agrees on a representative set of inputs', () => {
    const cases: Array<Parameters<typeof browser.calcBulkPremium>[0]> = [
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 },
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 3_000_000, otr: 7_000_000, tenorMonths: 12 },
      { vehicleClass: 'CAR', zone: 2, financingValue: 13_000_000, otr: 41_000_000, tenorMonths: 12, commercialBodyHint: true },
      { vehicleClass: 'CAR', zone: 1, financingValue: 10_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: false },
      { vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 },
    ];
    for (const c of cases) {
      expect(deno.calcBulkPremium(c)).toEqual(browser.calcBulkPremium(c));
    }
  });

  it('classification and zone detection agree', () => {
    expect(deno.classifyVehicleClass('MOTOR BEKAS')).toBe(browser.classifyVehicleClass('MOTOR BEKAS'));
    expect(deno.classifyVehicleClass('ALAT BERAT')).toBe(browser.classifyVehicleClass('ALAT BERAT'));
    expect(deno.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012')).toBe(true);
    expect(deno.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012')).toBe(browser.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012'));
    expect(deno.detectZone('SERANG', 'A1977YX')).toEqual(browser.detectZone('SERANG', 'A1977YX'));
    expect(deno.detectZone(null, 'BG8775FQ')).toEqual(browser.detectZone(null, 'BG8775FQ'));
  });
});

describe('b2bFleetRating — matches the PT MMF reference audit', () => {
  it('row 1: DENI KASSUARI — motor, Zona 2, 12 bulan, floor premium', () => {
    const r = browser.calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 });
    expect(r.rate).toBeCloseTo(0.018, 6);
    expect(r.premiumGross).toBe(50_000); // 2,500,000 * 0.018 = 45,000 < floor
    expect(r.discountAmount).toBe(12_500);
    expect(r.premiumAfterDiscount).toBe(37_500);
    expect(r.adminFee).toBe(25_000);
    expect(r.totalPremium).toBe(62_500);
  });

  it('row 2: RITA TJUNG — alat berat, Zona 3, 3 bulan', () => {
    const r = browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 });
    expect(r.rate).toBe(0.0085);
    expect(r.premiumGross).toBe(2_125_000); // 1e9 * 0.0085 * 3/12
    expect(r.discountAmount).toBe(318_750); // 15%
    expect(r.premiumAfterDiscount).toBe(1_806_250);
    expect(r.adminFee).toBe(65_000);
    expect(r.totalPremium).toBe(1_871_250);
  });

  it('row 105: SUZUKI GC 415 T — the rate the reference audit corrected (pickup, not passenger)', () => {
    // Reference audit originally mis-rated this as a passenger car (0.65%)
    // and corrected it to the pickup/mobil-barang rate (1.68%) after reading
    // the model name — isLikelyCommercialBody() exists to catch exactly this.
    expect(browser.isLikelyCommercialBody('SUZUKI GC 415 T(4X2 ) M/T 2012')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 13_000_000, otr: 41_000_000, tenorMonths: 12, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0168, 6);
    expect(r.premiumGross).toBe(218_400);
    expect(r.discountAmount).toBe(54_600);
    expect(r.premiumAfterDiscount).toBe(163_800);
    expect(r.adminFee).toBe(45_000);
    expect(r.totalPremium).toBe(208_800);
  });

  it('row 197: SUZUKI CARRY — pickup, Zona 1, 24 bulan tenor pro-rata', () => {
    expect(browser.isLikelyCommercialBody('SUSUKI CARRY ST 130 FUTURA 2021')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 1, financingValue: 23_000_000, otr: 48_000_000, tenorMonths: 24, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0088, 6);
    expect(r.premiumGross).toBe(404_800); // 23,000,000 * 0.0088 * 24/12
    expect(r.totalPremium).toBe(348_600);
  });

  it('row 231: MITSUBISHI MAVEN — passenger car (category 1), Zona 1, floor premium', () => {
    expect(browser.isLikelyCommercialBody('MITSUBISHI MAVEN SDX 2005')).toBe(false);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 1, financingValue: 10_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: false });
    expect(r.category).toBe(1);
    expect(r.rate).toBeCloseTo(0.0047, 6);
    expect(r.premiumGross).toBe(50_000); // 10,000,000 * 0.0047 = 47,000 < floor
    expect(r.totalPremium).toBe(82_500);
  });

  it('row 246: MITSUBISHI L300 — pickup/van, Zona 3 (Samarinda)', () => {
    expect(browser.isLikelyCommercialBody('MITSUBISHI L300 4X2 MANUAL')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 3, financingValue: 17_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0081, 6);
    expect(r.premiumGross).toBe(137_700);
    expect(r.totalPremium).toBe(148_275);
  });

  it('zone detection: BG plate (Sumsel) and A plate (Banten) match the reference audit zones', () => {
    expect(browser.detectZone('PALEMBANG', 'BG1057K')).toEqual({ zone: 1, source: 'plate', confident: true });
    expect(browser.detectZone('SERANG', 'A1977YX')).toEqual({ zone: 2, source: 'plate', confident: true });
    expect(browser.detectZone('SAMARINDA', 'KT8199MD')).toEqual({ zone: 3, source: 'plate', confident: true });
    // No plate at all — falls back to the region-text keyword map.
    expect(browser.detectZone('BANDUNG', '')).toEqual({ zone: 2, source: 'region', confident: true });
    // Neither matches — default Zone 3, flagged unconfident for manual review.
    expect(browser.detectZone('KOTA ANTAH BERANTAH', '')).toEqual({ zone: 3, source: 'default', confident: false });
  });

  it('batch totals aggregate cleanly across mixed vehicle classes', () => {
    const items = [
      browser.calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 }),
      browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 }),
    ];
    const totals = browser.calcBulkTotals(items);
    expect(totals.itemCount).toBe(2);
    expect(totals.totalAmount).toBe(62_500 + 1_871_250);
    expect(totals.totalAmount).toBe(items[0].totalPremium + items[1].totalPremium);
  });
});
