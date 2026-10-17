-- Additive, isolated schema for SurePath Multifinance Phase 1.
-- No existing insurance tables or policies are modified.
create table if not exists public.sp_financing_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('FINANCING_ADMIN','ORIGINATION','VERIFICATION_ANALYST','CREDIT_ANALYST','CREDIT_APPROVER','CONTRACT_OFFICER','DISBURSEMENT_MAKER','DISBURSEMENT_CHECKER','SERVICING_FINANCE','COLLECTIONS','AUDITOR','COMPLIANCE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('MOTOR_VEHICLE','MULTIPURPOSE','HEAVY_EQUIPMENT','WORKING_CAPITAL')),
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_customers (
  id uuid primary key default gen_random_uuid(),
  customer_type text not null check (customer_type in ('INDIVIDUAL','BUSINESS')),
  display_name text not null check (length(trim(display_name)) between 2 and 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  customer_id uuid not null references public.sp_financing_customers(id),
  product_id uuid not null references public.sp_financing_products(id),
  requested_amount numeric(18,2) not null check (requested_amount > 0),
  currency char(3) not null default 'IDR' check (currency = 'IDR'),
  requested_tenor_months integer not null check (requested_tenor_months between 1 and 240),
  status text not null default 'NEW' check (status in ('NEW','SUBMITTED','DOCUMENTS_PENDING','VERIFICATION','CREDIT_REVIEW','REFERRED','APPROVED','DECLINED','OFFERED','CONTRACTED','BOOKED','CANCELLED')),
  source_channel text not null default 'DIRECT' check (source_channel in ('DIRECT','DEALER','MERCHANT','PARTNER','MANUAL')),
  notes text not null default '' check (length(notes) <= 2000),
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  correlation_id text not null,
  outcome text not null check (outcome in ('SUCCESS','DENIED','FAILURE')),
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 8192),
  created_at timestamptz not null default now()
);

create table if not exists public.sp_financing_idempotency (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  request_hash text not null,
  response_body jsonb,
  status_code integer,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists sp_financing_applications_created_idx on public.sp_financing_applications (created_at desc);
create index if not exists sp_financing_applications_status_idx on public.sp_financing_applications (status, created_at desc);
create index if not exists sp_financing_applications_customer_idx on public.sp_financing_applications (customer_id);
create index if not exists sp_financing_audit_created_idx on public.sp_financing_audit_events (created_at desc);
create index if not exists sp_financing_audit_entity_idx on public.sp_financing_audit_events (entity_type, entity_id, created_at desc);
create index if not exists sp_financing_idempotency_created_idx on public.sp_financing_idempotency (created_at);

insert into public.sp_financing_products (code, name, description)
values
 ('MOTOR_VEHICLE', 'Motor Vehicle Financing', 'New and used vehicle financing'),
 ('MULTIPURPOSE', 'Multipurpose Financing', 'Secured or unsecured multipurpose financing'),
 ('HEAVY_EQUIPMENT', 'Heavy Equipment Financing', 'Asset-backed equipment financing'),
 ('WORKING_CAPITAL', 'Working Capital Financing', 'SME cash-flow and working capital financing')
on conflict (code) do nothing;

alter table public.sp_financing_user_roles enable row level security;
alter table public.sp_financing_products enable row level security;
alter table public.sp_financing_customers enable row level security;
alter table public.sp_financing_applications enable row level security;
alter table public.sp_financing_audit_events enable row level security;
alter table public.sp_financing_idempotency enable row level security;

-- All access is mediated by the authenticated Edge Function using service role.
-- Client roles must not access these tables directly.
revoke all on public.sp_financing_user_roles from anon, authenticated;
revoke all on public.sp_financing_products from anon, authenticated;
revoke all on public.sp_financing_customers from anon, authenticated;
revoke all on public.sp_financing_applications from anon, authenticated;
revoke all on public.sp_financing_audit_events from anon, authenticated;
revoke all on public.sp_financing_idempotency from anon, authenticated;
grant all on public.sp_financing_user_roles to service_role;
grant all on public.sp_financing_products to service_role;
grant all on public.sp_financing_customers to service_role;
grant all on public.sp_financing_applications to service_role;
grant all on public.sp_financing_audit_events to service_role;
grant all on public.sp_financing_idempotency to service_role;
