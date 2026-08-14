-- ═══════════════════════════════════════════════════════════════════════════
-- SurePath Public API — key store, request log, idempotency, webhook outbox
-- v1.55.0 (2026-08-12)
--
-- Backs two new edge functions:
--   partner-api  — embedded-insurance REST API for distribution partners
--   insurer-api  — machine-to-machine REST API for partner insurers
--
-- Both authenticate with an API key (never a Supabase JWT). The plaintext key
-- is shown exactly once at creation; only its SHA-256 hash is stored here, so
-- a database leak does not yield usable credentials.
--
-- Every table below is deny-all (RLS enabled, zero policies) — reachable only
-- through the edge functions' service_role client, same rule as sp_policy_orders.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. API keys ────────────────────────────────────────────────────────────
create table if not exists public.sp_api_keys (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  key_type            text not null default 'PARTNER',
  environment         text not null default 'live',
  -- Display-only fingerprint, e.g. "sp_live_9f2ac1b4" — safe to render in the CMS.
  key_prefix          text not null,
  -- SHA-256 hex of the full plaintext key. The plaintext is never stored.
  key_hash            text not null,
  scopes              text[] not null default '{}',
  -- PARTNER keys act as an agent: orders they create are attributed to this
  -- sp_users row so commission, wallet and tier logic keep working unchanged.
  agent_id            uuid references public.sp_users(id) on delete restrict,
  -- INSURER keys are scoped to exactly one insurer's order book.
  insurer_id          uuid references public.sp_insurers(id) on delete restrict,
  rate_limit_per_hour integer not null default 1000,
  webhook_url         text,
  webhook_secret      text,
  -- Optional source-IP allowlist (exact matches against x-forwarded-for).
  allowed_ips         text[],
  is_active           boolean not null default true,
  last_used_at        timestamptz,
  expires_at          timestamptz,
  revoked_at          timestamptz,
  revoked_reason      text,
  created_by          uuid,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint sp_api_keys_type_chk  check (key_type in ('PARTNER', 'INSURER')),
  constraint sp_api_keys_env_chk   check (environment in ('live', 'test')),
  constraint sp_api_keys_rate_chk  check (rate_limit_per_hour between 1 and 100000),
  constraint sp_api_keys_owner_chk check (
    (key_type = 'PARTNER' and agent_id  is not null) or
    (key_type = 'INSURER' and insurer_id is not null)
  )
);

create unique index if not exists sp_api_keys_hash_uidx    on public.sp_api_keys (key_hash);
create index        if not exists sp_api_keys_agent_idx    on public.sp_api_keys (agent_id)   where key_type = 'PARTNER';
create index        if not exists sp_api_keys_insurer_idx  on public.sp_api_keys (insurer_id) where key_type = 'INSURER';
create index        if not exists sp_api_keys_active_idx   on public.sp_api_keys (is_active)  where is_active;

comment on table  public.sp_api_keys is 'Public API credentials (partner + insurer). Hash-only; plaintext shown once at creation.';
comment on column public.sp_api_keys.key_hash is 'SHA-256 hex of the plaintext key. Lookup is by hash — the plaintext is never persisted.';

-- ─── 2. Request log (append-only audit trail) ───────────────────────────────
create table if not exists public.sp_api_requests (
  id              uuid primary key default gen_random_uuid(),
  api_key_id      uuid references public.sp_api_keys(id) on delete set null,
  key_type        text,
  request_id      text not null,
  method          text not null,
  path            text not null,
  status_code     integer not null,
  duration_ms     integer,
  error_code      text,
  idempotency_key text,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists sp_api_requests_key_idx     on public.sp_api_requests (api_key_id, created_at desc);
create index if not exists sp_api_requests_created_idx on public.sp_api_requests (created_at desc);

comment on table public.sp_api_requests is 'Append-only access log for the public API. One row per request, including rejected ones.';

-- ─── 3. Idempotency records ─────────────────────────────────────────────────
-- POST endpoints accept an Idempotency-Key header. The first call stores its
-- response here; replays within the TTL return the stored response verbatim
-- instead of creating a second order/invoice.
create table if not exists public.sp_api_idempotency (
  id              uuid primary key default gen_random_uuid(),
  api_key_id      uuid not null references public.sp_api_keys(id) on delete cascade,
  idempotency_key text not null,
  endpoint        text not null,
  -- SHA-256 of the request body: replaying the same key with a *different*
  -- body is a client bug and must fail loudly (409) rather than silently
  -- returning the first response.
  request_hash    text not null,
  status_code     integer not null,
  response_body   jsonb   not null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours')
);

create unique index if not exists sp_api_idempotency_uidx    on public.sp_api_idempotency (api_key_id, idempotency_key);
create index        if not exists sp_api_idempotency_exp_idx on public.sp_api_idempotency (expires_at);

-- ─── 4. Webhook outbox ──────────────────────────────────────────────────────
create table if not exists public.sp_api_webhook_deliveries (
  id               uuid primary key default gen_random_uuid(),
  api_key_id       uuid not null references public.sp_api_keys(id) on delete cascade,
  event            text not null,
  payload          jsonb not null default '{}'::jsonb,
  order_id         uuid,
  status           text not null default 'PENDING',
  attempts         integer not null default 0,
  max_attempts     integer not null default 6,
  next_attempt_at  timestamptz not null default now(),
  last_status_code integer,
  last_error       text,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  constraint sp_api_webhook_status_chk check (status in ('PENDING', 'DELIVERED', 'FAILED'))
);

create index if not exists sp_api_webhook_pending_idx on public.sp_api_webhook_deliveries (next_attempt_at)
  where status = 'PENDING';
create index if not exists sp_api_webhook_key_idx     on public.sp_api_webhook_deliveries (api_key_id, created_at desc);

comment on table public.sp_api_webhook_deliveries is 'Outbox for partner/insurer webhooks. Rows are enqueued by DB triggers and drained by the partner-api edge function.';

-- ─── 5. RLS: deny-all on every table above ──────────────────────────────────
-- No policies are created, so PostgREST (anon/authenticated) can read nothing.
-- The edge functions use service_role, which bypasses RLS.
alter table public.sp_api_keys                enable row level security;
alter table public.sp_api_requests            enable row level security;
alter table public.sp_api_idempotency         enable row level security;
alter table public.sp_api_webhook_deliveries  enable row level security;

revoke all on public.sp_api_keys               from anon, authenticated;
revoke all on public.sp_api_requests           from anon, authenticated;
revoke all on public.sp_api_idempotency        from anon, authenticated;
revoke all on public.sp_api_webhook_deliveries from anon, authenticated;

-- ─── 6. Webhook enqueue helper ──────────────────────────────────────────────
-- Fans an event out to every active, webhook-configured key that should see it:
--   • the PARTNER key(s) whose agent_id owns the order
--   • the INSURER key(s) for the insurer the order is assigned to
-- Deliberately SECURITY DEFINER + exception-swallowing: a webhook problem must
-- never roll back the order/payment write that triggered it.
create or replace function public.sp_api_enqueue_webhook(
  p_event    text,
  p_order_id uuid,
  p_agent_id uuid,
  p_insurer_id uuid,
  p_payload  jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sp_api_webhook_deliveries (api_key_id, event, payload, order_id)
  select k.id, p_event, p_payload, p_order_id
  from public.sp_api_keys k
  where k.is_active
    and k.revoked_at is null
    and k.webhook_url is not null
    and (k.expires_at is null or k.expires_at > now())
    and (
      (k.key_type = 'PARTNER' and p_agent_id   is not null and k.agent_id   = p_agent_id) or
      (k.key_type = 'INSURER' and p_insurer_id is not null and k.insurer_id = p_insurer_id)
    );
exception when others then
  -- Never let webhook fan-out break the originating transaction.
  raise warning 'sp_api_enqueue_webhook failed for event %: %', p_event, sqlerrm;
end;
$$;

revoke all on function public.sp_api_enqueue_webhook(text, uuid, uuid, uuid, jsonb) from anon, authenticated;

-- ─── 7. Triggers: orders ────────────────────────────────────────────────────
create or replace function public.sp_api_orders_webhook_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.sp_api_enqueue_webhook(
      'order.created', new.id, new.agent_id, new.insurer_id,
      jsonb_build_object(
        'order_id', new.id, 'order_number', new.order_number,
        'status', new.status, 'total_premium', new.total_premium,
        'product_code', new.product_code, 'insurer_id', new.insurer_id
      )
    );
  elsif new.status is distinct from old.status then
    perform public.sp_api_enqueue_webhook(
      'order.status_changed', new.id, new.agent_id, new.insurer_id,
      jsonb_build_object(
        'order_id', new.id, 'order_number', new.order_number,
        'status', new.status, 'previous_status', old.status,
        'policy_number', new.policy_number, 'insurer_id', new.insurer_id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sp_api_orders_webhook on public.sp_policy_orders;
create trigger sp_api_orders_webhook
  after insert or update of status on public.sp_policy_orders
  for each row execute function public.sp_api_orders_webhook_trg();

-- ─── 8. Triggers: payments ──────────────────────────────────────────────────
create or replace function public.sp_api_payments_webhook_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id   uuid;
  v_insurer_id uuid;
  v_event      text;
begin
  if tg_op = 'INSERT' then
    v_event := 'payment.created';
  elsif new.status = 'PAID' and old.status is distinct from 'PAID' then
    v_event := 'payment.paid';
  else
    return new;
  end if;

  select o.agent_id, o.insurer_id into v_agent_id, v_insurer_id
  from public.sp_policy_orders o where o.id = new.order_id;

  perform public.sp_api_enqueue_webhook(
    v_event, new.order_id, v_agent_id, v_insurer_id,
    jsonb_build_object(
      'payment_id', new.id, 'order_id', new.order_id,
      'status', new.status, 'amount', new.amount,
      'paid_amount', new.paid_amount, 'paid_at', new.paid_at,
      'external_id', new.external_id
    )
  );
  return new;
end;
$$;

drop trigger if exists sp_api_payments_webhook on public.sp_payments;
create trigger sp_api_payments_webhook
  after insert or update of status on public.sp_payments
  for each row execute function public.sp_api_payments_webhook_trg();

-- ─── 9. Retention helper ────────────────────────────────────────────────────
-- Called opportunistically by the edge functions; safe to also run from cron.
create or replace function public.sp_api_gc()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sp_api_idempotency where expires_at < now();
  delete from public.sp_api_requests    where created_at < now() - interval '90 days';
  delete from public.sp_api_webhook_deliveries
    where status <> 'PENDING' and created_at < now() - interval '30 days';
end;
$$;

revoke all on function public.sp_api_gc() from anon, authenticated;
