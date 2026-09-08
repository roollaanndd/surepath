// Shared types and guards for every Pathy tool.
//
// This module exists so the security rules live in exactly one place. Every
// tool file imports `ownerFilter` from here rather than writing its own scope
// clause — a tool that forgets to scope its query is the one bug class that
// would leak another customer's policy, so it must not be possible to write a
// tool without going through this.

export interface PathyCaller {
  authId: string;
  ownerId: string;
  ownerIds: string[];
  role: string;
  name: string;
  email: string;
  phone?: string;
  agentCode?: string;
}

/**
 * A document the user attached to this turn. OCR runs on the CLIENT (it already
 * owns stnk-ocr, the KTP reader and the 2.500-line vehicle price database), so
 * what arrives here is already extracted and normalised — no image ever passes
 * through this function. The model can only see it by calling read_attachment,
 * which keeps the "every fact comes from a tool" discipline intact.
 */
export interface PathyDocument {
  type: 'STNK' | 'KTP';
  fields: Record<string, unknown>;
  confidence?: number;
}

export interface ToolContext {
  // deno-lint-ignore no-explicit-any
  db: any;
  caller: PathyCaller;
  // deno-lint-ignore no-explicit-any
  rateSet?: any;
  documents?: PathyDocument[];
}

// A card is structured data the chat UI renders as a rich block instead of
// leaving the model to re-type numbers into prose (where it can drift).
export interface PathyCard {
  type:
    | 'policies' | 'policy_detail' | 'claims' | 'quotes'
    | 'premium' | 'quote_created' | 'sales_report' | 'products'
    | 'document_read' | 'offers' | 'quotation_ready'
    // v2.3.0 — service tools
    | 'coverage' | 'claim_start' | 'claim_status' | 'renewals'
    | 'policy_explainer' | 'payment_help'
    | 'pipeline' | 'commission_forecast' | 'followup_draft';
  // deno-lint-ignore no-explicit-any
  data: any;
}

export interface ToolOutcome {
  // deno-lint-ignore no-explicit-any
  result: any;
  card?: PathyCard;
}

export const AGENT_ROLES = new Set(['AGENT', 'AGENT_LEADER', 'MASTER_ADMIN', 'ADMIN']);
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Order/policy numbers are alphanumeric with separators. This value is
// model-supplied and gets interpolated into a PostgREST filter string, where a
// comma or parenthesis would change the shape of the OR group it sits in. The
// owner scope is a separately AND-ed filter so nothing can escape the caller's
// own rows either way, but the reference itself is still validated rather than
// trusted.
export const ORDER_REF_RE = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,59}$/;

export const isAgentSide = (role: string) => AGENT_ROLES.has(role);
export const safeIds = (ids: string[]) => ids.filter(id => UUID_RE.test(id));
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
export const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export const ORDER_COLUMNS =
  'order_number,policy_number,product_name,status,insurer_name,coverage_type,' +
  'sum_insured,total_premium,start_date,end_date,created_at,client_name';

/**
 * Scopes a query to the caller's own rows.
 *
 * `.or()` is used only when the customer side genuinely spans two columns
 * (sp_claims keys some rows by client_id and some by user_id); with a single
 * column `.in()` is equivalent and avoids stacking a second `or=` param on a
 * request that already carries one (get_policy_detail).
 */
// deno-lint-ignore no-explicit-any
export function ownerFilter(query: any, ctx: ToolContext, agentCol: string, clientCols: string[]) {
  const ids = safeIds(ctx.caller.ownerIds);
  // No resolvable identity: match nothing rather than fall through unscoped.
  if (ids.length === 0) return query.eq(agentCol, '00000000-0000-0000-0000-000000000000');
  if (isAgentSide(ctx.caller.role)) return query.in(agentCol, ids);
  if (clientCols.length === 1) return query.in(clientCols[0], ids);
  const list = ids.join(',');
  return query.or(clientCols.map(c => `${c}.in.(${list})`).join(','));
}

// deno-lint-ignore no-explicit-any
export const shapeOrder = (o: any) => ({
  order_number: o.order_number,
  policy_number: o.policy_number ?? null,
  product: o.product_name,
  status: o.status,
  insurer: o.insurer_name ?? null,
  coverage_type: o.coverage_type,
  sum_insured: Number(o.sum_insured ?? 0),
  total_premium: Number(o.total_premium ?? 0),
  start_date: o.start_date,
  end_date: o.end_date,
  created_at: o.created_at,
  client_name: o.client_name,
});

// deno-lint-ignore no-explicit-any
export const shapeClaim = (c: any) => ({
  claim_number: c.claim_number,
  policy_number: c.policy_number ?? null,
  product_type: c.product_type ?? null,
  status: c.status,
  incident_date: c.incident_date ?? c.date ?? null,
  amount_estimated: c.amount_estimated == null ? null : Number(c.amount_estimated),
  amount_approved: c.amount_approved == null ? null : Number(c.amount_approved),
  created_at: c.created_at,
});

/** Whole days from today until `date` (negative = already past). */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = Date.parse(String(date).length <= 10 ? `${date}T00:00:00Z` : String(date));
  if (!Number.isFinite(t)) return null;
  const today = Date.UTC(
    new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(),
  );
  return Math.round((t - today) / 86_400_000);
}
