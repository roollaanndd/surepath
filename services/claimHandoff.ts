// ─── Pathy → claim form handoff ──────────────────────────────────────────────
//
// Pathy works out *which* policy a claim belongs to, whether the peril is
// covered and what documents are needed. It deliberately does NOT submit the
// claim: submission runs the photo forensics and consumes a server-staged
// fraud verdict (see supabase/functions/data-gateway/actions/claims.ts), and
// that guarded path must stay the only one.
//
// So the chat hands the user off instead. This module is the whole contract
// between the two: Pathy parks a prefill here, the claim form picks it up once.
//
// The payload is written and read inside the same browser tab, but it is still
// validated on the way out — it originates from a tool result shaped by a
// language model, and a stray field should never reach the form.

const KEY = 'SUREPATH_CLAIM_PREFILL_V1';
/** Fired after a prefill is parked, so the portal can switch to the claim tab. */
export const CLAIM_OPEN_EVENT = 'sp:open-claim';

export interface ClaimPrefill {
  policyNumber: string;
  /** YYYY-MM-DD, or '' when the user never gave one. */
  incidentDate: string;
  description: string;
  productType: 'CAR' | 'MOTOR';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const POLICY_RE = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,59}$/;

function clean(raw: unknown): ClaimPrefill | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const policyNumber = String(r.policy_number ?? r.policyNumber ?? '').trim();
  const incidentDate = String(r.incident_date ?? r.incidentDate ?? '').trim();
  const description = String(r.description ?? '').trim();
  const product = String(r.product_type ?? r.productType ?? 'CAR').toUpperCase();

  // A malformed policy number is dropped rather than typed into the form,
  // where the user would likely submit it without re-reading.
  return {
    policyNumber: POLICY_RE.test(policyNumber) ? policyNumber : '',
    incidentDate: DATE_RE.test(incidentDate) ? incidentDate : '',
    description: description.slice(0, 1000),
    productType: product === 'MOTOR' ? 'MOTOR' : 'CAR',
  };
}

/** Park a prefill and ask the portal to open the claim form. */
export function requestClaimStart(raw: unknown): boolean {
  const prefill = clean(raw);
  if (!prefill) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch { /* private mode — the form still opens, just empty */ }
  window.dispatchEvent(new CustomEvent(CLAIM_OPEN_EVENT, { detail: prefill }));
  return true;
}

/**
 * Read the parked prefill and clear it. Single-use on purpose: reopening the
 * claim form later should start blank, not silently reuse an old incident.
 */
export function consumeClaimPrefill(): ClaimPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return clean(JSON.parse(raw));
  } catch {
    return null;
  }
}
