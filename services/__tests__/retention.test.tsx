// Retention circle guards — renewal engine, renewal handoff, claim timeline.
// Owner roadmap #1/#2 (v2.8.12): renewal is the cheapest revenue in insurance
// and a visible claim timeline is what earns referrals. These tests pin the
// contracts: countdown math, urgency tiers, queue hygiene, prefill validation
// (the wizard must never receive a stray field), and honest timeline states.
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  daysUntil, tierForDays, buildRenewalQueue, formatEndDate,
} from '../../services/renewalEngine';
import {
  parkRenewalPrefill, consumeRenewalPrefill,
} from '../../services/renewalHandoff';
import ClaimTimeline from '../../components/shared/ClaimTimeline';
import { Language } from '../../types';

const NOW = new Date('2026-11-11T09:00:00Z');

const iso = (offsetDays: number) => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString();
};

const order = (over: Partial<Record<string, unknown>>) => ({
  id: 'ord-1', status: 'ISSUED', end_date: iso(20), policy_number: 'POL-1',
  order_number: 'ORD-1', product_name: 'Mobil Comprehensive', ...over,
}) as any;

describe('renewal engine — countdown & triage', () => {
  it('counts calendar days and tolerates junk input', () => {
    expect(daysUntil(iso(30), NOW)).toBe(30);
    expect(daysUntil(iso(-3), NOW)).toBe(-3);
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil('bukan-tanggal', NOW)).toBeNull();
  });

  it('tiers flip at the documented boundaries', () => {
    expect(tierForDays(-1)).toBe('EXPIRED');
    expect(tierForDays(0)).toBe('CRITICAL');
    expect(tierForDays(7)).toBe('CRITICAL');
    expect(tierForDays(8)).toBe('SOON');
    expect(tierForDays(30)).toBe('SOON');
    expect(tierForDays(31)).toBe('HEALTHY');
  });

  it('builds an urgent-first queue of ISSUED policies only', () => {
    const queue = buildRenewalQueue([
      order({ id: 'a', policy_number: 'POL-A', end_date: iso(45) }),
      order({ id: 'b', policy_number: 'POL-B', end_date: iso(5) }),
      order({ id: 'c', policy_number: 'POL-C', status: 'SUBMITTED', end_date: iso(1) }),
      order({ id: 'd', policy_number: 'POL-D', end_date: undefined }),
      order({ id: 'e', policy_number: 'POL-E', end_date: iso(-2) }),
      order({ id: 'f', policy_number: 'POL-A', end_date: iso(60) }), // duplicate of POL-A
    ], NOW);
    expect(queue.map(q => q.orderId)).toEqual(['e', 'b', 'a']);
    expect(queue[0].tier).toBe('EXPIRED');
    expect(queue.every(q => q.tier === tierForDays(q.daysLeft))).toBe(true);
  });

  it('formats dates per locale and blanks junk', () => {
    expect(formatEndDate(iso(0), 'ID')).toMatch(/Nov 2026|Nov 2026/);
    expect(formatEndDate('x', 'ID')).toBe('');
  });
});

describe('renewal handoff — validated one-tap prefill', () => {
  beforeEach(() => { localStorage.clear(); });

  const good = {
    order_number: 'ORD-2026-99',
    product_name: 'Mobil Comprehensive',
    vehicle: { brand: 'Toyota', model: 'Avanza', year: 2021, plate: 'B 1234 XYZ', usage: 'PRIVATE', region: '2', province: 'DKI Jakarta', condition: 'USED' },
  };

  it('parks and consumes exactly once', () => {
    expect(parkRenewalPrefill(good)).toBe(true);
    const v = consumeRenewalPrefill();
    expect(v?.orderNumber).toBe('ORD-2026-99');
    expect(v?.vehicle.brand).toBe('Toyota');
    expect(v?.vehicle.plate).toBe('B 1234 XYZ');
    expect(consumeRenewalPrefill()).toBeNull();
  });

  it('rejects malformed payloads instead of feeding the wizard junk', () => {
    expect(parkRenewalPrefill({ ...good, order_number: '!!!' })).toBe(false);
    expect(parkRenewalPrefill(null)).toBe(false);
    expect(parkRenewalPrefill({ order_number: 'ORD-1', vehicle: { year: 1899 } })).toBe(true);
    const v = consumeRenewalPrefill();
    expect(v?.vehicle.year).toBe(new Date().getFullYear());
    expect(v?.vehicle.plate).toBe('');
    expect(v?.vehicle.usage).toBe('PRIVATE');
  });
});

describe('claim timeline — honest progress states', () => {
  const strip = (s: string) => s.replace(/\s+/g, ' ');

  it('renders four steps, compact by default', () => {
    const m = strip(renderToStaticMarkup(React.createElement(ClaimTimeline, { status: 'UNDER_REVIEW', lang: Language.ID })));
    expect(m.match(/bg-emerald-500/g)?.length).toBe(2); // submitted + in review
    expect(m).not.toContain('Ditolak');
  });

  it('marks REJECTED with a visible terminal chip', () => {
    const m = strip(renderToStaticMarkup(React.createElement(ClaimTimeline, { status: 'REJECTED', lang: Language.ID })));
    expect(m).toContain('Ditolak');
  });

  it('PAID completes the chain, CLOSED renders it fully too', () => {
    const paid = strip(renderToStaticMarkup(React.createElement(ClaimTimeline, { status: 'PAID', lang: Language.ID })));
    expect(paid.match(/bg-emerald-500/g)?.length).toBe(4);
    const closed = strip(renderToStaticMarkup(React.createElement(ClaimTimeline, { status: 'CLOSED', lang: Language.ID })));
    expect(closed.match(/bg-emerald-500/g)?.length).toBe(4);
  });

  it('full variant labels the submitted date and last update', () => {
    const m = strip(renderToStaticMarkup(React.createElement(ClaimTimeline, {
      status: 'APPROVED', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z', lang: Language.ID, variant: 'full',
    })));
    expect(m).toContain('Diajukan · 1 Nov');
    expect(m).toContain('Diperbarui 9 Nov');
  });
});
