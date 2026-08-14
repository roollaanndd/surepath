// ─────────────────────────────────────────────────────────────────────────────
// SurePath Insurer API (machine-to-machine) — v1
//
//   https://<project>.supabase.co/functions/v1/insurer-api/v1/...
//
// Partner insurers already have two human-facing ways in: the emailed
// /review/:uuid link (single-use token) and the /insurerapp dashboard (rolling
// 7-day bearer token). Neither suits a system integration — both expire, and
// both assume a browser.
//
// This function exposes the same order book over REST, authenticated with a
// long-lived INSURER API key. Every route is hard-scoped to the insurer the key
// belongs to: the insurer_id comes from the key record, never from the request,
// so one insurer can never read or decide another's business.
//
// Decision and policy-issue semantics deliberately mirror
// data-gateway/actions/insurers.ts (`insurer_submit_decision_authed`,
// `insurer_upload_policy`) — same status mapping, same notifications, same
// activity log — so the API and the dashboard cannot drift apart.
//
// verify_jwt MUST be false for this function — it authenticates in code.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ApiError, ApiResult, API_VERSION, Router, authenticateKey, badRequest, checkKeyRateLimit,
  clientIp, conflict, drainWebhooks, errorBody, jsonResponse, logRequest, lookupIdempotent,
  normalizePath, notFound, obj, oneOf, pageLimit, requireScope, secondsUntilNextHour,
  serverError, sha256Hex, storeIdempotent, str,
  type ApiKeyRecord, type Db, type RouteContext,
} from '../_shared/apiRuntime.ts';

const FUNCTION_NAME = 'insurer-api';
const SERVICE_VERSION = '1.0.0';

const DECISIONS = ['APPROVED', 'REQUEST_INFO', 'DECLINED'] as const;

// Same mapping the dashboard uses: REQUEST_INFO parks the order back in the
// operator queue rather than resolving it.
const DECISION_TO_STATUS: Record<(typeof DECISIONS)[number], string> = {
  APPROVED: 'APPROVED',
  REQUEST_INFO: 'UNDER_REVIEW',
  DECLINED: 'REJECTED',
};

const ORDER_COLUMNS =
  'id, order_number, agent_id, status, product_code, product_name, coverage_type, vehicle_type, ' +
  'vehicle_details, vehicle_image_url, sum_insured, zone, vehicle_category, addons, base_premium, ' +
  'addon_premium, admin_fee, stamp_duty, total_premium, net_premium, ojk_rate, client_name, ' +
  'client_phone, insurer_id, insurer_decision, insurer_decision_notes, insurer_decision_at, ' +
  'policy_number, policy_document_url, reviewed_at, issued_at, created_at, updated_at';

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
    vehicle_image_url: row.vehicle_image_url ?? null,
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
      net: row.net_premium == null ? null : Number(row.net_premium),
    },
    ojk_rate: row.ojk_rate == null ? null : Number(row.ojk_rate),
    // The insured's name and phone are what the insurer needs to underwrite;
    // KTP and address stay out of this payload.
    customer: { name: row.client_name, phone: row.client_phone ?? null },
    decision: row.insurer_decision ?? null,
    decision_notes: row.insurer_decision_notes ?? null,
    decision_at: row.insurer_decision_at ?? null,
    policy_number: row.policy_number ?? null,
    policy_document_url: row.policy_document_url ?? null,
    reviewed_at: row.reviewed_at ?? null,
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
    paid_at: row.paid_at ?? null,
    payment_method: row.payment_method ?? null,
    created_at: row.created_at,
  };
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Loads an order, refusing anything not assigned to this key's insurer. */
async function findInsurerOrder(db: Db, insurerId: string, idOrNumber: string): Promise<Record<string, unknown>> {
  const base = db.from('sp_policy_orders').select(ORDER_COLUMNS).eq('insurer_id', insurerId).is('deleted_at', null);
  const { data, error } = isUuid(idOrNumber)
    ? await base.eq('id', idOrNumber).maybeSingle()
    : await base.eq('order_number', idOrNumber).maybeSingle();
  if (error) throw serverError('Could not load order');
  if (!data) throw notFound(`No order "${idOrNumber}" is assigned to your insurer.`);
  return data as Record<string, unknown>;
}

/** Append-only audit trail, shared with the dashboard flow. */
function logActivity(db: Db, req: Request, insurerId: string, orderId: string | null, action: string, details: Record<string, unknown>): void {
  const ip = clientIp(req);
  db.from('sp_insurer_activity_log').insert({
    insurer_id: insurerId,
    order_id: orderId,
    action,
    details: { ...details, ip, via: 'insurer-api' },
    ip_address: ip,
    user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
  }).then(() => {}, () => {});
}

function sendTelegram(text: string): void {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
  if (!token || !chatId) return;
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).then(() => {}, () => {});
}

// ─── Routes ──────────────────────────────────────────────────────────────────

const router = new Router();

router.get('/v1/me', async ({ db, key }) => {
  const { data: insurer } = await db.from('sp_insurers')
    .select('id, code, name, logo_url, pic_name, pic_email').eq('id', key.insurer_id).maybeSingle();
  return {
    object: 'api_key',
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    environment: key.environment,
    scopes: key.scopes,
    rate_limit_per_hour: key.rate_limit_per_hour,
    webhook_url: key.webhook_url,
    insurer: insurer ?? null,
    api_version: API_VERSION,
  };
});

router.get('/v1/orders', async ({ db, key, query }) => {
  requireScope(key, 'orders:read');
  const limit = pageLimit(query);
  let q = db.from('sp_policy_orders').select(ORDER_COLUMNS)
    .eq('insurer_id', key.insurer_id).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(limit + 1);

  const status = query.get('status');
  if (status) q = q.eq('status', status.toUpperCase());
  const decision = query.get('decision');
  if (decision === 'none') q = q.is('insurer_decision', null);
  else if (decision) q = q.eq('insurer_decision', decision.toUpperCase());
  const createdBefore = query.get('created_before');
  if (createdBefore) q = q.lt('created_at', createdBefore);

  const { data, error } = await q;
  if (error) throw serverError('Could not list orders');
  const rows = data ?? [];
  return { object: 'list', data: rows.slice(0, limit).map(serializeOrder), has_more: rows.length > limit };
});

router.get('/v1/orders/:id', async ({ db, key, params }) => {
  requireScope(key, 'orders:read');
  return serializeOrder(await findInsurerOrder(db, key.insurer_id!, params.id));
});

router.post('/v1/orders/:id/decision', async ({ db, key, params, body, req }) => {
  requireScope(key, 'orders:decide');
  const order = await findInsurerOrder(db, key.insurer_id!, params.id);

  const action = oneOf(body.action, 'action', DECISIONS) as (typeof DECISIONS)[number];
  const notes = str(body.notes, 'notes', { max: 2000 });
  if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
    throw badRequest('missing_field', '"notes" is required (min 5 characters) for REQUEST_INFO and DECLINED.', 'notes');
  }
  if (order.insurer_decision) {
    throw conflict('decision_already_recorded', `This order already has decision "${order.insurer_decision}".`);
  }

  const ts = new Date().toISOString();
  const status = DECISION_TO_STATUS[action];
  const { data: updated, error } = await db.from('sp_policy_orders').update({
    status,
    insurer_decision: action,
    insurer_decision_notes: notes,
    insurer_decision_at: ts,
    reviewer_notes: `Insurer ${action}: ${notes}`,
    reviewed_at: ts,
    updated_at: ts,
  }).eq('id', order.id).eq('insurer_id', key.insurer_id).select(ORDER_COLUMNS).single();
  if (error) throw serverError('Could not record decision');

  const label = action === 'APPROVED' ? 'menyetujui' : action === 'REQUEST_INFO' ? 'meminta info tambahan untuk' : 'menolak';
  db.from('sp_admin_notifications').insert({
    type: `INSURER_${action}`,
    title: `Insurer ${label} pengajuan`,
    body: `${order.order_number} — ${order.client_name}: ${notes || '(tanpa catatan)'}`,
    order_id: order.id,
    read: false,
    metadata: { order_id: order.id, action, notes, insurer_id: key.insurer_id, via: 'insurer-api' },
  }).then(() => {}, () => {});

  if (order.agent_id) {
    db.from('sp_notifications').insert({
      agent_id: order.agent_id,
      type: 'ORDER_UPDATE',
      title: action === 'APPROVED' ? 'Pengajuan polis disetujui insurer'
        : action === 'REQUEST_INFO' ? 'Insurer meminta info tambahan'
        : 'Pengajuan polis ditolak insurer',
      body: `${order.order_number}: ${notes || 'Mohon lengkapi persyaratan dari insurer.'}`,
      read: false,
      metadata: { order_id: order.id, action, notes },
    }).then(() => {}, () => {});
  }

  sendTelegram(
    `Insurer Decision (API) - SurePath\n\n` +
    `Order: ${order.order_number}\n` +
    `Nasabah: ${order.client_name}\n` +
    `Decision: ${action}\n` +
    `Notes: ${notes || '-'}`,
  );
  logActivity(db, req, key.insurer_id!, String(order.id), 'DECISION_SUBMITTED', { action, notes });

  return serializeOrder(updated);
});

router.post('/v1/orders/:id/policy', async ({ db, key, params, body, req }) => {
  requireScope(key, 'policies:write');
  const order = await findInsurerOrder(db, key.insurer_id!, params.id);

  const documentUrl = str(body.policy_document_url, 'policy_document_url', { required: true, max: 1000 });
  if (!/^https:\/\//i.test(documentUrl)) {
    throw badRequest('invalid_field', '"policy_document_url" must be an https:// URL.', 'policy_document_url');
  }
  const policyNumber = str(body.policy_number, 'policy_number', { max: 100 });

  if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
    throw conflict('order_not_issuable', `A ${order.status} order cannot be issued.`);
  }

  const ts = new Date().toISOString();
  const { data: updated, error } = await db.from('sp_policy_orders').update({
    policy_document_url: documentUrl,
    policy_number: policyNumber || null,
    status: 'ISSUED',
    issued_at: ts,
    updated_at: ts,
  }).eq('id', order.id).eq('insurer_id', key.insurer_id).select(ORDER_COLUMNS).single();
  if (error) throw serverError('Could not attach policy');

  db.from('sp_admin_notifications').insert({
    type: 'POLICY_ISSUED',
    title: 'Polis Diterbitkan oleh Insurer (API)',
    body: `${order.order_number} — ${order.client_name}: polis ${policyNumber || '(no number)'} telah diterbitkan.`,
    order_id: order.id,
    read: false,
    metadata: { order_id: order.id, policy_number: policyNumber, insurer_id: key.insurer_id, via: 'insurer-api' },
  }).then(() => {}, () => {});

  if (order.agent_id) {
    db.from('sp_notifications').insert({
      agent_id: order.agent_id,
      type: 'SYSTEM',
      title: 'Polis Diterbitkan!',
      body: `${order.order_number}: polis ${policyNumber || ''} sudah diterbitkan oleh insurer.`,
      read: false,
      metadata: { order_id: order.id, policy_number: policyNumber },
    }).then(() => {}, () => {});
  }

  logActivity(db, req, key.insurer_id!, String(order.id), 'POLICY_UPLOADED', { policy_number: policyNumber, document_url: documentUrl });
  return serializeOrder(updated);
});

router.get('/v1/payments', async ({ db, key, query }) => {
  requireScope(key, 'payments:read');
  const limit = pageLimit(query);
  const { data: orders } = await db.from('sp_policy_orders')
    .select('id').eq('insurer_id', key.insurer_id).is('deleted_at', null).limit(1000);
  const orderIds = (orders ?? []).map((o: Record<string, unknown>) => o.id);
  if (!orderIds.length) return { object: 'list', data: [], has_more: false };

  let q = db.from('sp_payments').select('*').in('order_id', orderIds).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(limit + 1);
  const status = query.get('status');
  if (status) q = q.eq('status', status.toUpperCase());

  const { data, error } = await q;
  if (error) throw serverError('Could not list payments');
  const rows = data ?? [];
  return { object: 'list', data: rows.slice(0, limit).map(serializePayment), has_more: rows.length > limit };
});

router.get('/v1/orders/:id/payments', async ({ db, key, params }) => {
  requireScope(key, 'payments:read');
  const order = await findInsurerOrder(db, key.insurer_id!, params.id);
  const { data, error } = await db.from('sp_payments').select('*')
    .eq('order_id', order.id).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw serverError('Could not list payments');
  return { object: 'list', data: (data ?? []).map(serializePayment), has_more: false };
});

// ─── Webhooks (identical contract to the partner API) ────────────────────────

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
    api_key_id: key.id, event: 'ping',
    payload: { message: 'SurePath webhook test event', api_key_id: key.id },
  }).select('id').single();
  if (error) throw serverError('Could not enqueue test event');
  await drainWebhooks(db, 5);
  return new ApiResult(202, { object: 'webhook_delivery', id: data.id, event: 'ping', status: 'queued' });
});

// ─── Entry point ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const url = new URL(req.url);
  const path = normalizePath(url.pathname, FUNCTION_NAME);
  const baseHeaders: Record<string, string> = { 'X-Request-ID': requestId, 'X-SurePath-Api-Version': API_VERSION };

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

  let key: ApiKeyRecord | null = null;
  let idemKey: string | null = null;

  try {
    key = await authenticateKey(db, req, 'INSURER');

    const rate = await checkKeyRateLimit(db, key);
    baseHeaders['X-RateLimit-Limit'] = String(rate.limit);
    baseHeaders['X-RateLimit-Remaining'] = String(rate.remaining);
    if (!rate.allowed) {
      const retry = secondsUntilNextHour();
      throw new ApiError(429, 'rate_limit_error', 'rate_limit_exceeded',
        `Rate limit of ${rate.limit} requests/hour exceeded. Retry in ${retry}s.`, undefined, retry);
    }

    const matched = router.match(req.method, path);
    if (!matched) throw notFound(`No route for ${req.method} ${path}.`);

    const rawBody = req.method === 'GET' || req.method === 'DELETE' ? '' : await req.text();
    const body = rawBody ? obj(JSON.parse(rawBody)) : {};

    idemKey = req.method === 'POST' ? (req.headers.get('idempotency-key') ?? '').trim() || null : null;
    let requestHash = '';
    if (idemKey) {
      requestHash = await sha256Hex(rawBody);
      const hit = await lookupIdempotent(db, key.id, idemKey, path, requestHash);
      if (hit) {
        logRequest(db, {
          api_key_id: key.id, key_type: key.key_type, request_id: requestId, method: req.method, path,
          status_code: hit.status, duration_ms: Date.now() - startedAt, idempotency_key: idemKey,
          ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
        });
        return jsonResponse(hit.body, hit.status, { ...baseHeaders, 'Idempotent-Replay': 'true' });
      }
    }

    const ctx: RouteContext = { req, db, key, params: matched.params, query: url.searchParams, body, requestId };
    const result = await matched.handler(ctx);
    const status = result instanceof ApiResult ? result.status : 200;
    const payload = result instanceof ApiResult ? result.body : result;

    if (idemKey && status < 500) storeIdempotent(db, key.id, idemKey, path, requestHash, status, payload);

    logRequest(db, {
      api_key_id: key.id, key_type: key.key_type, request_id: requestId, method: req.method, path,
      status_code: status, duration_ms: Date.now() - startedAt, idempotency_key: idemKey,
      ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
    });

    drainWebhooks(db, 5).catch(() => {});
    return jsonResponse(payload, status, baseHeaders);
  } catch (e) {
    const err = e instanceof ApiError ? e : serverError(String((e as Error)?.message ?? e));
    if (err.status >= 500) console.error(`insurer-api ${requestId} ${req.method} ${path}:`, e);

    logRequest(db, {
      api_key_id: key?.id ?? null, key_type: key?.key_type ?? null, request_id: requestId,
      method: req.method, path, status_code: err.status, duration_ms: Date.now() - startedAt,
      error_code: err.code, idempotency_key: idemKey,
      ip_address: clientIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
    });

    const headers: Record<string, string> = { ...baseHeaders };
    if (err.retryAfter) headers['Retry-After'] = String(err.retryAfter);
    if (err.status === 401) headers['WWW-Authenticate'] = 'Bearer realm="SurePath Insurer API"';
    return jsonResponse(errorBody(err, requestId), err.status, headers);
  }
});
