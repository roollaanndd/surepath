// Multi-year B2B pricing regression tests (v2.9.0).
//
// Depreciation is compound -10%/year applied to the sum insured. Admin fee +
// stamp duty are one-time charges billed only in year 1. Discount is a flat
// percentage (0-25%) applied to the gross total.
//
// These tests pin the exact arithmetic so a future "small refactor" to
// calcMultiYearPremium cannot silently change what the B2B wizard charges.

import { describe, it, expect } from 'vitest';
import {
  calcMultiYearPremium,
  B2B_DEPRECIATION_RATE, B2B_MAX_DISCOUNT_RATE,
  type AddOns,
} from '../ojkRates';

const emptyAddons = (): AddOns => ({
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
});

describe('calcMultiYearPremium', () => {
  it('year 1 depreciation factor is exactly 1.0 (no depreciation)', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 300_000_000, durationYears: 1,
      zone: 2, addons: emptyAddons(),
    });
    expect(bd.rows).toHaveLength(1);
    expect(bd.rows[0].depreciationFactor).toBe(1);
    expect(bd.rows[0].depreciatedSumInsured).toBe(300_000_000);
  });

  it('depreciation factor compounds correctly across 6 years', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 300_000_000, durationYears: 6,
      zone: 2, addons: emptyAddons(),
    });
    expect(bd.rows).toHaveLength(6);
    // Y1..Y6: 1, 0.9, 0.81, 0.729, 0.6561, 0.59049
    expect(bd.rows[0].depreciationFactor).toBe(1);
    expect(bd.rows[1].depreciationFactor).toBe(0.9);
    expect(bd.rows[2].depreciationFactor).toBe(0.81);
    expect(bd.rows[3].depreciationFactor).toBe(0.729);
    expect(bd.rows[4].depreciationFactor).toBe(0.6561);
    expect(bd.rows[5].depreciationFactor).toBe(0.5905); // rounded to 4dp in rows
  });

  it('depreciated SI follows compound -10% per year', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'TLO',
      originalSumInsured: 100_000_000, durationYears: 6,
      zone: 1, addons: emptyAddons(),
    });
    expect(bd.rows[0].depreciatedSumInsured).toBe(100_000_000);
    expect(bd.rows[1].depreciatedSumInsured).toBe(90_000_000);
    expect(bd.rows[2].depreciatedSumInsured).toBe(81_000_000);
    expect(bd.rows[5].depreciatedSumInsured).toBe(59_049_000);
  });

  it('admin fee and stamp duty are charged only in year 1', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 250_000_000, durationYears: 4,
      zone: 2, addons: emptyAddons(),
    });
    expect(bd.rows[0].adminFee).toBeGreaterThan(0);
    expect(bd.rows[0].stampDuty).toBeGreaterThan(0);
    for (let i = 1; i < 4; i++) {
      expect(bd.rows[i].adminFee).toBe(0);
      expect(bd.rows[i].stampDuty).toBe(0);
    }
  });

  it('grand total equals sum of per-year gross totals', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 500_000_000, durationYears: 5,
      zone: 2, addons: emptyAddons(),
    });
    const sumOfRows = bd.rows.reduce((s, r) => s + r.grossTotal, 0);
    expect(bd.grossTotal).toBe(sumOfRows);
  });

  it('discount is applied to gross — net = gross - (gross × rate)', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 400_000_000, durationYears: 3,
      zone: 2, addons: emptyAddons(),
      discountRate: 0.10, // 10%
    });
    expect(bd.discountRate).toBe(0.10);
    expect(bd.discountAmount).toBe(Math.round(bd.grossTotal * 0.10));
    expect(bd.netTotal).toBe(bd.grossTotal - bd.discountAmount);
  });

  it('caps discount at 25% max even if caller passes higher', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 200_000_000, durationYears: 2,
      zone: 1, addons: emptyAddons(),
      discountRate: 0.50, // caller passes 50%
    });
    expect(bd.discountRate).toBe(B2B_MAX_DISCOUNT_RATE);
    expect(bd.discountAmount).toBe(Math.round(bd.grossTotal * B2B_MAX_DISCOUNT_RATE));
  });

  it('clamps duration to 1-6 range', () => {
    const low = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'TLO',
      originalSumInsured: 100_000_000, durationYears: 0,
      zone: 1, addons: emptyAddons(),
    });
    const high = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'TLO',
      originalSumInsured: 100_000_000, durationYears: 20,
      zone: 1, addons: emptyAddons(),
    });
    expect(low.rows).toHaveLength(1);
    expect(high.rows).toHaveLength(6);
  });

  it('end date is approximately startDate + N years (365 days each)', () => {
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 300_000_000, durationYears: 3,
      zone: 2, addons: emptyAddons(),
    });
    const startMs = new Date(bd.startDate).getTime();
    const endMs = new Date(bd.endDate).getTime();
    const diffDays = (endMs - startMs) / 86400_000;
    expect(diffDays).toBe(3 * 365);
  });

  it('depreciation rate constant is 10%', () => {
    expect(B2B_DEPRECIATION_RATE).toBe(0.10);
  });

  it('SI monotonically decreases year over year', () => {
    // Note: basePremium = SI × rate, and the OJK rate table is BAND-based
    // (vehicle category derived from SI). As SI depreciates it can cross
    // into a lower-SI band which carries a HIGHER rate per unit — so the
    // premium itself is not guaranteed to be monotonically decreasing.
    // Only the SI is guaranteed to decrease; that is what we assert here.
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR', coverage: 'COMPREHENSIVE',
      originalSumInsured: 300_000_000, durationYears: 6,
      zone: 2, addons: emptyAddons(),
    });
    for (let i = 1; i < 6; i++) {
      expect(bd.rows[i].depreciatedSumInsured)
        .toBeLessThan(bd.rows[i - 1].depreciatedSumInsured);
    }
  });
});
