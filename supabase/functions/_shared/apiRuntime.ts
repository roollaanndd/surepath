// ─────────────────────────────────────────────────────────────────────────────
// SurePath public API runtime — shared by partner-api and insurer-api.
//
// Everything that is *not* domain logic lives here: key authentication, scope
// checks, routing, the error envelope, rate limiting, idempotency, the request
// log and webhook delivery.
//
// Contract shared by both functions:
//   • Auth       — `Authorization: Bearer <key>` or `X-API-Key: <key>`
//   • Success    — the resource as a bare JSON object, or `{ data, has_more }`
//   • Failure    — `{ error: { type, code, message, param? }, request_id }`
//   • Every response carries `X-Request-ID` and the `X-RateLimit-*` trio.
//
// These are server-to-server APIs: no CORS allowlist is granted to browsers,
// because an API key in browser JavaScript is a leaked API key.
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
export type Db = any;

export const API_VERSION = '2026-08-12';

// ─── Error envelope ──────────────────────────────────────────────────────────

export type ErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found_error'
  | 'conflict_error'
  | 'rate_limit_error'
  | 'api_error';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: ErrorType,
    readonly code: string,
    message: string,
    readonly param?: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, param?: string) =>
  new ApiError(400, 'invalid_request_error', code, message, param);
export const unauthorized = (code: string, message: string) =>
  new ApiError(401, 'authentication_error', code, message);
export const forbidden = (code: string, message: string) =>
  new ApiError(403, 'permission_error', code, message);
export const notFound = (message = 'Resource not found') =>
  new ApiError(404, 'not_found_error', 'not_found', message);
export const conflict = (code: string, message: string) =>
  new ApiError(409, 'conflict_error', code, message);
export const serverError = (message = 'Internal error') =>
  new ApiError(500, 'api_error', 'internal_error', message);

// ─── Crypto helpers ──────────────────────────────────────────────────────────

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Mints a new API key. The plaintext is returned to the caller exactly once —
 * only `hash` is ever written to the database.
 */
export async function generateApiKey(
  keyType: 'PARTNER' | 'INSURER',
  environment: 'live' | 'test',
): Promise<{ key: string; prefix: string; hash: string }> {
  const scope = keyType === 'INSURER' ? 'ins' : 'sp';
  const secret = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const key = `${scope}_${environment}_${secret}`;
  return { key, prefix: `${scope}_${environment}_${secret.slice(0, 8)}`, hash: await sha256Hex(key) };
}

/** Constant-time string comparison — used for hash equality checks. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── API key record ──────────────────────────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_type: 'PARTNER' | 'INSURER';
  environment: 'live' | 'test';
  key_prefix: string;
  scopes: string[];
  agent_id: string | null;
  insurer_id: string | null;
  rate_limit_per_hour: number;
  webhook_url: string | null;
  webhook_secret: string | null;
  allowed_ips: string[] | null;
  is_active: boolean;
  expires_at: string | null;
  revoked_at: string | null;
}

const KEY_COLUMNS =
  'id, name, key_type, environment, key_prefix, scopes, agent_id, insurer_id, ' +
  'rate_limit_per_hour, webhook_url, webhook_secret, allowed_ips, is_active, expires_at, revoked_at';

export function extractKey(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return (req.headers.get('x-api-key') ?? '').trim();
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

/**
 * Resolves the presented key to an active sp_api_keys row, or throws ApiError.
 * Lookup is by SHA-256 hash, so the plaintext never has to be stored or logged.
 */
export async function authenticateKey(
  db: Db,
  req: Request,
  expectedType: 'PARTNER' | 'INSURER',
): Promise<ApiKeyRecord> {
  const presented = extractKey(req);
  if (!presented) {
    throw unauthorized('missing_api_key', 'No API key provided. Send it as "Authorization: Bearer <key>" or "X-API-Key: <key>".');
  }

  const hash = await sha256Hex(presented);
  const { data, error } = await db.from('sp_api_keys').select(KEY_COLUMNS).eq('key_hash', hash).maybeSingle();
  if (error) throw serverError('Could not verify API key');
  if (!data) throw unauthorized('invalid_api_key', 'Invalid API key.');

  const key = data as ApiKeyRecord;
  if (key.key_type !== expectedType) {
    throw forbidden('wrong_key_type', `This endpoint requires a ${expectedType.toLowerCase()} API key.`);
  }
  if (!key.is_active || key.revoked_at) {
    throw unauthorized('revoked_api_key', 'This API key has been revoked.');
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    throw unauthorized('expired_api_key', 'This API key has expired.');
  }
  if (key.allowed_ips?.length) {
    const ip = clientIp(req);
    if (!key.allowed_ips.includes(ip)) {
      throw forbidden('ip_not_allowed', `Requests from ${ip} are not allowed for this API key.`);
    }
  }

  db.from('sp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then(() => {}, () => {});
  return key;
}

export function requireScope(key: ApiKeyRecord, scope: string): void {
  if (!key.scopes.includes(scope)) {
    throw forbidden('insufficient_scope', `This API key is missing the "${scope}" scope.`);
  }
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

export interface RateState { limit: number; remaining: number; allowed: boolean }

/**
 * Hourly per-key budget, on top of the shared sp_rate_limits bucket used by the
 * rest of the platform. Fails *closed* — an unreachable counter must not become
 * an unlimited API.
 */
export async function checkKeyRateLimit(db: Db, key: ApiKeyRecord): Promise<RateState> {
  const now = new Date();
  const bucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-` +
                 `${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  const identifier = `apikey:${key.id}`;
  const limit = key.rate_limit_per_hour;

  try {
    const { error: insErr } = await db.from('sp_rate_limits').insert({
      identifier, action: 'public_api', hour_bucket: bucket, request_count: 1, last_request: now.toISOString(),
    });
    if (!insErr) return { limit, remaining: limit - 1, allowed: true };

    const { data, error: rpcErr } = await db.rpc('increment_rate_limit', {
      p_identifier: identifier, p_action: 'public_api', p_hour_bucket: bucket,
    });
    if (rpcErr) return { limit, remaining: 0, allowed: false };
    const count = Number(data ?? limit + 1);
    return { limit, remaining: Math.max(0, limit - count), allowed: count <= limit };
  } catch {
    return { limit, remaining: 0, allowed: false };
  }
}

/** Seconds remaining until the current hourly bucket rolls over. */
export function secondsUntilNextHour(): number {
  const now = new Date();
  return 3600 - (now.getUTCMinutes() * 60 + now.getUTCSeconds());
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export interface RouteContext {
  req: Request;
  db: Db;
  key: ApiKeyRecord;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  requestId: string;
}

export type RouteHandler = (ctx: RouteContext) => Promise<unknown>;

interface Route { method: string; segments: string[]; handler: RouteHandler }

export class Router {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: RouteHandler): this {
    this.routes.push({ method, segments: pattern.split('/').filter(Boolean), handler });
    return this;
  }

  get(p: string, h: RouteHandler) { return this.add('GET', p, h); }
  post(p: string, h: RouteHandler) { return this.add('POST', p, h); }
  put(p: string, h: RouteHandler) { return this.add('PUT', p, h); }
  del(p: string, h: RouteHandler) { return this.add('DELETE', p, h); }

  match(method: string, path: string): { handler: RouteHandler; params: Record<string, string> } | null {
    const parts = path.split('/').filter(Boolean);
    let pathExists = false;
    for (const route of this.routes) {
      if (route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) { ok = false; break; }
      }
      if (!ok) continue;
      pathExists = true;
      if (route.method === method) return { handler: route.handler, params };
    }
    // Path is real but the verb is wrong — 405 is more useful than 404.
    if (pathExists) throw new ApiError(405, 'invalid_request_error', 'method_not_allowed', `${method} is not supported on this path.`);
    return null;
  }
}

/**
 * Strips the Supabase function mount prefix so handlers see clean paths.
 * Supabase routes `/functions/v1/<fn>/rest` — and some gateways drop the
 * `/functions/v1` part — so both shapes have to normalise to `/rest`.
 */
export function normalizePath(rawPath: string, functionName: string): string {
  let path = rawPath;
  const mount = `/functions/v1/${functionName}`;
  if (path.startsWith(mount)) path = path.slice(mount.length);
  else if (path.startsWith(`/${functionName}`)) path = path.slice(functionName.length + 1);
  return path || '/';
}

// ─── Response building ───────────────────────────────────────────────────────

export function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

/**
 * Handlers normally return a plain object (serialised with 200). Return this
 * instead when the status or extra headers matter — e.g. 201 on creation.
 */
export class ApiResult {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly headers: Record<string, string> = {},
  ) {}
}

export function errorBody(err: ApiError, requestId: string) {
  return {
    error: { type: err.type, code: err.code, message: err.message, ...(err.param ? { param: err.param } : {}) },
    request_id: requestId,
  };
}

// ─── Request log ─────────────────────────────────────────────────────────────

export function logRequest(db: Db, row: {
  api_key_id: string | null;
  key_type: string | null;
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  error_code?: string | null;
  idempotency_key?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}): void {
  db.from('sp_api_requests').insert(row).then(() => {}, () => {});
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export interface IdempotencyHit { status: number; body: unknown }

/**
 * Returns a previously stored response for this (key, Idempotency-Key) pair.
 * Replaying the same key against a different body is rejected with 409 — that
 * is a client bug, and silently returning the old response would hide it.
 */
export async function lookupIdempotent(
  db: Db, keyId: string, idemKey: string, endpoint: string, requestHash: string,
): Promise<IdempotencyHit | null> {
  const { data } = await db
    .from('sp_api_idempotency')
    .select('endpoint, request_hash, status_code, response_body, expires_at')
    .eq('api_key_id', keyId)
    .eq('idempotency_key', idemKey)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  if (data.endpoint !== endpoint || data.request_hash !== requestHash) {
    throw conflict('idempotency_key_reused',
      'This Idempotency-Key was already used with a different request body. Use a new key for a new request.');
  }
  return { status: data.status_code, body: data.response_body };
}

export function storeIdempotent(
  db: Db, keyId: string, idemKey: string, endpoint: string, requestHash: string,
  status: number, body: unknown,
): void {
  db.from('sp_api_idempotency').insert({
    api_key_id: keyId, idempotency_key: idemKey, endpoint,
    request_hash: requestHash, status_code: status, response_body: body,
  }).then(() => {}, () => {});
}

// ─── Webhook delivery ────────────────────────────────────────────────────────

const WEBHOOK_BACKOFF_MINUTES = [1, 5, 15, 60, 180, 720];

/**
 * Drains up to `limit` due webhook deliveries. Each POST carries:
 *   X-SurePath-Event      the event name
 *   X-SurePath-Timestamp  unix seconds
 *   X-SurePath-Signature  hex HMAC-SHA256 of "<timestamp>.<body>" with the key's secret
 *
 * The timestamp is inside the signed string so a captured delivery cannot be
 * replayed later against a receiver that enforces a freshness window.
 */
export async function drainWebhooks(db: Db, limit = 10): Promise<{ delivered: number; failed: number }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await db
    .from('sp_api_webhook_deliveries')
    .select('id, api_key_id, event, payload, attempts, max_attempts')
    .eq('status', 'PENDING')
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (!due?.length) return { delivered: 0, failed: 0 };

  const keyIds = [...new Set(due.map((d: Record<string, unknown>) => d.api_key_id))];
  const { data: keys } = await db
    .from('sp_api_keys')
    .select('id, webhook_url, webhook_secret, is_active, revoked_at')
    .in('id', keyIds);
  const keyMap = new Map<string, Record<string, unknown>>();
  for (const k of keys ?? []) keyMap.set(k.id as string, k);

  let delivered = 0;
  let failed = 0;

  for (const row of due) {
    const key = keyMap.get(row.api_key_id as string);
    const attempts = Number(row.attempts) + 1;

    if (!key?.webhook_url || !key.is_active || key.revoked_at) {
      await db.from('sp_api_webhook_deliveries')
        .update({ status: 'FAILED', attempts, last_error: 'Webhook endpoint not configured or key revoked' })
        .eq('id', row.id);
      failed++;
      continue;
    }

    const body = JSON.stringify({
      id: row.id, event: row.event, created_at: nowIso, api_version: API_VERSION, data: row.payload,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = key.webhook_secret
      ? await hmacSha256Hex(key.webhook_secret as string, `${timestamp}.${body}`)
      : '';

    let statusCode = 0;
    let errText: string | null = null;
    try {
      const res = await fetch(key.webhook_url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SurePath-Webhooks/1.0',
          'X-SurePath-Event': String(row.event),
          'X-SurePath-Timestamp': String(timestamp),
          'X-SurePath-Signature': signature,
          'X-SurePath-Delivery': String(row.id),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      if (!res.ok) errText = (await res.text().catch(() => '')).slice(0, 500);
    } catch (e) {
      errText = String((e as Error)?.message ?? e).slice(0, 500);
    }

    if (statusCode >= 200 && statusCode < 300) {
      await db.from('sp_api_webhook_deliveries')
        .update({ status: 'DELIVERED', attempts, last_status_code: statusCode, delivered_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id);
      delivered++;
    } else {
      const exhausted = attempts >= Number(row.max_attempts);
      const backoff = WEBHOOK_BACKOFF_MINUTES[Math.min(attempts - 1, WEBHOOK_BACKOFF_MINUTES.length - 1)];
      await db.from('sp_api_webhook_deliveries').update({
        status: exhausted ? 'FAILED' : 'PENDING',
        attempts,
        last_status_code: statusCode || null,
        last_error: errText,
        next_attempt_at: new Date(Date.now() + backoff * 60_000).toISOString(),
      }).eq('id', row.id);
      failed++;
    }
  }

  return { delivered, failed };
}

// ─── Input helpers ───────────────────────────────────────────────────────────

export function str(value: unknown, field: string, opts: { max?: number; required?: boolean } = {}): string {
  const s = value == null ? '' : String(value).trim();
  if (!s) {
    if (opts.required) throw badRequest('missing_field', `"${field}" is required.`, field);
    return '';
  }
  return opts.max ? s.slice(0, opts.max) : s;
}

export function num(value: unknown, field: string, opts: { min?: number; max?: number; required?: boolean } = {}): number {
  if (value == null || value === '') {
    if (opts.required) throw badRequest('missing_field', `"${field}" is required.`, field);
    return 0;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest('invalid_field', `"${field}" must be a number.`, field);
  if (opts.min != null && n < opts.min) throw badRequest('invalid_field', `"${field}" must be at least ${opts.min}.`, field);
  if (opts.max != null && n > opts.max) throw badRequest('invalid_field', `"${field}" must be at most ${opts.max}.`, field);
  return n;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[], required = true): T | '' {
  const s = String(value ?? '').trim().toUpperCase();
  if (!s) {
    if (required) throw badRequest('missing_field', `"${field}" is required.`, field);
    return '';
  }
  if (!allowed.includes(s as T)) {
    throw badRequest('invalid_field', `"${field}" must be one of: ${allowed.join(', ')}.`, field);
  }
  return s as T;
}

export function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Clamps a `limit` query parameter into a sane page size. */
export function pageLimit(query: URLSearchParams, fallback = 50, max = 200): number {
  const raw = Number(query.get('limit') ?? fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), max);
}
