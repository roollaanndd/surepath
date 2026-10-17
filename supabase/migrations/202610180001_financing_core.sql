-- SurePath Financing Core v1
-- Apply through Supabase migrations. Financial operations are intentionally disabled until a licensed partner configures approval controls and integrations.
create extension if not exists pgcrypto;

create table if not exists public.financing_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'pilot' check (status in ('pilot','active','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.financing_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('motor_vehicle','multipurpose','heavy_equipment','working_capital','other')),
  currency char(3) not null default 'IDR',
  min_amount numeric(20,2) not null default 1000000 check (min_amount > 0),
  max_amount numeric(20,2) not null default 100000000000 check (max_amount >= min_amount),
  tenor_min_months integer not null default 1 check (tenor_min_months > 0),
  tenor_max_months integer not null default 60 check (tenor_max_months >= tenor_min_months),
  annual_rate numeric(9,6),
  fee_config jsonb not null default '{}'::jsonb,
  eligibility_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.financing_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  customer_type text not null check (customer_type in ('individual','business')),
  display_name text not null,
  external_ref text,
  masked_identity_ref text,
  contact_metadata jsonb not null default '{}'::jsonb,
  consent_record jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, external_ref)
);

create table if not exists public.financing_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  application_number text not null,
  customer_id uuid not null references public.financing_customers(id),
  product_id uuid not null references public.financing_products(id),
  requested_amount numeric(20,2) not null check (requested_amount > 0),
  tenor_months integer not null check (tenor_months > 0),
  purpose text,
  status text not null default 'new' check (status in ('new','documents_pending','documents_verified','credit_review','approved','rejected','offer_prepared','contract_pending','contract_signed','disbursement_pending','active','withdrawn')),
  source_channel text not null default 'manual',
  assigned_to uuid,
  submitted_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, application_number)
);
create index if not exists financing_applications_tenant_status_idx on public.financing_applications (tenant_id, status, submitted_at desc);

create table if not exists public.financing_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  application_id uuid not null references public.financing_applications(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_by uuid,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.financing_credit_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  application_id uuid not null references public.financing_applications(id) on delete cascade,
  decision text not null check (decision in ('approve','reject','refer')),
  score integer check (score between 0 and 100),
  rationale text not null,
  policy_version text not null,
  decided_by uuid not null,
  second_approver uuid,
  decided_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (second_approver is null or second_approver <> decided_by)
);

create table if not exists public.financing_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  application_id uuid not null unique references public.financing_applications(id),
  contract_number text not null,
  status text not null default 'draft' check (status in ('draft','pending_signature','signed','cancelled')),
  principal_amount numeric(20,2) not null check (principal_amount > 0),
  annual_rate numeric(9,6) not null check (annual_rate >= 0),
  tenor_months integer not null check (tenor_months > 0),
  terms_version text not null,
  signed_at timestamptz,
  external_signature_ref text,
  created_at timestamptz not null default now(),
  unique (tenant_id, contract_number)
);

create table if not exists public.financing_loan_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  contract_id uuid not null unique references public.financing_contracts(id),
  account_number text not null,
  principal_amount numeric(20,2) not null check (principal_amount > 0),
  outstanding_principal numeric(20,2) not null check (outstanding_principal >= 0),
  currency char(3) not null default 'IDR',
  status text not null default 'pending_disbursement' check (status in ('pending_disbursement','active','closed','restructured','written_off')),
  disbursed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, account_number)
);

create table if not exists public.financing_disbursements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  loan_account_id uuid not null references public.financing_loan_accounts(id),
  amount numeric(20,2) not null check (amount > 0),
  beneficiary_ref text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','submitted','settled','failed','cancelled')),
  maker_id uuid not null,
  checker_id uuid,
  idempotency_key text not null,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (checker_id is null or checker_id <> maker_id),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.financing_repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  loan_account_id uuid not null references public.financing_loan_accounts(id),
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  principal_due numeric(20,2) not null default 0 check (principal_due >= 0),
  interest_due numeric(20,2) not null default 0 check (interest_due >= 0),
  fees_due numeric(20,2) not null default 0 check (fees_due >= 0),
  amount_paid numeric(20,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'upcoming' check (status in ('upcoming','partially_paid','paid','overdue','waived')),
  unique (loan_account_id, installment_number)
);

create table if not exists public.financing_repayments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  loan_account_id uuid not null references public.financing_loan_accounts(id),
  amount numeric(20,2) not null check (amount > 0),
  currency char(3) not null default 'IDR',
  payment_date timestamptz not null default now(),
  channel text not null,
  external_reference text,
  idempotency_key text not null,
  status text not null default 'received' check (status in ('received','allocated','reversed','failed')),
  received_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.financing_collection_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  loan_account_id uuid not null references public.financing_loan_accounts(id),
  severity text not null default 'normal' check (severity in ('normal','watch','high','critical')),
  status text not null default 'open' check (status in ('open','contacted','promise_to_pay','escalated','resolved')),
  assigned_to uuid,
  promise_to_pay_date date,
  last_contact_at timestamptz,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financing_audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.financing_tenants(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists financing_audit_tenant_time_idx on public.financing_audit_events (tenant_id, created_at desc);

-- Tenant RLS. The API also validates tenant + role before every privileged operation.
do $$
declare t text;
begin
  foreach t in array array['financing_products','financing_customers','financing_applications','financing_documents','financing_credit_decisions','financing_contracts','financing_loan_accounts','financing_disbursements','financing_repayment_schedules','financing_repayments','financing_collection_cases','financing_audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists financing_tenant_isolation on public.%I', t);
    execute format('create policy financing_tenant_isolation on public.%I using (tenant_id::text = (auth.jwt() -> ''app_metadata'' ->> ''financing_tenant_id'')) with check (tenant_id::text = (auth.jwt() -> ''app_metadata'' ->> ''financing_tenant_id''))', t);
  end loop;
end $$;

-- Seed only product definitions for the synthetic demo tenant; no customer records or financial transactions.
insert into public.financing_tenants (id, name, slug, status)
values ('f1000000-0000-4000-8000-000000000001', 'SurePath Financing Sandbox', 'surepath-financing-sandbox', 'pilot')
on conflict (slug) do nothing;

insert into public.financing_products (tenant_id, code, name, category, min_amount, max_amount, tenor_min_months, tenor_max_months, active)
values
('f1000000-0000-4000-8000-000000000001','MOTOR','Motor Vehicle Financing','motor_vehicle',10000000,2000000000,6,60,true),
('f1000000-0000-4000-8000-000000000001','MULTI','Multipurpose Financing','multipurpose',5000000,500000000,3,48,true),
('f1000000-0000-4000-8000-000000000001','HEAVY','Heavy Equipment Financing','heavy_equipment',50000000,20000000000,12,60,true),
('f1000000-0000-4000-8000-000000000001','WORKING_CAPITAL','Working Capital Financing','working_capital',10000000,10000000000,1,36,true)
on conflict (tenant_id, code) do nothing;
