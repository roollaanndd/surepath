// ─── Renewal engine — countdown & triage for policy expirations ─────────────
//
// The retention circle (owner roadmap #2): an insurance app with no reason to
// open every month dies quietly — renewal is that reason, and renewing costs
// a fraction of acquiring a new customer. This module is the pure logic the
// RenewalCard renders: given ISSUED policy orders, it produces a countdown
// queue triaged by urgency.
//
// Deliberately pure and timezone-tolerant: dates arrive as ISO strings from
// Postgres (end_date), are compared against "now" at UTC-midnight granularity
// so a renewal never flips tier mid-day, and every failure returns null/empty
// rather than throwing — a malformed end_date must degrade to "no renewal
// banner", never a crashed home screen.

import type { SpPolicyOrder } from './dbTypes';

export type RenewalTier = 'EXPIRED' | 'CRITICAL' | 'SOON' | 'HEALTHY';

export interface RenewalCandidate {
  orderId: string;
  orderNumber: string;
  policyNumber: string;
  productName: string;
  endDate: string;
  daysLeft: number;
  tier: RenewalTier;
}

/** Days from today until the ISO date; negative when already past.
 *  Calendar-day arithmetic (UTC) so tiers flip at midnight, not mid-session. */
export function daysUntil(iso: string | undefined | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const end = new Date(t);
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(end) - day(now)) / 86_400_000);
}

/** ≤7 days = act now; ≤30 = soon; past = expired; everything else healthy. */
export function tierForDays(days: number): RenewalTier {
  if (days < 0) return 'EXPIRED';
  if (days <= 7) return 'CRITICAL';
  if (days <= 30) return 'SOON';
  return 'HEALTHY';
}

export const TIER_LABEL_ID: Record<RenewalTier, string> = {
  EXPIRED: 'Kedaluwarsa',
  CRITICAL: 'Segera perpanjang',
  SOON: 'Jatuh tempo dekat',
  HEALTHY: 'Terlindungi penuh',
};

export const TIER_LABEL_EN: Record<RenewalTier, string> = {
  EXPIRED: 'Expired',
  CRITICAL: 'Renew now',
  SOON: 'Due soon',
  HEALTHY: 'Fully protected',
};

export const TIER_COLOR: Record<RenewalTier, string> = {
  EXPIRED: '#EF4444',
  CRITICAL: '#F59E0B',
  SOON: '#0EA5E9',
  HEALTHY: '#10B981',
};

/** Build the renewal queue: active (ISSUED) policies that actually end, most
 *  urgent first. Non-ISSUED orders, missing end dates and duplicate policy
 *  numbers are dropped. */
export function buildRenewalQueue(orders: SpPolicyOrder[], now: Date = new Date()): RenewalCandidate[] {
  const seen = new Set<string>();
  const out: RenewalCandidate[] = [];
  for (const o of orders ?? []) {
    if (o.status !== 'ISSUED') continue;
    const days = daysUntil(o.end_date, now);
    if (days === null) continue;
    const policyNumber = o.policy_number ?? o.order_number ?? o.id;
    if (seen.has(policyNumber)) continue;
    seen.add(policyNumber);
    out.push({
      orderId: o.id,
      orderNumber: o.order_number ?? '',
      policyNumber,
      productName: o.product_name ?? o.product_code ?? '',
      endDate: o.end_date as string,
      daysLeft: days,
      tier: tierForDays(days),
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Formatted short date (id-ID / en-GB) for banners and chips. */
export function formatEndDate(iso: string, lang: 'ID' | 'EN' = 'ID'): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString(lang === 'EN' ? 'en-GB' : 'id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
