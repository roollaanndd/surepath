# SurePath — Connection Pooling, Caching & Load Testing

> Added v1.52.0 (2026-07-18). Read this before assuming DB/app capacity.

## Connection pooling — what's already true, and what changed

**Nothing in this codebase opens a raw Postgres connection.** Client, edge
functions (`data-gateway`, `quotations-gateway`, all others), and
`scripts/apply-migration.js` talk to the database exclusively over HTTPS via
**PostgREST** (`@supabase/supabase-js`) or Supabase's REST/RPC endpoints.
PostgREST itself is fronted by Supabase's managed connection pooler
(Supavisor) — it multiplexes many concurrent HTTP requests over a small,
internally-managed set of actual Postgres connections. There is no
`pg.Pool`/`postgres.js` anywhere in the repo to misconfigure, and confirmed
via `grep` before making any changes here.

Verified live (`pg_stat_activity`, 2026-07-18): `max_connections = 60`,
12 connections open at idle, 1 attributable to PostgREST. There is no
connection-exhaustion risk from the app's current traffic shape.

**If you ever add a tool that needs a direct Postgres connection** (a
migration runner, a BI tool, a long-running script), point it at the
**Supavisor transaction-mode pooler**, not the direct `db.<ref>.supabase.co`
host — the direct host has the hard 60-connection ceiling above; the pooler
does not:

```
postgres://postgres.<project-ref>:[password]@aws-0-<region>.pooler.supabase.com:6543/postgres
```

(Get the exact string — with password — from Supabase Dashboard → Project
Settings → Database → Connection string → "Transaction" mode.)

### Hot-path indexes (migration `20260718_hot_path_indexes.sql`)

The performance advisor flagged 36 foreign keys without a covering index.
This migration (applied to production) adds covering indexes on the ones
actually on request-per-session query paths: `sp_policy_orders.client_id` /
`.insurer_id`, `sp_notifications.agent_id`, `sp_claims.user_id` / `.policy_id`,
`sp_wallet_transactions.agent_id`, `sp_withdrawals.agent_id`,
`sp_commissions.policy_id`, `sp_users.upline_id`, `sp_quotes.client_id`,
`sp_policies.user_id`. Cold audit-trail FKs (approver ids, `created_by`) were
intentionally skipped — they're not on any hot path. Also drops a duplicate
index the advisor flagged on `sp_agent_agreements`.

At current data volume every table is small enough that Postgres correctly
chooses a sequential scan over these indexes (confirmed via `EXPLAIN
ANALYZE` — 0.17ms either way). The indexes are there for when the tables
grow past the planner's seq-scan threshold; nothing to tune today.

## Caching (`services/publicCache.ts`)

A small TTL cache (in-memory + `localStorage`, stale-while-revalidate) now
sits in front of the handful of **public, read-heavy, rarely-changing**
queries every visitor triggers on page load:

- `fetchWebsiteSection` (`sp_website_config`) — 5 min TTL. Admin saves via
  `upsertWebsiteSection`/`resetWebsiteSection` invalidate immediately.
- `getActiveOjkRateSet` (`sp_ojk_rate_sets`) — 10 min TTL, read once per app
  boot in `App.tsx`. `activateOjkRateSet` invalidates immediately.

This is deliberately **not** used for anything per-user or sensitive — all
authenticated/financial reads still go through `callGateway` with no
client-side caching, per the data-gateway trust model.

## Load testing

### What was verified directly (from the environment that wrote this)

The sandbox that authored this cannot reach `myinsurepath.com` or
`*.supabase.co` (egress policy) — so the following were run against a local
`vite build && vite preview` copy of the exact same code, and against the
real production database via the Supabase MCP connection (which bypasses
the network egress block):

- **Static frontend**: `autocannon`, 100 concurrent connections × 20s against
  the homepage → **3,340 req/s average, p99 latency 60ms, 0 errors** out of
  66,780 requests. The SPA shell serves comfortably past 100 concurrent
  users.
- **DB read capacity**: 100–200 iterations of the query shapes behind
  `get_my_orders`/`admin_list_orders` (owner-id OR-filter + join), executed
  back-to-back → sub-millisecond per query (0.17ms via `EXPLAIN ANALYZE`).
  Not a bottleneck at any realistic concurrency for the current data volume.

Neither of those exercises the full real path: Supabase Auth signup,
`data-gateway` cold starts, and rate limiting can only be observed by
actually hitting the live endpoints.

### `tests/load/k6-100-users.js` — run this yourself

A k6 script that simulates 100 ramping virtual users each doing: load the
homepage → sign up (real Supabase Auth call) → `ensure_profile` →
`get_my_profile` → browse `/products`. **This creates real accounts** if
pointed at production — see the file header for full details, the rate-limit
caveat (data-gateway's 60 req/hour-per-IP limiter will kick in around VU
60 from a single test machine — that's the security control working, not a
bug), and the cleanup step.

```bash
# Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

k6 run \
  -e BASE_URL=https://myinsurepath.com \
  -e SUPABASE_URL=https://uyjgeteelnswphyzkjwi.supabase.co \
  -e SUPABASE_ANON_KEY=<the VITE_SUPABASE_ANON_KEY value — public, safe to pass> \
  tests/load/k6-100-users.js

# Smaller smoke test first:
k6 run -e VUS=10 -e DURATION=30s -e BASE_URL=... -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... tests/load/k6-100-users.js
```

After running against production, clean up the synthetic accounts with
`tests/load/cleanup-loadtest-accounts.sql` (matches the
`loadtest_k6_*@loadtest.invalid` email pattern the script uses — nothing
else matches that pattern).
