// Service-quality metrics (roadmap #9/#10): honest TAT definitions, SLA
// thresholds, and the operator chip's three states.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  claimAgeHours, claimTatHours, avgClaimTatHours,
  oldestOpenClaimHours, slaState, gwp7d, conversion7d, renewalRiskCount,
} from '../../services/adminMetrics';
import SlaTimer from '../../components/shared/SlaTimer';

const NOW = new Date('2026-11-11T12:00:00Z');
const iso = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * 3_600_000).toISOString();

const claim = (over: Partial<Record<string, unknown>>) => ({
  id: 'c1', status: 'UNDER_REVIEW', created_at: iso(-30), updated_at: iso(-1), ...over,
}) as any;

describe('TAT & age — honest definitions', () => {
  it('ages only OPEN claims, settles only PAID/CLOSED ones', () => {
    expect(claimAgeHours(claim({}), NOW)).toBeCloseTo(30, 5);
    expect(claimAgeHours(claim({ status: 'PAID' }), NOW)).toBeNull();
    expect(claimTatHours(claim({ status: 'PAID', updated_at: iso(-6) }))).toBeCloseTo(24, 5);
    expect(claimTatHours(claim({}))).toBeNull();
    expect(claimTatHours(claim({ created_at: 'junk', status: 'PAID' }))).toBeNull();
  });

  it('averages TAT over settled rows only', () => {
    const avg = avgClaimTatHours([
      claim({ status: 'PAID', created_at: iso(-24), updated_at: iso(-12) }),  // 12h
      claim({ status: 'CLOSED', created_at: iso(-48), updated_at: iso(-12) }), // 36h
      claim({ status: 'UNDER_REVIEW' }),                                        // ignored
    ]);
    expect(avg).toBeCloseTo(24, 5);
    expect(avgClaimTatHours([claim({ status: 'SUBMITTED' })])).toBeNull();
  });

  it('oldest open claim wins, empty queue yields null', () => {
    const oldest = oldestOpenClaimHours([
      claim({ id: 'a', created_at: iso(-10) }),
      claim({ id: 'b', created_at: iso(-73) }),
      claim({ id: 'paid', status: 'PAID' }),
    ], NOW);
    expect(oldest).toBeCloseTo(73, 5);
    expect(oldestOpenClaimHours([], NOW)).toBeNull();
  });
});

describe('SLA thresholds & chip', () => {
  it('OK ≤ half target, WARN to target, BREACH past it', () => {
    expect(slaState(10, 24)).toBe('OK');
    expect(slaState(13, 24)).toBe('WARN');
    expect(slaState(24, 24)).toBe('WARN');
    expect(slaState(25, 24)).toBe('BREACH');
  });

  it('chip renders hours/target with the state color', () => {
    const ok = renderToStaticMarkup(React.createElement(SlaTimer, { hours: 10, targetHours: 24 }));
    const breach = renderToStaticMarkup(React.createElement(SlaTimer, { hours: 30, targetHours: 24 }));
    expect(ok).toContain('emerald');
    expect(breach).toContain('rose');
    expect(breach).toContain('1.3 hri');
  });
});

describe('window metrics — 7-day GWP, conversion, renewal risk', () => {
  const order = (over: Partial<Record<string, unknown>>) => ({
    id: 'o', status: 'ISSUED', total_premium: 5_000_000, created_at: iso(-48), ...over,
  }) as any;

  it('GWP counts only ISSUED within the window', () => {
    const gwp = gwp7d([
      order({}),
      order({ id: '2', status: 'SUBMITTED' }),
      order({ id: '3', created_at: iso(-200) }),   // outside window
      order({ id: '4', created_at: 'junk' }),
    ], NOW);
    expect(gwp).toBe(5_000_000);
  });

  it('conversion is null on an empty window, not a fake 0%', () => {
    expect(conversion7d([order({ created_at: iso(-200) })], NOW)).toBeNull();
    expect(conversion7d([
      order({}),
      order({ id: '2', status: 'UNDER_REVIEW' }),
    ], NOW)).toBeCloseTo(0.5, 6);
  });

  it('renewal risk reuses the retention engine queue', () => {
    const risk = renewalRiskCount([
      order({ end_date: iso(3 * 24), policy_number: 'P1' }),
      order({ end_date: iso(-1 * 24), policy_number: 'P2' }),
      order({ end_date: iso(90 * 24), policy_number: 'P3' }),
    ], NOW);
    expect(risk).toBe(2);
  });
});
