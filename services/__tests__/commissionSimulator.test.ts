// Commission simulator contracts (roadmap #7): the agent's own blended rate
// from real history, clamped junk-proof math, CANCELLED excluded.
import { describe, it, expect } from 'vitest';
import { effectiveCommissionRate, simulateCommission } from '../../services/commissionSimulator';

describe('effectiveCommissionRate — blended rate from real history', () => {
  it('averages PAID + PENDING rows only', () => {
    const rate = effectiveCommissionRate([
      { premium_amount: 10_000_000, commission_amount: 1_000_000, status: 'PAID' },
      { premium_amount: 5_000_000, commission_amount: 400_000, status: 'PENDING' },
      { premium_amount: 99_000_000, commission_amount: 9_900_000, status: 'CANCELLED' }, // excluded
    ]);
    expect(rate).toBeCloseTo((1_400_000 / 15_000_000) * 100, 6);
  });

  it('returns null when history is empty or premium-less', () => {
    expect(effectiveCommissionRate([])).toBeNull();
    expect(effectiveCommissionRate([{ premium_amount: 0, commission_amount: 0, status: 'PAID' }])).toBeNull();
    expect(effectiveCommissionRate(undefined as any)).toBeNull();
  });
});

describe('simulateCommission — clamped, junk-proof math', () => {
  it('computes monthly and yearly at the given rate', () => {
    const r = simulateCommission({ countPerMonth: 5, avgPremium: 4_000_000, ratePct: 10 });
    expect(r.monthlyPremium).toBe(20_000_000);
    expect(r.monthlyCommission).toBe(2_000_000);
    expect(r.yearlyCommission).toBe(24_000_000);
  });

  it('never produces NaN/Infinity from junk input', () => {
    const r = simulateCommission({ countPerMonth: NaN, avgPremium: -5, ratePct: 999 });
    expect(r.monthlyPremium).toBe(0);
    expect(Number.isFinite(r.yearlyCommission)).toBe(true);
  });

  it('clamps extremes instead of exploding', () => {
    const r = simulateCommission({ countPerMonth: 10_000, avgPremium: 9e12, ratePct: 50 });
    expect(r.monthlyPremium).toBe(500 * 5_000_000_000);
  });
});
