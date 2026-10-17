-- Phase 3 foundation: multi-provider registry and privacy-conscious request ledger.
-- No provider is activated and no vendor credentials are stored in Postgres.
create table if not exists public.sp_financing_partner_providers (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null check (provider_code ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  provider_name text not null check (length(trim(provider_name)) between 2 and 120),
  capability text not null check (capability in ('IDENTITY_VERIFICATION','CREDIT_BUREAU','SLIK','DOCUMENT_VERIFICATION','VEHICLE_VALUATION')),
  environment text not null check (environment in ('SANDBOX','PRODUCTION')),
  status text not null default 'DRAFT' check (status in ('DRAFT','CONFIGURED','SANDBOX_TESTED','LIVE_APPROVED','PAUSED')),
  endpoint_base_url text,
  secret_env_key text check (secret_env_key is null or secret_env_key ~ '^[A-Z][A-Z0-9_]{2,79}$'),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_code, environment),
  check (endpoint_base_url is null or endpoint_base_url ~ '^https://[^[:space:]]+$')
);

create table if not exists public.sp_financing_partner_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.sp_financing_partner_providers(id),
  application_id uuid references public.sp_financing_applications(id),
  operation text not null check (operation ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  request_hash text not null check (length(request_hash) = 64),
  status text not null default 'PREPARED' check (status in ('PREPARED','SUCCEEDED','FAILED','BLOCKED')),
  external_reference text,
  response_code integer,
  response_summary jsonb not null default '{}'::jsonb check (pg_column_size(response_summary) <= 8192),
  error_code text,
  correlation_id text not null,
  requested_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_id, idempotency_key)
);
create index if not exists sp_financing_partner_requests_app_idx
  on public.sp_financing_partner_requests(application_id, created_at desc);
create index if not exists sp_financing_partner_requests_provider_idx
  on public.sp_financing_partner_requests(provider_id, status, created_at desc);

alter table public.sp_financing_partner_providers enable row level security;
alter table public.sp_financing_partner_requests enable row level security;
revoke all on public.sp_financing_partner_providers from anon, authenticated;
revoke all on public.sp_financing_partner_requests from anon, authenticated;
grant all on public.sp_financing_partner_providers to service_role;
grant all on public.sp_financing_partner_requests to service_role;

create or replace function public.sp_financing_upsert_partner_provider(
  p_user_id uuid,
  p_provider_code text,
  p_provider_name text,
  p_capability text,
  p_environment text,
  p_endpoint_base_url text,
  p_secret_env_key text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_provider public.sp_financing_partner_providers%rowtype;
  v_status text;
begin
  if not exists (
    select 1 from public.sp_financing_user_roles
    where user_id = p_user_id and active = true and role = 'FINANCING_ADMIN'
  ) then raise exception 'financing_admin_required'; end if;
  if p_provider_code is null or p_provider_code !~ '^[A-Z][A-Z0-9_]{1,39}$'
    or length(trim(coalesce(p_provider_name,''))) < 2 or length(p_provider_name) > 120
    or p_capability not in ('IDENTITY_VERIFICATION','CREDIT_BUREAU','SLIK','DOCUMENT_VERIFICATION','VEHICLE_VALUATION')
    or p_environment not in ('SANDBOX','PRODUCTION')
    or (p_endpoint_base_url is not null and p_endpoint_base_url !~ '^https://[^[:space:]]+$')
    or (p_secret_env_key is not null and p_secret_env_key !~ '^[A-Z][A-Z0-9_]{2,79}$') then
    raise exception 'invalid_partner_configuration';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_provider_code || ':' || p_environment)::bigint);
  v_status := case when p_endpoint_base_url is not null and p_secret_env_key is not null then 'CONFIGURED' else 'DRAFT' end;
  insert into public.sp_financing_partner_providers(
    provider_code, provider_name, capability, environment, status, endpoint_base_url,
    secret_env_key, created_by, updated_by
  ) values (
    p_provider_code, trim(p_provider_name), p_capability, p_environment, v_status, p_endpoint_base_url,
    p_secret_env_key, p_user_id, p_user_id
  )
  on conflict (provider_code, environment) do update set
    provider_name = excluded.provider_name,
    capability = excluded.capability,
    status = excluded.status,
    endpoint_base_url = excluded.endpoint_base_url,
    secret_env_key = excluded.secret_env_key,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into v_provider;
  insert into public.sp_financing_audit_events(actor_user_id, action, entity_type, entity_id, correlation_id, outcome, details)
    values (p_user_id, 'PARTNER_PROVIDER_CONFIGURED', 'financing_partner_provider', v_provider.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text), 'SUCCESS',
      jsonb_build_object('provider_code',v_provider.provider_code,'capability',v_provider.capability,
        'environment',v_provider.environment,'status',v_provider.status,
        'endpoint_configured',v_provider.endpoint_base_url is not null,'secret_env_key_configured',v_provider.secret_env_key is not null));
  return jsonb_build_object('id',v_provider.id,'provider_code',v_provider.provider_code,'provider_name',v_provider.provider_name,
    'capability',v_provider.capability,'environment',v_provider.environment,'status',v_provider.status,
    'endpoint_configured',v_provider.endpoint_base_url is not null,'secret_env_key_configured',v_provider.secret_env_key is not null,
    'created_at',v_provider.created_at,'updated_at',v_provider.updated_at);
end;
$$;
revoke all on function public.sp_financing_upsert_partner_provider(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.sp_financing_upsert_partner_provider(uuid,text,text,text,text,text,text,text) to service_role;
