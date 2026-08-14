# SurePath Public API

> Status: **shipped v1.55.0** · Base project `uyjgeteelnswphyzkjwi`
> Specs: [`openapi/partner-api.yaml`](openapi/partner-api.yaml) · [`openapi/insurer-api.yaml`](openapi/insurer-api.yaml) · [`openapi/data-gateway.yaml`](openapi/data-gateway.yaml)

SurePath now exposes three HTTP surfaces. Two are new and outward-facing; the
third is the internal one the portals have always used, now written down.

| Surface | Function | Audience | Auth | Spec |
|---|---|---|---|---|
| **Partner API** | `partner-api` | Distribution partners (marketplaces, fintechs, dealerships) | API key `sp_live_…` | `openapi/partner-api.yaml` |
| **Insurer API** | `insurer-api` | Partner insurers integrating their underwriting systems | API key `ins_live_…` | `openapi/insurer-api.yaml` |
| **Data Gateway** | `data-gateway` | SurePath's own web + Android apps | Supabase JWT | `openapi/data-gateway.yaml` |

```
https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/partner-api/v1/...
https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/insurer-api/v1/...
https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/data-gateway
```

---

## 1. Why two new functions instead of more gateway actions

The data gateway is an RPC endpoint shaped around one SPA. It answers
`{action, params}` over a single POST, its errors are Indonesian strings meant
for a toast, and its action list changes whenever the app does. All of that is
correct for a first-party client and wrong for a third party who needs a stable
contract, real HTTP semantics, and a credential that is not a user session.

The two new functions are separate deployables with their own auth model, so
partner traffic cannot reach a gateway action by accident, and the gateway can
keep evolving without breaking an integration.

---

## 2. Authentication

Both new APIs use bearer API keys:

```http
Authorization: Bearer sp_live_kQ3xR8nT...
```

`X-API-Key: <key>` is accepted as an equivalent.

Keys live in `sp_api_keys` as **SHA-256 hashes only**. The plaintext is
returned once, at creation, and cannot be recovered — a lost key is replaced,
not looked up. Each row also carries a display-safe `key_prefix`
(`sp_live_9f2ac1b4`) for the admin UI.

| Field | Meaning |
|---|---|
| `key_type` | `PARTNER` or `INSURER` — enforced per function, cross-use returns `403` |
| `agent_id` | PARTNER only. Orders are written with this `sp_users.id`, so commission, wallet and tier logic work unchanged |
| `insurer_id` | INSURER only. Hard-scopes every query to one insurer's order book |
| `scopes` | Per-endpoint permission (see below) |
| `rate_limit_per_hour` | Default 1000 |
| `allowed_ips` | Optional exact-match source-IP allowlist |
| `expires_at` / `revoked_at` | Both checked on every request |

**Scopes**

| Partner | Insurer |
|---|---|
| `quotes:read`, `quotes:write` | `orders:read` |
| `orders:read`, `orders:write` | `orders:decide` |
| `payments:read`, `payments:write` | `policies:write` |
| `webhooks:manage` | `payments:read`, `webhooks:manage` |

Neither API emits a CORS allowlist. These are server-to-server credentials; an
API key in browser JavaScript is a leaked API key.

### Issuing keys

Admin-only, over a Supabase JWT (`MASTER_ADMIN`, `ADMIN`, `FINANCE*`,
`INSURANCE_ADMIN` — note `OPERATOR` is not admin for this purpose):

```bash
curl -X POST "$BASE/partner-api/admin/v1/keys" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tokopedia — production",
    "key_type": "PARTNER",
    "agent_id": "<sp_users.id of the partner account>",
    "scopes": ["quotes:write","quotes:read","orders:write","orders:read","payments:write","payments:read","webhooks:manage"],
    "rate_limit_per_hour": 5000
  }'
```

The response contains `api_key` exactly once. Other admin routes:

| Route | Purpose |
|---|---|
| `GET /partner-api/admin/v1/keys` | List all keys (hashes never returned) |
| `POST /partner-api/admin/v1/keys/{id}/revoke` | Immediate revocation |
| `POST /partner-api/admin/v1/webhooks/drain` | Force a webhook outbox drain |

Insurer keys are created through the same route with
`{"key_type":"INSURER","insurer_id":"..."}`.

---

## 3. Partner API — the selling flow

```
POST /v1/quotes            → price a risk, get per-insurer options
POST /v1/orders            → convert a quote by picking an insurer
POST /v1/orders/{id}/payment-link → Xendit invoice URL
   ↳ webhook payment.paid  → commission credited, order proceeds to review
```

### Pricing is server-side, always

Partners send **risk facts**, never money. There is no field in any request
body that sets a premium. `POST /v1/quotes` prices against the active OJK rate
set (`sp_ojk_rate_sets`, falling back to the SEOJK 6/2017 seed tables), and
`POST /v1/orders` **re-prices from the quote's stored inputs** rather than
trusting the cached premium on the quote row.

Commission follows the same rule as `create_policy_order` in the gateway:
insurer product rate, overridden by the agent's own rate, hard-capped at 30%.

### Quote options

A quote returns one entry per insurer offering that product, each priced with
that insurer's own OJK band and fee schedule. Ineligible insurers are included
with an `ineligible_reason` (e.g. vehicle over the age ceiling), so a partner
can explain a missing option instead of silently dropping it.

### Order lifecycle

API orders enter at `SUBMITTED` and travel the existing path —
SurePath operator review → insurer decision → issuance. The API cannot approve
or issue anything. Partners observe via webhooks or `GET /v1/orders/{id}`.

### Worked example

```bash
BASE=https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/partner-api

# 1. quote
curl -sX POST "$BASE/v1/quotes" \
  -H "Authorization: Bearer $SP_KEY" -H 'Content-Type: application/json' \
  -d '{
    "product_type":"CAR","coverage_type":"COMPREHENSIVE",
    "sum_insured":250000000,"province":"DKI Jakarta",
    "vehicle":{"make":"Toyota","model":"Avanza 1.5 G","year":2022,"plate_number":"B1234XYZ"},
    "addons":{"flood":true,"earthquake":true,"tpl_limit":25000000,"pa_driver":true,"pa_passenger_seats":4}
  }'
# → { "code":"QK7M2PX9RT4VBNH", "premium":{...}, "options":[{ "insurer_id":"...", "total_premium":6742500, ... }] }

# 2. order (idempotent)
curl -sX POST "$BASE/v1/orders" \
  -H "Authorization: Bearer $SP_KEY" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: order-tokopedia-88213" \
  -d '{
    "quote_code":"QK7M2PX9RT4VBNH",
    "insurer_id":"0f4b2c1e-9a3d-4c7e-8b21-5d6e7f8a9b0c",
    "customer":{"name":"Budi Santoso","phone":"081234567890","ktp":"3171012509900002"},
    "vehicle":{"chassis_number":"MHKA1234567890123","engine_number":"1NR9876543","color":"Silver"}
  }'
# → { "id":"...", "order_number":"ORD-1A2B3C4D", "status":"SUBMITTED", ... }

# 3. payment link
curl -sX POST "$BASE/v1/orders/ORD-1A2B3C4D/payment-link" -H "Authorization: Bearer $SP_KEY"
# → { "invoice_url":"https://checkout.xendit.co/...", "status":"PENDING", ... }
```

---

## 4. Insurer API — the underwriting flow

```
GET  /v1/orders?decision=none      → the work queue
POST /v1/orders/{id}/decision      → APPROVED | REQUEST_INFO | DECLINED
POST /v1/orders/{id}/policy        → attach the PDF, order becomes ISSUED
```

Semantics are copied from the dashboard actions in
`data-gateway/actions/insurers.ts` on purpose — same status mapping
(`REQUEST_INFO` → `UNDER_REVIEW`, `DECLINED` → `REJECTED`), same admin and
agent notifications, same `sp_insurer_activity_log` entries, so the API and
`/insurerapp` can't drift.

The insurer identity comes from the key. No request parameter selects an
insurer, so a key physically cannot reach another insurer's orders. Customer
KTP and address are omitted from insurer payloads — name and phone only.

---

## 5. Cross-cutting behaviour

### Errors

```json
{
  "error": { "type": "invalid_request_error", "code": "missing_field",
             "message": "\"sum_insured\" is required.", "param": "sum_insured" },
  "request_id": "6f1c8e2a-0b44-4a1e-9f3d-2c5b7a1d8e90"
}
```

`request_id` also appears in the `X-Request-ID` response header and in
`sp_api_requests`, so a partner's report can be matched to a server-side row.

Types: `invalid_request_error`, `authentication_error`, `permission_error`,
`not_found_error`, `conflict_error`, `rate_limit_error`, `api_error`.

### Idempotency

Send `Idempotency-Key` on any POST. The first response is stored for 24h in
`sp_api_idempotency` and replayed for retries (flagged `Idempotent-Replay: true`).
The same key with a **different body** returns `409 idempotency_key_reused` —
silently returning the old response would hide a real client bug.

### Rate limits

Per-key hourly budget on the shared `sp_rate_limits` bucket. Every response
carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`; a `429` adds
`Retry-After`. The limiter **fails closed** — if the counter is unreachable the
request is denied rather than admitted unmetered.

### Webhooks

Events are enqueued by **database triggers**, not by application code, so an
order or payment that changes through any path — operator UI, insurer
dashboard, Xendit webhook, the APIs themselves — produces the same event. The
enqueue function swallows its own errors: a webhook problem can never roll back
a payment write.

| Event | Fires when |
|---|---|
| `order.created` | a row is inserted into `sp_policy_orders` |
| `order.status_changed` | `status` changes (includes `APPROVED`, `REJECTED`, `ISSUED`) |
| `payment.created` | an invoice is opened |
| `payment.paid` | a payment reaches `PAID` |
| `ping` | `POST /v1/webhook/test` |

Delivery is drained opportunistically at the end of each API request (fire and
forget, so it adds no latency) and can be forced via the admin drain route.
Failures retry at 1m, 5m, 15m, 1h, 3h, 12h — six attempts, then `FAILED`.

Verify a delivery:

```
signature = HMAC-SHA256(signing_secret, "<X-SurePath-Timestamp>.<raw body>")
```

compared against `X-SurePath-Signature` in constant time. The timestamp is
inside the signed string, so a captured delivery cannot be replayed against a
receiver that enforces a freshness window (five minutes is a good default).
Deduplicate on the delivery `id`.

---

## 6. Data model

All four tables are deny-all (RLS on, zero policies) — reachable only via the
edge functions' `service_role` client.

| Table | Contents |
|---|---|
| `sp_api_keys` | Credentials: hash, type, owner, scopes, limits, webhook config |
| `sp_api_requests` | Append-only access log — one row per request, rejections included |
| `sp_api_idempotency` | Stored POST responses, 24h TTL |
| `sp_api_webhook_deliveries` | Outbox with attempt counters and backoff |

Helpers: `sp_api_enqueue_webhook()` (fan-out), `sp_api_orders_webhook_trg()` /
`sp_api_payments_webhook_trg()` (triggers), `sp_api_gc()` (retention — 24h
idempotency, 90d request log, 30d settled deliveries).

Migration: `supabase/migrations/20260812_public_api.sql` (applied). A second migration,
`20260812_fix_audit_critical_update.sql`, is present but **not applied** — see §8.

---

## 7. Deployment

`partner-api` and `insurer-api` must both be deployed with **`--no-verify-jwt`**.
They authenticate in code against a hashed API key; Supabase's own JWT gate
would reject every partner call before that code ever runs.

`.github/workflows/deploy-edge-functions.yml` deploys `data-gateway`,
`partner-api` and `insurer-api` on push to `main`, with the `--no-verify-jwt`
branch covering all three.

---

## 8. ⚠️ Pre-existing bug found during testing: `payment.paid` cannot fire yet

Smoke-testing the new triggers surfaced an unrelated, **pre-existing** production
bug that blocks the payment path:

`audit_critical_update()` is attached to both `sp_policy_orders` and
`sp_payments`, but dereferences `OLD.total_premium`, `OLD.commission_amount`
and `OLD.discount_amount` unconditionally. `sp_payments` has none of those
columns, and a missing record field is a run-time error in PL/pgSQL, so:

```
ERROR: 42703: record "old" has no field "total_premium"
```

**Every UPDATE to `sp_payments` currently aborts.** Inserts are fine — the
trigger is UPDATE-only — which is why `create-xendit-invoice` works and nothing
has broken so far. `sp_payments` has 0 rows in production, so no real customer
has ever completed a payment and stepped on it.

The first one would fail: `xendit-webhook` could not mark the payment `PAID`,
so the order would not advance and the agent's commission would not be
credited. The `payment.paid` webhook in this API is downstream of that same
update, so it cannot fire either.

A fix is written and ready but **deliberately not applied** —
`supabase/migrations/20260812_fix_audit_critical_update.sql`. It makes the
guard column-agnostic via `to_jsonb()`, leaving `sp_policy_orders` behaviour
identical and reducing the `sp_payments` guard to `status`. It sits on the
money path, so it wants a human review before it goes out.

Everything else in the trigger set is verified: `order.created`,
`order.status_changed` and `payment.created` all enqueue correctly, and a key
belonging to a different agent receives nothing.

---

## 9. Known gaps

- **No sandbox environment.** `environment: "test"` is stored on the key and
  echoed in `/v1/me`, but test keys hit the same database as live ones. A real
  sandbox needs a separate project or a tenant flag on the data.
- **No renewals or endorsements** over the API — new business only.
- **Motor only.** Travel, PA and MPAR products exist in the platform but are
  not exposed here; the rating engine port covers `CAR` and `MOTORCYCLE`.
- **`sp_api_gc()` is not scheduled.** It is safe to call from cron whenever
  someone wires one up.
- **Rate tables are duplicated.** `supabase/functions/_shared/ojkRating.ts` is a
  Deno port of `services/ojkRates.ts`; the seed numbers live in both and must be
  changed together. The DB rate set (`sp_ojk_rate_sets`) overrides both at
  runtime, so this only matters for the fallback path.
