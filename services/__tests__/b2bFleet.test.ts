// Fleet calendar CSV (roadmap #12): deterministic, quote-safe, finance-ready.
import { describe, it, expect } from 'vitest';
import { fleetCsv } from '../../components/b2b/B2BFleetCalendar';
import type { RenewalCandidate } from '../../services/renewalEngine';

const q = (over: Partial<RenewalCandidate>): RenewalCandidate => ({
  orderId: 'o1', orderNumber: 'ORD-1', policyNumber: 'POL-1', productName: 'Mobil Comprehensive',
  endDate: '2026-12-15', daysLeft: 20, tier: 'SOON', ...over,
});

describe('fleetCsv — finance calendar export', () => {
  it('emits a header and quote-safe rows', () => {
    const csv = fleetCsv([q({}), q({ policyNumber: 'POL-2', productName: 'Alat Berat "EX-200"', tier: 'CRITICAL', daysLeft: 3 })]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('policy_number,product,end_date,tier,days_left');
    expect(lines[1]).toContain('POL-1,');
    expect(lines[2]).toContain('"Alat Berat ""EX-200"""');
    expect(lines[2]).toContain('CRITICAL,3');
  });

  it('empty queue still has a header', () => {
    expect(fleetCsv([]).split('\n')).toHaveLength(1);
  });
});
