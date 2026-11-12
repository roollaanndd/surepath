// ─── Admin metrics — service quality math from data already loaded ──────────
//
// Roadmap #9/#10: the activity log tells admin WHAT happened; these
// aggregates tell them HOW WELL. Everything here is pure and computed from
// rows the dashboards already hold (sp_policy_orders, sp_claims) — no new
// queries, no new permissions. The schema stores no per-stage timestamps, so
// TAT (turnaround time) is honestly defined as created_at → updated_at on
// settled claims, and "age" for claims still open.

import type { SpPolicyOrder } from './dbTypes';
import { buildRenewalQueue } from './renewalEngine';

/** Structural claim shape — SpClaim, OperatorClaim and gateway rows all fit. */
type ClaimLike = { status?: string | null; created_at?: string | null; updated_at?: string | null };

/** Hours between two ISO stamps (b defaults to now). Null on junk input. */
export function hoursBetween(a?: string | null, b?: string | null, now: Date = new Date()): number | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : now.getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.max(0, (tb - ta) / 3_600_000);
}

/** How long an OPEN claim has been waiting (SUBMITTED/UNDER_REVIEW). */
export function claimAgeHours(claim: ClaimLike, now: Date = new Date()): number | null {
  const st = String(claim.status ?? '');
  if (st !== 'SUBMITTED' && st !== 'UNDER_REVIEW') return null;
  return hoursBetween(claim.created_at, undefined, now);
}

/** Turnaround for a settled claim: submission → last update. */
export function claimTatHours(claim: ClaimLike): number | null {
  const st = String(claim.status ?? '');
  if (st !== 'PAID' && st !== 'CLOSED') return null;
  return hoursBetween(claim.created_at, claim.updated_at);
}

/** Mean TAT across settled claims; null when none have settled. */
export function avgClaimTatHours(claims: ClaimLike[]): number | null {
  const tats = (claims ?? []).map(claimTatHours).filter((h): h is number => h !== null);
  if (tats.length === 0) return null;
  return tats.reduce((s, h) => s + h, 0) / tats.length;
}

/** The single most urgent thing in the queue: oldest open claim in hours. */
export function oldestOpenClaimHours(claims: ClaimLike[], now: Date = new Date()): number | null {
  const ages = (claims ?? []).map(c => claimAgeHours(c, now)).filter((h): h is number => h !== null);
  return ages.length ? Math.max(...ages) : null;
}

/** Same clock as claimAgeHours — for orders awaiting an operator decision. */
export const pendingAgeHours = claimAgeHours;

export type SlaState = 'OK' | 'WARN' | 'BREACH';

/** ≤half the target = OK; ≤target = WARN; past it = BREACH. */
export function slaState(hoursElapsed: number, targetHours: number): SlaState {
  const target = Math.max(1, targetHours);
  if (hoursElapsed > target) return 'BREACH';
  if (hoursElapsed > target / 2) return 'WARN';
  return 'OK';
}

/** Gross written premium issued in the last 7 days. */
export function gwp7d(orders: SpPolicyOrder[], now: Date = new Date()): number {
  const cut = now.getTime() - 7 * 86_400_000;
  return (orders ?? [])
    .filter(o => o.status === 'ISSUED' && Number(o.created_at ? Date.parse(o.created_at) : NaN) >= cut)
    .reduce((s, o) => s + (o.total_premium ?? 0), 0);
}

/** Issued share of decided-able orders created in the last 7 days.
 *  Null when the window holds no orders at all (avoid divide-by-zero lies). */
export function conversion7d(orders: SpPolicyOrder[], now: Date = new Date()): number | null {
  const cut = now.getTime() - 7 * 86_400_000;
  const recent = (orders ?? []).filter(o => {
    const t = o.created_at ? Date.parse(o.created_at) : NaN;
    return Number.isFinite(t) && t >= cut && o.status !== 'CANCELLED' && o.status !== 'REJECTED';
  });
  if (recent.length === 0) return null;
  const issued = recent.filter(o => o.status === 'ISSUED').length;
  return issued / recent.length;
}

/** Policies expiring within 7 days or already expired — the renewal queue the
 *  retention engine triages, counted for admin (reuse, not a reimplementation). */
export function renewalRiskCount(orders: SpPolicyOrder[], now: Date = new Date()): number {
  return buildRenewalQueue(orders, now).filter(q => q.tier === 'CRITICAL' || q.tier === 'EXPIRED').length;
}
