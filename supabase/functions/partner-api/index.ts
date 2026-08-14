// ─────────────────────────────────────────────────────────────────────────────
// SurePath Partner API (embedded insurance) — v1
//
//   https://<project>.supabase.co/functions/v1/partner-api/v1/...
//
// A REST API for distribution partners (marketplaces, fintechs, dealerships)
// to quote and sell SurePath motor policies from inside their own product.
// This is the "Embedded insurance API (B2B2C)" line item in docs/PRD.md.
//
// Design rules, all of them load-bearing:
//
//   • Auth is an API key, never a Supabase JWT. Keys are looked up by SHA-256
//     hash (see _shared/apiRuntime.ts) — a DB leak yields no usable credential.
//   • A PARTNER key carries an `agent_id`. Every order it creates is written
//     with that agent_id, so commission, wallet, tier and reporting logic all
//     keep working with no special-casing for API-sourced business.
//   • Premiums are ALWAYS computed server-side from the OJK rate tables. The
//     partner never sends a price; it sends risk facts. An order re-prices from
//     the stored quote inputs rather than trusting anything on the wire.
//   • Money and status transitions stay where they already live: orders enter
//     at SUBMITTED and move only through the existing operator/insurer flow.
//
// verify_jwt MUST be false for this function — it authenticates in code.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import {
  ApiError, ApiResult, API_VERSION, Router, authenticateKey, badRequest, checkKeyRateLimit,
  clientIp, conflict, drainWebhooks, errorBody, forbidden, generateApiKey, jsonResponse,
  logRequest, lookupIdempotent, normalizePath, notFound, num, obj, oneOf, pageLimit,
  requireScope, secondsUntilNextHour, serverError, sha256Hex, storeIdempotent, str,
  type ApiKeyRecord, type Db, type RouteContext,
} from '../_shared/apiRuntime.ts';
import {
  calcPremium, getZone, listProvinces, loadRateSet, parseAddons, DEFAULT_FEES,
  type CoverageType, type OjkBand, type RateSet, type VehicleType, type Zone,
} from '../_shared/ojkRating.ts';

const FUNCTION_NAME = 'partner-api';
const SERVICE_VERSION = '1.0.0';
const APP_URL = 'https://myinsurepath.com';

const PARTNER_SCOPES = [
  'quotes:read', 'quotes:write',
  'orders:read', 'orders:write',
  'payments:read', 'payments:write',
  'webhooks:manage',
] as const;

const INSURER_SCOPES = [
  'orders:read', 'orders:decide', 'policies:write', 'payments:read', 'webhooks:manage',
] as const;

const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE'] as const;
const COVERAGE_TYPES = ['COMPREHENSIVE', 'TLO'] as const;

const COVERAGE_LABEL: Record<CoverageType, string> = {
  COMPREHENSIVE: 'All Risk (Comprehensive)',
  TLO: 'Total Loss Only (TLO)',
};

// ─── Small helpers ───────────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function quoteCode(): string {
  // Must satisfy the public e-quotation guard /^[A-Za-z0-9_-]{8,40}$/ so the
  // QR page at /q/<code> works for API-sourced quotes too.
  return `Q${randomCode(15)}`;
}

function quotationNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `QT-API-${ymd}-${randomCode(6)}`;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ─── Quote inputs ────────────────────────────────────────────────────────────
// The exact risk facts a quote was priced on. Persisted inside
// sp_quotations.payload.api_quote so an order can re-price from them instead of
// trusting numbers supplied at order time.
interface QuoteInputs {
  product_type: VehicleType;
  coverage_type: CoverageType;
  sum_insured: number;
  province: string;
  zone: Zone;
  vehicle: Record<string, unknown>;
  addons: Record<string, unknown>;
}

function parseQuoteInputs(body: Record<string, unknown>, set: RateSet): QuoteInputs {
  const productType = oneOf(body.product_type, 'product_type', VEHICLE_TYPES) as VehicleType;
  const coverage = oneOf(body.coverage_type, 'coverage_type', COVERAGE_TYPES) as CoverageType;
  const sumInsured = num(body.sum_insured, 'sum_insured', { required: true, min: 1_000_000, max: 100_000_000_000 });

  const province = str(body.province, 'province', { max: 60 });
  let zone: Zone;
  if (body.zone != null && body.zone !== '') {
    const z = num(body.zone, 'zone', { min: 1, max: 3 });
    zone = Math.round(z) as Zone;
  } else if (province) {
    if (!(province in set.provinceZones)) {
      throw badRequest('invalid_field',
        `Unknown province "${province}". Call GET /v1/reference/provinces for the accepted values.`, 'province');
    }
    zone = getZone(set, province);
  } else {
    throw badRequest('missing_field', 'Provide either "province" or "zone".', 'province');
  }

  const vehicle = obj(body.vehicle);
  const year = Number(vehicle.year ?? 0);
  if (!Number.isFinite(year) || year < 1950 || year > new Date().getFullYear() + 1) {
    throw badRequest('invalid_field', '"vehicle.year" must be a realistic model year.', 'vehicle.year');
  }

  return {
    product_type: productType,
    coverage_type: coverage,
    sum_insured: sumInsured,
    province,
    zone,
    vehicle: {
      make: str(vehicle.make, 'vehicle.make', { max: 60 }),
      model: str(vehicle.model, 'vehicle.model', { max: 80 }),
      year,
      plate_number: str(vehicle.plate_number, 'vehicle.plate_number', { max: 20 }).toUpperCase(),
      usage: str(vehicle.usage, 'vehicle.usage', { max: 20 }).toUpperCase() || 'PERSONAL',
    },
    addons: obj(body.addons),
  };
}

// ─── Insurer pricing options ─────────────────────────────────────────────────

interface InsurerOption {
  insurer_id: string;
  insurer_code: string;
  insurer_name: string;
  eligible: boolean;
  ineligible_reason: string | null;
  band: OjkBand;
  rate: number;
  base_premium: number;
  addon_premium: number;
  admin_fee: number;
  stamp_duty: number;
  total_premium: number;
}

/**
 * Prices the quote against every active insurer product that matches the
 * requested vehicle type + coverage, applying each insurer's own OJK band and
 * fee schedule. Ineligible insurers are returned too (with a reason) so the
 * partner can show the customer why an option is missing.
 */
async function priceInsurerOptions(db: Db, set: RateSet, inputs: QuoteInputs): Promise<InsurerOption[]> {
  const { data: products } = await db
    .from('sp_insurer_products')
    .select('insurer_id, product_type, vehicle_coverage, max_vehicle_age_years, stamp_duty, policy_cost, ojk_rate_band, is_active')
    .eq('is_active', true)
    .eq('product_type', inputs.product_type)
    .or(`vehicle_coverage.eq.${inputs.coverage_type},vehicle_coverage.eq.ALL`);

  if (!products?.length) return [];

  const insurerIds = [...new Set(products.map((p: Record<string, unknown>) => p.insurer_id))];
  const { data: insurers } = await db
    .from('sp_insurers').select('id, code, name, is_active').in('id', insurerIds).eq('is_active', true);
  const insurerMap = new Map<string, Record<string, unknown>>();
  for (const i of insurers ?? []) insurerMap.set(i.id as string, i);

  // Prefer the exact coverage row over a generic "ALL" row for the same insurer.
  const bestPerInsurer = new Map<string, Record<string, unknown>>();
  for (const p of products) {
    const existing = bestPerInsurer.get(p.insurer_id as string);
    if (!existing || (p.vehicle_coverage === inputs.coverage_type && existing.vehicle_coverage === 'ALL')) {
      bestPerInsurer.set(p.insurer_id as string, p);
    }
  }

  const addons = parseAddons(inputs.addons);
  const vehicleYear = Number(inputs.vehicle.year ?? 0);
  const vehicleAge = vehicleYear > 0 ? new Date().getFullYear() - vehicleYear : null;

  const options: InsurerOption[] = [];
  for (const [insurerId, product] of bestPerInsurer) {
    const insurer = insurerMap.get(insurerId);
    if (!insurer) continue;

    const band = (['MIN', 'MID', 'MAX'].includes(String(product.ojk_rate_band))
      ? String(product.ojk_rate_band) : 'MID') as OjkBand;
    const fees = {
      adminFee: Number(product.policy_cost ?? DEFAULT_FEES.adminFee),
      stampDuty: Number(product.stamp_duty ?? DEFAULT_FEES.stampDuty),
    };
    const breakdown = calcPremium(set, inputs.product_type, inputs.coverage_type, inputs.sum_insured, inputs.zone, addons, band, fees);

    const maxAge = product.max_vehicle_age_years == null ? null : Number(product.max_vehicle_age_years);
    const tooOld = maxAge != null && vehicleAge != null && vehicleAge > maxAge;

    options.push({
      insurer_id: insurerId,
      insurer_code: String(insurer.code ?? ''),
      insurer_name: String(insurer.name ?? ''),
      eligible: !tooOld,
      ineligible_reason: tooOld
        ? `Vehicle age ${vehicleAge} years exceeds this insurer's maximum of ${maxAge} years.`
        : null,
      band,
      rate: breakdown.rate,
      base_premium: breakdown.basePremium,
      addon_premium: breakdown.addonPremium,
      admin_fee: breakdown.adminFee,
      stamp_duty: breakdown.stampDuty,
      total_premium: breakdown.total,
    });
  }

  options.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.total_premium - b.total_premium);
  return options;
}

// ─── Serialisers ─────────────────────────────────────────────────────────────

function serializeQuote(row: Record<string, unknown>): Record<string, unknown> {
  const payload = obj(row.payload);
  const api = obj(payload.api_quote);
  return {
    object: 'quote',
    id: row.id,
    code: row.code,
    quotation_number: row.quotation_number,
    status: row.status,
    product_type: api.product_type ?? row.product_type,
    coverage_type: api.coverage_type ?? null,
    sum_insured: api.sum_insured ?? null,
    province: api.province ?? null,
    zone: api.zone ?? null,
    vehicle: api.vehicle ?? null,
    addons: api.addons ?? null,
    currency: 'IDR',
    premium: payload.api_premium ?? null,
    options: payload.api_options ?? [],
    total_premium: row.total_premium == null ? null : Number(row.total_premium),
    valid_until: row.valid_until,
    expires_at: row.link_expires_at,
    order_id: row.order_id ?? null,
    quotation_url: `${APP_URL}/q/${row.code}`,
    created_at: row.created_at,
  };
}

function serializeOrder(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: 'order',
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    product_code: row.product_code,
    product_name: row.product_name,
    coverage_type: row.coverage_type,
    vehicle_type: row.vehicle_type,
    vehicle_details: row.vehicle_details ?? {},
    sum_insured: Number(row.sum_insured ?? 0),
    zone: row.zone,
    vehicle_category: row.vehicle_category,
    addons: row.addons ?? {},
    currency: 'IDR',
    premium: {
      base: Number(row.base_premium ?? 0),
      addons: Number(row.addon_premium ?? 0),
      admin_fee: Number(row.admin_fee ?? 0),
      stamp_duty: Number(row.stamp_duty ?? 0),
      total: Number(row.total_premium ?? 0),
    },
    ojk_rate: row.ojk_rate == null ? null : Number(row.ojk_rate),
    customer: {
      name: row.client_name,
      phone: row.client_phone ?? null,
      ktp: row.client_ktp ?? null,
    },
    insurer: { id: row.insurer_id ?? null, name: row.insurer_name ?? null },
    insurer_decision: row.insurer_decision ?? null,
    insurer_decision_notes: row.insurer_decision_notes ?? null,
    policy_number: row.policy_number ?? null,
    policy_document_url: row.policy_document_url ?? null,
    reviewer_notes: row.reviewer_notes ?? null,
    issued_at: row.issued_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializePayment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: 'payment',
    id: row.id,
    order_id: row.order_id,
    status: row.status,
    amount: Number(row.amount ?? 0),
    paid_amount: row.paid_amount == null ? null : Number(row.paid_amount),
    currency: row.currency ?? 'IDR',
    invoice_url: row.invoice_url ?? null,
    external_id: row.external_id,
    payment_method: row.payment_method ?? null,
    payment_channel: row.payment_channel ?? null,
    paid_at: row.paid_at ?? null,
    created_at: row.created_at,
  };
}

const ORDER_COLUMNS =
  'id, order_number, agent_id, status, product_code, product_name, coverage_type, vehicle_type, ' +
  'vehicle_details, sum_insured, zone, vehicle_category, addons, base_premium, addon_premium, ' +
  'admin_fee, stamp_duty, total_premium, ojk_rate, client_name, client_phone, client_ktp, ' +
  'insurer_id, insurer_name, insurer_decision, insurer_decision_notes, policy_number, ' +
  'policy_document_url, reviewer_notes, issued_at, created_at, updated_at';

// ─── Order lookup scoped to the calling key ──────────────────────────────────

async function findOwnedOrder(db: Db, agentId: string, idOrNumber: string): Promise<Record<string, unknown>> {
  const query = db.from('sp_policy_orders').select(ORDER_COLUMNS).eq('agent_id', agentId).is('deleted_at', null);
  const { data, error } = isUuid(idOrNumber)
    ? await query.eq('id', idOrNumber).maybeSingle()
    : await query.eq('order_number', idOrNumber).maybeSingle();
  if (error) throw serverError('Could not load order');
  if (!data) throw notFound(`No order found with id "${idOrNumber}".`);
  return data as Record<string, unknown>;
}

// ─── Routes: reference data ──────────────────────────────────────────────────

const router = new Router();

router.get('/v1/me', async ({ key, db }) => {
  const { data: agent } = await db.from('sp_users').select('id, name, email, role').eq('id', key.agent_id).maybeSingle();
  return {
    object: 'api_key',
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    environment: key.environment,
    scopes: key.scopes,
    rate_limit_per_hour: key.rate_limit_per_hour,
    webhook_url: key.webhook_url,
    account: agent ? { id: agent.id, name: agent.name, role: agent.role } : null,
    api_version: API_VERSION,
  };
});

router.get('/v1/reference/provinces', async ({ db }) => {
  const set = await loadRateSet(db);
  return {
    object: 'list',
    data: listProvinces(set),
    rate_set: { version: set.version, source: set.sourceReference, effective_date: set.effectiveDate },
  };
});

router.get('/v1/products', async ({ db }) => {
  const { data: products } = await db
    .from('sp_insurer_products')
    .select('insurer_id, product_type, vehicle_coverage, max_vehicle_age_years, policy_cost, stamp_duty, ojk_rate_band')
    .eq('is_active', true);
  const insurerIds = [...new Set((products ?? []).map((p: Record<string, unknown>) => p.insurer_id))];
  const { data: insurers } = insurerIds.length
    ? await db.from('sp_insurers').select('id, code, name, logo_url').in('id', insurerIds).eq('is_active', true)
    : { data: [] };
  const insurerMap = new Map<string, Record<string, unknown>>();
  for (const i of insurers ?? []) insurerMap.set(i.id as string, i);

  const data = (products ?? [])
    .filter((p: Record<string, unknown>) => insurerMap.has(p.insurer_id as string))
    .map((p: Record<string, unknown>) => {
      const insurer = insurerMap.get(p.insurer_id as string)!;
      return {
        object: 'product',
        insurer_id: p.insurer_id,
        insurer_code: insurer.code,
        insurer_name: insurer.name,
        insurer_logo_url: insurer.logo_url ?? null,
        product_type: p.product_type,
        coverage: p.vehicle_coverage,
        product_code: `${p.product_type}_${p.vehicle_coverage}`,
        max_vehicle_age_years: p.max_vehicle_age_years,
        admin_fee: Number(p.policy_cost ?? DEFAULT_FEES.adminFee),
        stamp_duty: Number(p.stamp_duty ?? DEFAULT_FEES.stampDuty),
      };
    });
  return { object: 'list', data, has_more: false };
});

// ─── Routes: quotes ──────────────────────────────────────────────────────────

router.post('/v1/quotes', async ({ db, key, body }) => {
  requireScope(key, 'quotes:write');
  const set = await loadRateSet(db);
  const inputs = parseQuoteInputs(body, set);
  const addons = parseAddons(inputs.addons);

  // Reference price: platform default band + fees, insurer-independent.
  const breakdown = calcPremium(set, inputs.product_type, inputs.coverage_type, inputs.sum_insured, inputs.zone, addons, 'MID');
  const options = await priceInsurerOptions(db, set, inputs);

  const customer = obj(body.customer);
  const code = quoteCode();
  const number = quotationNumber();
  const validUntil = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const premium = {
    base: breakdown.basePremium,
    addons: breakdown.addonPremium,
    addon_breakdown: breakdown.addonsDetail,
    admin_fee: breakdown.adminFee,
    stamp_duty: breakdown.stampDuty,
    total: breakdown.total,
    rate: breakdown.rate,
    band: breakdown.band,
    rate_set_version: breakdown.rateSetVersion,
  };

  const { data, error } = await db.from('sp_quotations').insert({
    code,
    quotation_number: number,
    product_type: inputs.product_type === 'MOTORCYCLE' ? 'MOTOR' : 'CAR',
    product_name: `Asuransi Kendaraan ${COVERAGE_LABEL[inputs.coverage_type]}`,
    status: 'SENT',
    // `quotationNumber` / `productName` / `totalPremium` mirror the fields the
    // public /q/<code> page reads, so an API quote renders there as well.
    payload: {
      quotationNumber: number,
      productName: `Asuransi Kendaraan ${COVERAGE_LABEL[inputs.coverage_type]}`,
      totalPremium: breakdown.total,
      currency: 'IDR',
      validUntil,
      api_quote: inputs,
      api_premium: premium,
      api_options: options,
      api_key_id: key.id,
    },
    customer_name: str(customer.name, 'customer.name', { max: 120 }) || null,
    total_premium: breakdown.total,
    valid_until: validUntil,
    source_app: 'partner-api',
    created_by: key.agent_id,
    link_expires_at: daysFromNow(14),
  }).select('*').single();

  if (error) throw serverError(`Could not persist quote: ${error.message}`);
  return new ApiResult(201, serializeQuote(data));
});

router.get('/v1/quotes', async ({ db, key, query }) => {
  requireScope(key, 'quotes:read');
  const limit = pageLimit(query);
  const { data, error } = await db
    .from('sp_quotations').select('*')
    .eq('created_by', key.agent_id).eq('source_app', 'partner-api')
    .order('created_at', { ascending: false }).limit(limit + 1);
  if (error) throw serverError('Could not list quotes');
  const rows = data ?? [];
  return { object: 'list', data: rows.slice(0, limit).map(serializeQuote), has_more: rows.length > limit };
});

router.get('/v1/quotes/:code', async ({ db, key, params }) => {
  requireScope(key, 'quotes:read');
  const { data, error } = await db
    .from('sp_quotations').select('*')
    .eq('code', params.code).eq('created_by', key.agent_id).maybeSingle();
  if (error) throw serverError('Could not load quote');
  if (!data) throw notFound(`No quote found with code "${params.code}".`);
  return serializeQuote(data);
});

// ─── Routes: orders ──────────────────────────────────────────────────────────

router.post('/v1/orders', async ({ db, key, body }) => {
  requireScope(key, 'orders:write');

  const quoteCodeParam = str(body.quote_code, 'quote_code', { required: true, max: 40 });
  const { data: quote, error: quoteErr } = await db
    .from('sp_quotations').select('*')
    .eq('code', quoteCodeParam).eq('created_by', key.agent_id).maybeSingle();
  if (quoteErr) throw serverError('Could not load quote');
  if (!quote) throw notFound(`No quote found with code "${quoteCodeParam}".`);
  if (quote.order_id) throw conflict('quote_already_used', 'This quote has already been converted into an order.');
  if (quote.link_expires_at && new Date(quote.link_expires_at) < new Date()) {
    throw new ApiError(410, 'invalid_request_error', 'quote_expired', 'This quote has expired. Create a new one.');
  }

  const payload = obj(quote.payload);
  const inputs = obj(payload.api_quote) as unknown as QuoteInputs;
  if (!inputs?.product_type) {
    throw conflict('quote_not_convertible', 'This quote was not created through the partner API and cannot be converted here.');
  }

  const insurerId = str(body.insurer_id, 'insurer_id', { required: true, max: 40 });
  if (!isUuid(insurerId)) throw badRequest('invalid_field', '"insurer_id" must be a UUID from the quote options.', 'insurer_id');

  // Re-price from the stored risk facts. The premium on the quote row is a
  // cached display value; the number that reaches sp_policy_orders is computed
  // right here, so a tampered or stale quote row cannot set the price.
  const set = await loadRateSet(db);
  const options = await priceInsurerOptions(db, set, inputs);
  const option = options.find((o) => o.insurer_id === insurerId);
  if (!option) {
    throw badRequest('insurer_not_available',
      'That insurer does not offer this product. Use one of the insurer_id values returned in the quote options.', 'insurer_id');
  }
  if (!option.eligible) {
    throw new ApiError(422, 'invalid_request_error', 'insurer_ineligible', option.ineligible_reason ?? 'This insurer cannot cover this risk.', 'insurer_id');
  }

  const customer = obj(body.customer);
  const name = str(customer.name, 'customer.name', { required: true, max: 200 });
  const phone = str(customer.phone, 'customer.phone', { max: 30 });
  const ktp = str(customer.ktp, 'customer.ktp', { max: 50 });
  if (ktp && !/^\d{16}$/.test(ktp)) {
    throw badRequest('invalid_field', '"customer.ktp" must be 16 digits.', 'customer.ktp');
  }

  const addons = parseAddons(inputs.addons);
  const breakdown = calcPremium(
    set, inputs.product_type, inputs.coverage_type, inputs.sum_insured, inputs.zone, addons,
    option.band, { adminFee: option.admin_fee, stampDuty: option.stamp_duty },
  );

  // Commission mirrors data-gateway's create_policy_order: insurer product rate,
  // overridden by the agent's own rate, hard-capped at 30%.
  let commissionRate = 0.10;
  const { data: insProd } = await db.from('sp_insurer_products')
    .select('base_commission_rate, coin_rate')
    .eq('insurer_id', insurerId).eq('product_type', inputs.product_type).eq('is_active', true)
    .or(`vehicle_coverage.eq.${inputs.coverage_type},vehicle_coverage.eq.ALL`)
    .maybeSingle();
  if (insProd?.base_commission_rate != null) commissionRate = Number(insProd.base_commission_rate);
  const { data: agentRow } = await db.from('sp_users').select('commission_rate').eq('id', key.agent_id).maybeSingle();
  if (agentRow?.commission_rate != null) commissionRate = Math.min(Number(agentRow.commission_rate), 0.30);

  const vehicleOverrides = obj(body.vehicle);
  const vehicleDetails = {
    ...inputs.vehicle,
    chassis_number: str(vehicleOverrides.chassis_number, 'vehicle.chassis_number', { max: 40 }) || null,
    engine_number: str(vehicleOverrides.engine_number, 'vehicle.engine_number', { max: 40 }) || null,
    plate_number: str(vehicleOverrides.plate_number, 'vehicle.plate_number', { max: 20 }).toUpperCase()
      || inputs.vehicle.plate_number || null,
    color: str(vehicleOverrides.color, 'vehicle.color', { max: 30 }) || null,
  };

  const insertRow = {
    agent_id: key.agent_id,                        // server-set from the key, never the body
    status: 'SUBMITTED',                           // API orders always enter the normal review queue
    client_name: name,
    client_phone: phone || null,
    client_ktp: ktp || null,
    product_code: `${inputs.product_type}_${inputs.coverage_type}`,
    product_name: `Asuransi Kendaraan ${COVERAGE_LABEL[inputs.coverage_type]} — ${option.insurer_name}`,
    coverage_type: inputs.coverage_type,
    vehicle_type: inputs.product_type,
    vehicle_details: vehicleDetails,
    sum_insured: inputs.sum_insured,
    zone: breakdown.zone,
    vehicle_category: breakdown.category,
    addons,
    base_premium: breakdown.basePremium,
    addon_premium: breakdown.addonPremium,
    admin_fee: breakdown.adminFee,
    stamp_duty: breakdown.stampDuty,
    total_premium: breakdown.total,
    net_premium: breakdown.total,
    ojk_rate: breakdown.rate,
    commission_rate: commissionRate,
    commission_amount: Math.round(breakdown.total * commissionRate),
    coin_reward: Math.round(breakdown.total * Number(insProd?.coin_rate ?? 0)),
    insurer_id: insurerId,
    insurer_name: option.insurer_name,
  };

  const { data: order, error } = await db.from('sp_policy_orders').insert(insertRow).select(ORDER_COLUMNS).single();
  if (error) throw serverError(`Could not create order: ${error.message}`);

  // Link the quote and record intent — same states the QR e-quotation flow uses.
  db.from('sp_quotations').update({
    order_id: order.id, status: 'CONFIRMED', confirmed_at: new Date().toISOString(),
    confirmed_name: name, confirmed_phone: phone || null, updated_at: new Date().toISOString(),
  }).eq('id', quote.id).then(() => {}, () => {});

  // Surface it in the operator queue exactly like a wizard-created order.
  db.from('sp_admin_notifications').insert({
    type: 'NEW_ORDER',
    title: 'Pengajuan Polis Baru (Partner API)',
    body: `${name} · ${insertRow.product_name} · Rp ${breakdown.total.toLocaleString('id-ID')}`,
    order_id: order.id,
    read: false,
    metadata: { order_id: order.id, order_number: order.order_number, status: 'SUBMITTED', source: 'partner-api', api_key_id: key.id },
  }).then(() => {}, () => {});

  return new ApiResult(201, serializeOrder(order));
});

router.get('/v1/orders', async ({ db, key, query }) => {
  requireScope(key, 'orders:read');
  const limit = pageLimit(query);
  let q = db.from('sp_policy_orders').select(ORDER_COLUMNS)
    .eq('agent_id', key.agent_id).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(limit + 1);
  const status = query.get('status');
  if (status) q = q.eq('status', status.toUpperCase());
  const createdBefore = query.get('created_before');
  if (createdBefore) q = q.lt('created_at', createdBefore);

  const { data, error } = await q;
  if (error) throw serverError('Could not list orders');
  const rows = data ?? [];
  return { object: 'list', data: rows.slice(0, limit).map(serializeOrder), has_more: rows.length > limit };
});

router.get('/v1/orders/:id', async ({ db, key, params }) => {
  requireScope(key, 'orders:read');
  return serializeOrder(await findOwnedOrder(db, key.agent_id!, params.id));
});

router.post('/v1/orders/:id/cancel', async ({ db, key, params, body }) => {
  requireScope(key, 'orders:write');
  const order = await findOwnedOrder(db, key.agent_id!, params.id);
  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(String(order.status))) {
    throw conflict('order_not_cancellable', `An order with status ${order.status} can no longer be cancelled.`);
  }
  const notes = str(body.reason, 'reason', { max: 500 });
  const { data, error } = await db.from('sp_policy_orders')
    .update({
      status: 'CANCELLED',
      reviewer_notes: notes ? `Dibatalkan via Partner API: ${notes}` : 'Dibatalkan via Partner API',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id).select(ORDER_COLUMNS).single();
  if (error) throw serverError('Could not cancel order');
  return serializeOrder(data);
});

// ─── Routes: payments ────────────────────────────────────────────────────────

router.get('/v1/orders/:id/payments', async ({ db, key, params }) => {
  requireScope(key, 'payments:read');
  const order = await findOwnedOrder(db, key.agent_id!, params.id);
  const { data, error } = await db.from('sp_payments').select('*')
    .eq('order_id', order.id).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw serverError('Could not list payments');
  return { object: 'list', data: (data ?? []).map(serializePayment), has_more: false };
});

router.post('/v1/orders/:id/payment-link', async ({ db, key, params }) => {
  requireScope(key, 'payments:write');
  const order = await findOwnedOrder(db, key.agent_id!, params.id);

  if (order.status !== 'SUBMITTED') {
    throw conflict('order_not_payable', `Order is not in a payable state (status: ${order.status}).`);
  }

  // An unpaid invoice already exists → hand back the same link rather than
  // opening a second one against the same order.
  const { data: existing } = await db.from('sp_payments').select('*')
    .eq('order_id', order.id).is('deleted_at', null)
    .in('status', ['PENDING', 'PAID']).order('created_at', { ascending: false }).limit(1);
  if (existing?.length) return serializePayment(existing[0]);

  const amount = Number(order.total_premium);
  if (!Number.isFinite(amount) || amount < 1000) {
    throw serverError('Order amount is invalid');
  }

  const [xskRes, appUrlRes] = await Promise.all([
    db.rpc('get_app_secret', { secret_name: 'XENDIT_SECRET_KEY' }),
    db.rpc('get_app_secret', { secret_name: 'APP_URL' }),
  ]);
  const xenditKey = Deno.env.get('XENDIT_SECRET_KEY') || xskRes.data || '';
  const appUrl = Deno.env.get('APP_URL') || appUrlRes.data || APP_URL;
  if (!xenditKey) throw serverError('Payment service not configured');

  const externalId = `${order.order_number ?? order.id}-${Date.now()}`;
  const phone = order.client_phone
    ? `+62${String(order.client_phone).replace(/^0/, '').replace(/\D/g, '')}`
    : undefined;

  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(xenditKey + ':')}` },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      description: `Premi Asuransi – ${order.product_name ?? 'PT Ruang Proteksi Indonesia'}`,
      invoice_duration: 86400,
      currency: 'IDR',
      customer: { given_names: order.client_name ?? 'Customer', mobile_number: phone },
      items: [{ name: order.product_name ?? 'Insurance Premium', quantity: 1, price: amount, category: 'Insurance' }],
      payment_methods: ['VIRTUAL_ACCOUNT', 'QR_CODE', 'EWALLET', 'CREDIT_CARD'],
      success_redirect_url: `${appUrl}/payment/success?order=${order.id}`,
      failure_redirect_url: `${appUrl}/payment/failed?order=${order.id}`,
    }),
  });

  if (!res.ok) {
    console.error('partner-api: Xendit error', res.status, await res.text().catch(() => ''));
    throw new ApiError(502, 'api_error', 'payment_provider_error', 'Payment provider rejected the request.');
  }

  const invoice = await res.json();
  const { data: payment, error } = await db.from('sp_payments').insert({
    order_id: order.id,
    external_id: externalId,
    xendit_invoice_id: invoice.id,
    invoice_url: invoice.invoice_url,
    amount,
    currency: 'IDR',
    status: invoice.status ?? 'PENDING',
  }).select('*').single();
  if (error) throw serverError('Invoice created but could not be recorded. Contact support with the order id.');

  return new ApiResult(201, serializePayment(payment));
});

// ─── Routes: webhooks ────────────────────────────────────────────────────────

router.get('/v1/webhook', async ({ key }) => {
  requireScope(key, 'webhooks:manage');
  return {
    object: 'webhook_endpoint',
    url: key.webhook_url,
    configured: Boolean(key.webhook_url),
    events: ['order.created', 'order.status_changed', 'payment.created', 'payment.paid'],
  };
});

router.put('/v1/webhook', async ({ db, key, body }) => {
  requireScope(key, 'webhooks:manage');
  const url = str(body.url, 'url', { max: 500 });
  if (url && !/^https:\/\//i.test(url)) {
    throw badRequest('invalid_field', '"url" must be an https:// endpoint.', 'url');
  }

  // A rotate returns the new signing secret once — it is never readable again.
  const rotate = body.rotate_secret === true || (url && !key.webhook_secret);
  const secret = rotate ? `whsec_${crypto.randomUUID().replace(/-/g, '')}` : undefined;

  const { error } = await db.from('sp_api_keys').update({
    webhook_url: url || null,
    ...(secret ? { webhook_secret: secret } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', key.id);
  if (error) throw serverError('Could not update webhook endpoint');

  return {
    object: 'webhook_endpoint',
    url: url || null,
    configured: Boolean(url),
    ...(secret ? { signing_secret: secret, signing_secret_note: 'Store this now — it is not shown again.' } : {}),
  };
});

router.get('/v1/webhook/deliveries', async ({ db, key, query }) => {
  requireScope(key, 'webhooks:manage');
  const limit = pageLimit(query, 50, 100);
  const { data, error } = await db.from('sp_api_webhook_deliveries')
    .select('id, event, status, attempts, last_status_code, last_error, delivered_at, created_at, order_id')
    .eq('api_key_id', key.id).order('created_at', { ascending: false }).limit(limit);
  if (error) throw serverError('Could not list deliveries');
  return { object: 'list', data: (data ?? []).map((d: Record<string, unknown>) => ({ object: 'webhook_delivery', ...d })), has_more: false };
});

router.post('/v1/webhook/test', async ({ db, key }) => {
  requireScope(key, 'webhooks:manage');
  if (!key.webhook_url) throw conflict('webhook_not_configured', 'Set a webhook URL with PUT /v1/webhook first.');
  const { data, error } = await db.from('sp_api_webhook_deliveries').insert({
    api_key_id: key.id,
    event: 'ping',
    payload: { message: 'SurePath webhook test event', api_key_id: key.id },
  }).select('id').single();
  if (error) throw serverError('Could not enqueue test event');
  await drainWebhooks(db, 5);
  return new ApiResult(202, { object: 'webhook_delivery', id: data.id, event: 'ping', status: 'queued' });
});

// ─── Admin surface (Supabase JWT, admin roles only) ──────────────────────────
// Key issuance lives here rather than in data-gateway so this whole feature can
// ship as one deployable unit without touching the gateway bundle.

async function handleAdmin(req: Request, db: Db, path: string, requestId: string): Promise<Response> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SERVICE_KEY);
  if (errorResponse) return errorResponse;
  if (!caller?.isAdmin) {
    const err = forbidden('admin_only', 'This endpoint requires an admin account.');
    return jsonResponse(errorBody(err, requestId), 403, { 'X-Request-ID': requestId });
  }

  const body = req.method === 'GET' ? {} : obj(await req.json().catch(() => ({})));
  const segments = path.split('/').filter(Boolean); // e.g. admin, v1, keys, <id>, revoke

  // GET /admin/v1/keys
  if (req.method === 'GET' && segments.length === 3 && segments[2] === 'keys') {
    const { data, error } = await db.from('sp_api_keys')
      .select('id, name, key_type, environment, key_prefix, scopes, agent_id, insurer_id, rate_limit_per_hour, webhook_url, is_active, last_used_at, expires_at, revoked_at, created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) return jsonResponse({ error: { type: 'api_error', code: 'internal_error', message: error.message }, request_id: requestId }, 500);
    return jsonResponse({ object: 'list', data }, 200, { 'X-Request-ID': requestId });
  }

  // POST /admin/v1/keys
  if (req.method === 'POST' && segments.length === 3 && segments[2] === 'keys') {
    try {
      const keyType = oneOf(body.key_type ?? 'PARTNER', 'key_type', ['PARTNER', 'INSURER'] as const) as 'PARTNER' | 'INSURER';
      const environment = (String(body.environment ?? 'live').toLowerCase() === 'test' ? 'test' : 'live') as 'live' | 'test';
      const name = str(body.name, 'name', { required: true, max: 120 });
      const agentId = str(body.agent_id, 'agent_id', { max: 40 });
      const insurerId = str(body.insurer_id, 'insurer_id', { max: 40 });

      if (keyType === 'PARTNER' && !agentId) throw badRequest('missing_field', 'PARTNER keys require "agent_id" — the sp_users row orders will be attributed to.', 'agent_id');
      if (keyType === 'INSURER' && !insurerId) throw badRequest('missing_field', 'INSURER keys require "insurer_id".', 'insurer_id');

      const allowed = keyType === 'PARTNER' ? PARTNER_SCOPES : INSURER_SCOPES;
      const requested = Array.isArray(body.scopes) ? (body.scopes as unknown[]).map(String) : [...allowed];
      const invalid = requested.filter((s) => !(allowed as readonly string[]).includes(s));
      if (invalid.length) throw badRequest('invalid_field', `Unknown scope(s): ${invalid.join(', ')}. Allowed: ${allowed.join(', ')}.`, 'scopes');

      const { key, prefix, hash } = await generateApiKey(keyType, environment);
      const { data, error } = await db.from('sp_api_keys').insert({
        name, key_type: keyType, environment, key_prefix: prefix, key_hash: hash,
        scopes: requested,
        agent_id: keyType === 'PARTNER' ? agentId : null,
        insurer_id: keyType === 'INSURER' ? insurerId : null,
        rate_limit_per_hour: body.rate_limit_per_hour ? num(body.rate_limit_per_hour, 'rate_limit_per_hour', { min: 1, max: 100000 }) : 1000,
        webhook_url: str(body.webhook_url, 'webhook_url', { max: 500 }) || null,
        expires_at: str(body.expires_at, 'expires_at', { max: 40 }) || null,
        created_by: caller.authId,
      }).select('id, name, key_type, environment, key_prefix, scopes, rate_limit_per_hour, created_at').single();
      if (error) throw serverError(error.message);

      return jsonResponse({
        ...data,
        object: 'api_key',
        api_key: key,
        api_key_note: 'Store this now — SurePath keeps only a hash and cannot show it again.',
      }, 201, { 'X-Request-ID': requestId });
    } catch (e) {
      const err = e instanceof ApiError ? e : serverError(String((e as Error).message ?? e));
      return jsonResponse(errorBody(err, requestId), err.status, { 'X-Request-ID': requestId });
    }
  }

  // POST /admin/v1/keys/:id/revoke
  if (req.method === 'POST' && segments.length === 5 && segments[2] === 'keys' && segments[4] === 'revoke') {
    const { error } = await db.from('sp_api_keys').update({
      is_active: false, revoked_at: new Date().toISOString(),
      revoked_reason: str(body.reason, 'reason', { max: 300 }) || 'Revoked by admin',
      updated_at: new Date().toISOString(),
    }).eq('id', segments[3]);
    if (error) return jsonResponse({ error: { type: 'api_error', code: 'internal_error', message: error.message }, request_id: requestId }, 500);
    return jsonResponse({ object: 'api_key', id: segments[3], revoked: true }, 200, { 'X-Request-ID': requestId });
  }

  // POST /admin/v1/webhooks/drain — manual/cron drain of the outbox.
  if (req.method === 'POST' && segments.length === 4 && segments[2] === 'webhooks' && segments[3] === 'drain') {
    const result = await drainWebhooks(db, 50);
    return jsonResponse({ object: 'webhook_drain', ...result }, 200, { 'X-Request-ID': requestId });
  }

  const err = notFound(`No admin route for ${req.method} ${path}.`);
  return jsonResponse(errorBody(err, requestId), 404, { 'X-Request-ID': requestId });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const url = new URL(req.url);
  const path = normalizePath(url.pathname, FUNCTION_NAME);
  const baseHeaders: Record<string, string> = { 'X-Request-ID': requestId, 'X-SurePath-Api-Version': API_VERSION };

  // Server-to-server only: no Access-Control-Allow-Origin is ever emitted, so
  // browsers cannot be talked into spending someone's API key.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonResponse({ error: { type: 'api_error', code: 'misconfigured', message: 'Server misconfiguration' }, request_id: requestId }, 500, baseHeaders);
  }
  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  if (path === '/' || path === '/health' || path === '/v1/health') {
    return jsonResponse({
      status: 'ok', service: FUNCTION_NAME, version: SERVICE_VERSION,
      api_version: API_VERSION, timestamp: new Date().toISOString(),
    }, 200, baseHeaders);
  }

  if (path.startsWith('/admin/')) return await handleAdmin(req, db, path, requestId);

  let key: ApiKeyRecord | null = null;
  let idemKey: string | null = null;

  try {
    key = await authenticateKey(db, req, 'PARTNER');

    const rate = await checkKeyRateLimit(db, key);
    baseHeaders['X-RateLimit-Limit'] = String(rate.limit);
    baseHeaders['X-RateLimit-Remaining'] = String(rate.remaining);
    if (!rate.allowed) {
      const retry = secondsUntilNextHour();
      throw new ApiError(429, 'rate_limit_error', 'rate_limit_exceeded',
        `Rate limit of ${rate.limit} requests/hour exceeded. Retry in ${retry}s.`, undefined, retry);
    }

    const matched = router.match(req.method, path);
    if (!matched) throw notFound(`No route for ${req.method} ${path}. See GET /health and the docs at ${APP_URL}/docs/api.`);

    const rawBody = req.method === 'GET' || req.method === 'DELETE' ? '' : await req.text();
    const body = rawBody ? obj(JSON.parse(rawBody)) : {};

    // Idempotency applies to mutating verbs only.
    idemKey = req.method === 'POST' ? (req.headers.get('idempotency-key') ?? '').trim() || null : null;
    let requestHash = '';
    if (idemKey) {
      requestHash = await sha256Hex(rawBody);
      const hit = await lookupIdempotent(db, key.id, idemKey, path, requestHash);
      if (hit) {
        logRequest(db, {
          api_key_id: key.id, key_type: key.key_type, request_id: requestId, method: req.method,
          path, status_code: hit.status, duration_ms: Date.now() - startedAt,
          idempotency_key: idemKey, ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
        });
        return jsonResponse(hit.body, hit.status, { ...baseHeaders, 'Idempotent-Replay': 'true' });
      }
    }

    const ctx: RouteContext = { req, db, key, params: matched.params, query: url.searchParams, body, requestId };
    const result = await matched.handler(ctx);
    const status = result instanceof ApiResult ? result.status : 200;
    const payload = result instanceof ApiResult ? result.body : result;
    const extra = result instanceof ApiResult ? result.headers : {};

    if (idemKey && status < 500) storeIdempotent(db, key.id, idemKey, path, requestHash, status, payload);

    logRequest(db, {
      api_key_id: key.id, key_type: key.key_type, request_id: requestId, method: req.method, path,
      status_code: status, duration_ms: Date.now() - startedAt, idempotency_key: idemKey,
      ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
    });

    // Opportunistic outbox drain keeps webhooks flowing without a cron job.
    // Fire-and-forget so it never adds latency to the partner's request.
    drainWebhooks(db, 5).catch(() => {});

    return jsonResponse(payload, status, { ...baseHeaders, ...extra });
  } catch (e) {
    const err = e instanceof ApiError ? e : serverError(String((e as Error)?.message ?? e));
    if (err.status >= 500) console.error(`partner-api ${requestId} ${req.method} ${path}:`, e);

    logRequest(db, {
      api_key_id: key?.id ?? null, key_type: key?.key_type ?? null, request_id: requestId,
      method: req.method, path, status_code: err.status, duration_ms: Date.now() - startedAt,
      error_code: err.code, idempotency_key: idemKey,
      ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
    });

    const headers: Record<string, string> = { ...baseHeaders };
    if (err.retryAfter) headers['Retry-After'] = String(err.retryAfter);
    if (err.status === 401) headers['WWW-Authenticate'] = 'Bearer realm="SurePath Partner API"';
    return jsonResponse(errorBody(err, requestId), err.status, headers);
  }
});
