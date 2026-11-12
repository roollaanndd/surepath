// ─── Commission simulator — "kalau saya tutup X polis, saya dapat apa" ──────
//
// Roadmap #7: motivation that is measurable. The agent slides two numbers
// (policies per month, average premium) and sees monthly/yearly commission
// at THEIR OWN effective rate — computed from their real commission history
// (sum of commission_amount over sum of premium_amount, PAID+PENDING rows),
// falling back to the standard 10% when history is too thin. Pure module so
// the math is testable and the UI stays dumb.

export interface CommissionHistoryRow {
  premium_amount?: number;
  commission_amount?: number;
  status?: string;
}

/** The agent's own blended rate in percent, or null when history is empty
 *  or carries no measurable premium. CANCELLED rows are excluded — they
 *  never became money. */
export function effectiveCommissionRate(rows: CommissionHistoryRow[]): number | null {
  const live = (rows ?? []).filter(r =>
    (r.status === 'PAID' || r.status === 'PENDING') &&
    Number(r.premium_amount) > 0 &&
    Number(r.commission_amount) >= 0,
  );
  const premium = live.reduce((s, r) => s + Number(r.premium_amount), 0);
  const commission = live.reduce((s, r) => s + Number(r.commission_amount), 0);
  if (premium <= 0) return null;
  return (commission / premium) * 100;
}

export interface CommissionSimResult {
  monthlyPremium: number;
  monthlyCommission: number;
  yearlyCommission: number;
  ratePct: number;
}

/** Clamp-and-compute: junk input degrades to zero, never NaN/Infinity. */
export function simulateCommission(input: {
  countPerMonth: number;
  avgPremium: number;
  ratePct: number;
}): CommissionSimResult {
  const count = Math.max(0, Math.min(500, Math.floor(Number(input.countPerMonth) || 0)));
  const avgPremium = Math.max(0, Math.min(5_000_000_000, Number(input.avgPremium) || 0));
  const ratePct = Math.max(0, Math.min(100, Number(input.ratePct) || 0));
  const monthlyPremium = count * avgPremium;
  const monthlyCommission = Math.round(monthlyPremium * (ratePct / 100));
  return {
    monthlyPremium,
    monthlyCommission,
    yearlyCommission: monthlyCommission * 12,
    ratePct,
  };
}
