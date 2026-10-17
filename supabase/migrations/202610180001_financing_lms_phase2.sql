-- Financing Core phase 2: loan servicing foundation + isolated public sandbox.
-- Existing sp_financing_* phase-1 tables and RPCs are retained; no duplicate core schema is created.
create extension if not exists pgcrypto;

create table if not exists public.sp_financing_credit_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.sp_financing_applications(id) on delete restrict,
  decision text not null check (decision in ('APPROVED','DECLINED','REFERRED')),
  score integer check (score between 0 and 100),
  rationale text not null check (length(trim(rationale)) between 3 and 1000),
  policy_version text not null default 'pilot-v1',
  decided_by uuid not null references auth.users(id),
  second_approver uuid references auth.users(id),
  decided_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (second_approver is null or second_approver <> decided_by)
);
create index if not exists sp_financing_credit_decisions_application_idx
  on public.sp_financing_credit_decisions(application_id, decided_at desc);

create table if not exists public.sp_financing_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.sp_financing_applications(id) on delete restrict,
  contract_number text not null unique,
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_SIGNATURE','SIGNED','CANCELLED')),
  principal_amount numeric(20,2) not null check (principal_amount > 0),
  annual_rate numeric(9,6) not null check (annual_rate >= 0),
  tenor_months integer not null check (tenor_months between 1 and 240),
  terms_version text not null,
  signed_at timestamptz,
  external_signature_ref text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_loan_accounts (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.sp_financing_contracts(id) on delete restrict,
  account_number text not null unique,
  principal_amount numeric(20,2) not null check (principal_amount > 0),
  outstanding_principal numeric(20,2) not null check (outstanding_principal between 0 and principal_amount),
  currency char(3) not null default 'IDR' check (currency = 'IDR'),
  status text not null default 'PENDING_DISBURSEMENT' check (status in ('PENDING_DISBURSEMENT','ACTIVE','CLOSED','RESTRUCTURED','WRITTEN_OFF')),
  disbursed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sp_financing_disbursement_requests (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.sp_financing_loan_accounts(id) on delete restrict,
  amount numeric(20,2) not null check (amount > 0),
  beneficiary_ref text not null check (length(trim(beneficiary_ref)) between 3 and 160),
  status text not null default 'PENDING_APPROVAL' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','SUBMITTED','SETTLED','FAILED','CANCELLED')),
  maker_user_id uuid not null references auth.users(id),
  checker_user_id uuid references auth.users(id),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (checker_user_id is null or checker_user_id <> maker_user_id),
  unique (idempotency_key)
);

create table if not exists public.sp_financing_repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.sp_financing_loan_accounts(id) on delete restrict,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  principal_due numeric(20,2) not null default 0 check (principal_due >= 0),
  interest_due numeric(20,2) not null default 0 check (interest_due >= 0),
  fees_due numeric(20,2) not null default 0 check (fees_due >= 0),
  amount_paid numeric(20,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'UPCOMING' check (status in ('UPCOMING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_account_id, installment_number)
);
create index if not exists sp_financing_schedule_due_idx
  on public.sp_financing_repayment_schedules(due_date, status);

create table if not exists public.sp_financing_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.sp_financing_loan_accounts(id) on delete restrict,
  amount numeric(20,2) not null check (amount > 0),
  currency char(3) not null default 'IDR' check (currency = 'IDR'),
  payment_date timestamptz not null default now(),
  channel text not null check (length(trim(channel)) between 2 and 60),
  external_reference text,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  status text not null default 'RECEIVED' check (status in ('RECEIVED','ALLOCATED','REVERSED','FAILED')),
  received_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.sp_financing_collection_cases (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.sp_financing_loan_accounts(id) on delete restrict,
  severity text not null default 'NORMAL' check (severity in ('NORMAL','WATCH','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','CONTACTED','PROMISE_TO_PAY','ESCALATED','RESOLVED')),
  assigned_to uuid references auth.users(id),
  promise_to_pay_date date,
  last_contact_at timestamptz,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Isolated sandbox records. Public sandbox writes never touch real financing tables.
create table if not exists public.sp_financing_demo_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  customer_name text not null check (length(trim(customer_name)) between 2 and 160),
  customer_type text not null check (customer_type in ('INDIVIDUAL','BUSINESS')),
  product_code text not null check (product_code in ('MOTOR_VEHICLE','MULTIPURPOSE','HEAVY_EQUIPMENT','WORKING_CAPITAL')),
  requested_amount numeric(20,2) not null check (requested_amount > 0 and requested_amount <= 100000000000),
  tenor_months integer not null check (tenor_months between 1 and 240),
  purpose text not null default '' check (length(purpose) <= 500),
  status text not null default 'NEW' check (status in ('NEW','SUBMITTED','DOCUMENTS_PENDING','VERIFICATION','CREDIT_REVIEW','REFERRED','APPROVED','DECLINED','OFFERED','CONTRACTED','BOOKED','CANCELLED')),
  credit_score integer check (credit_score between 0 and 100),
  decision_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);
create index if not exists sp_financing_demo_applications_created_idx
  on public.sp_financing_demo_applications(created_at desc);

create table if not exists public.sp_financing_demo_audit_events (
  id bigint generated always as identity primary key,
  action text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- No direct client access. The edge function is the only supported API boundary.
do $$
declare t text;
begin
  foreach t in array array[
    'sp_financing_credit_decisions','sp_financing_contracts','sp_financing_loan_accounts',
    'sp_financing_disbursement_requests','sp_financing_repayment_schedules','sp_financing_repayments',
    'sp_financing_collection_cases','sp_financing_demo_applications','sp_financing_demo_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

create or replace function public.sp_financing_record_credit_decision(
  p_user_id uuid,
  p_application_id uuid,
  p_expected_version integer,
  p_decision text,
  p_score integer,
  p_rationale text,
  p_policy_version text,
  p_correlation_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_app public.sp_financing_applications%rowtype;
  v_target text;
  v_decision public.sp_financing_credit_decisions%rowtype;
begin
  if p_user_id is null then raise exception 'actor_required'; end if;
  if p_decision not in ('APPROVED','DECLINED','REFERRED') then raise exception 'invalid_decision'; end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then raise exception 'invalid_score'; end if;
  if length(trim(coalesce(p_rationale,''))) < 3 or length(p_rationale) > 1000 then raise exception 'rationale_required'; end if;
  select * into v_app from public.sp_financing_applications where id=p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if v_app.status <> 'CREDIT_REVIEW' then raise exception 'application_not_in_credit_review'; end if;
  v_target := p_decision;
  update public.sp_financing_applications set status=v_target, version=version+1, updated_at=now()
    where id=p_application_id and version=p_expected_version returning * into v_app;
  insert into public.sp_financing_credit_decisions(application_id,decision,score,rationale,policy_version,decided_by)
    values (p_application_id,p_decision,p_score,trim(p_rationale),coalesce(nullif(p_policy_version,''),'pilot-v1'),p_user_id)
    returning * into v_decision;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'CREDIT_DECISION_RECORDED','financing_application',p_application_id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('decision',p_decision,'score',p_score,'status',v_app.status,'version',v_app.version));
  return jsonb_build_object('id',v_app.id,'application_number',v_app.application_number,'status',v_app.status,
    'version',v_app.version,'decision_id',v_decision.id,'decision',v_decision.decision);
end;
$function$;

revoke all on function public.sp_financing_record_credit_decision(uuid,uuid,integer,text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.sp_financing_record_credit_decision(uuid,uuid,integer,text,integer,text,text,text) to service_role;

-- Identity-backed demo audit inserts need sequence privileges for service_role.
grant usage, select on sequence public.sp_financing_demo_audit_events_id_seq to service_role;
