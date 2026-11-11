// ─── Renewal handoff — CustomerPortal → wizard one-tap renewal ───────────────
//
// The "perpanjang satu-tap" contract, mirroring services/claimHandoff.ts:
// the RenewalCard parks a validated snapshot of the expiring order here, the
// wizard picks it up ONCE at mount and pre-fills the vehicle step, and the
// customer only re-confirms what may have changed. The payload originates
// from the customer's own order row (not from a model), but it is still
// validated on the way out — a stray field must never reach the wizard state.

const KEY = 'SUREPATH_RENEWAL_PREFILL_V1';

export interface RenewalVehiclePrefill {
  brand: string;
  model: string;
  year: number;
  plate: string;
  usage: 'PRIVATE' | 'COMMERCIAL';
  region: '1' | '2' | '3';
  province: string;
  condition: 'NEW' | 'USED';
}

export interface RenewalPrefill {
  orderNumber: string;
  productName: string;
  vehicle: RenewalVehiclePrefill;
}

const PLATE_RE = /^[A-Za-z0-9][A-Za-z0-9 /-]{0,19}$/;

function clampYear(raw: unknown): number {
  const n = Number(raw);
  const thisYear = new Date().getFullYear();
  if (!Number.isFinite(n) || n < 1950 || n > thisYear + 1) return thisYear;
  return Math.floor(n);
}

function cleanVehicle(raw: unknown): RenewalVehiclePrefill {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const region = s(r.region, 1);
  const usage = s(r.usage, 20).toUpperCase();
  const condition = s(r.condition, 10).toUpperCase();
  return {
    brand: s(r.brand, 40),
    model: s(r.model, 60),
    year: clampYear(r.year),
    plate: PLATE_RE.test(s(r.plate, 20)) ? s(r.plate, 20) : '',
    usage: usage === 'COMMERCIAL' ? 'COMMERCIAL' : 'PRIVATE',
    region: region === '1' || region === '2' ? (region as '1' | '2') : '3',
    province: s(r.province, 40),
    condition: condition === 'NEW' ? 'NEW' : 'USED',
  };
}

function clean(raw: unknown): RenewalPrefill | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const orderNumber = String(r.order_number ?? r.orderNumber ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{0,59}$/.test(orderNumber)) return null;
  return {
    orderNumber,
    productName: String(r.product_name ?? r.productName ?? '').trim().slice(0, 80),
    vehicle: cleanVehicle(r.vehicle),
  };
}

/** Park a renewal snapshot for the wizard's next mount (one-tap renewal). */
export function parkRenewalPrefill(raw: unknown): boolean {
  const v = clean(raw);
  if (!v) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

/** Consume the parked snapshot — read-once, the wizard owns it from here. */
export function consumeRenewalPrefill(): RenewalPrefill | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    return clean(JSON.parse(raw));
  } catch {
    return null;
  }
}
