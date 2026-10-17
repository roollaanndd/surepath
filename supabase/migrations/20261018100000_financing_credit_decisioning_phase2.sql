-- Phase 2: versioned underwriting rules and auditable affordability assessments.
-- Rules are intentionally not seeded: the financing company must approve real policy values.
create table if not exists public.sp_financing_product_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.sp_financing_products(id),
  version integer not null check (version > 0),
  active boolean not null default true,
  min_amount numeric(18,2) not null check (min_amount > 0),
  max_amount numeric(18,2) not null check (max_amount >= min_amount and max_amount <= 100000000000),
  min_tenor_months integer not null check (min_tenor_months between 1 and 240),
  max_tenor_months integer not null check (max_tenor_months between min_tenor_months and 240),
  annual_interest_rate_pct numeric(7,4) not null check (annual_interest_rate_pct >= 0 and annual_interest_rate_pct <= 100),
  max_dti_pct numeric(5,2) not null check (max_dti_pct > 0 and max_dti_pct <= 100),
  min_monthly_income numeric(18,2) not null check (min_monthly_income >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(product_id, version)
);
create unique index if not exists sp_financing_product_rules_one_active
  on public.sp_financing_product_rules(product_id) where active = true;

create table if not exists public.sp_financing_credit_assessments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.sp_financing_applications(id),
  product_rule_id uuid not null references public.sp_financing_product_rules(id),
  rule_version integer not null check (rule_version > 0),
  assessor_user_id uuid not null references auth.users(id),
  monthly_income numeric(18,2) not null check (monthly_income > 0),
  existing_monthly_obligations numeric(18,2) not null check (existing_monthly_obligations >= 0),
  down_payment numeric(18,2) not null default 0 check (down_payment >= 0),
  estimated_monthly_payment numeric(18,2) not null check (estimated_monthly_payment >= 0),
  debt_to_income_pct numeric(7,3) not null check (debt_to_income_pct >= 0),
  outcome text not null check (outcome in ('RECOMMEND_REVIEW','REFER','INELIGIBLE')),
  reason_codes text[] not null default '{}',
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists sp_financing_credit_assessments_app_idx
  on public.sp_financing_credit_assessments(application_id, created_at desc);

alter table public.sp_financing_product_rules enable row level security;
alter table public.sp_financing_credit_assessments enable row level security;
revoke all on public.sp_financing_product_rules from anon, authenticated;
revoke all on public.sp_financing_credit_assessments from anon, authenticated;
grant all on public.sp_financing_product_rules to service_role;
grant all on public.sp_financing_credit_assessments to service_role;

create or replace function public.sp_financing_configure_product_rule(
  p_user_id uuid,
  p_product_code text,
  p_min_amount numeric,
  p_max_amount numeric,
  p_min_tenor_months integer,
  p_max_tenor_months integer,
  p_annual_interest_rate_pct numeric,
  p_max_dti_pct numeric,
  p_min_monthly_income numeric,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_product public.sp_financing_products%rowtype;
  v_version integer;
  v_rule public.sp_financing_product_rules%rowtype;
begin
  if not exists (
    select 1 from public.sp_financing_user_roles
    where user_id = p_user_id and active = true and role = 'FINANCING_ADMIN'
  ) then raise exception 'financing_admin_required'; end if;
  if p_min_amount is null or p_max_amount is null or p_min_amount <= 0 or p_max_amount < p_min_amount or p_max_amount > 100000000000
    or p_min_tenor_months is null or p_max_tenor_months is null or p_min_tenor_months < 1 or p_max_tenor_months < p_min_tenor_months or p_max_tenor_months > 240
    or p_annual_interest_rate_pct is null or p_annual_interest_rate_pct < 0 or p_annual_interest_rate_pct > 100
    or p_max_dti_pct is null or p_max_dti_pct <= 0 or p_max_dti_pct > 100
    or p_min_monthly_income is null or p_min_monthly_income < 0 then
    raise exception 'invalid_product_rule';
  end if;
  select * into v_product from public.sp_financing_products
    where code = p_product_code and active = true for update;
  if not found then raise exception 'product_unavailable'; end if;
  select coalesce(max(version), 0) + 1 into v_version
    from public.sp_financing_product_rules where product_id = v_product.id;
  update public.sp_financing_product_rules set active = false
    where product_id = v_product.id and active = true;
  insert into public.sp_financing_product_rules(
    product_id, version, active, min_amount, max_amount, min_tenor_months, max_tenor_months,
    annual_interest_rate_pct, max_dti_pct, min_monthly_income, created_by
  ) values (
    v_product.id, v_version, true, p_min_amount, p_max_amount, p_min_tenor_months, p_max_tenor_months,
    p_annual_interest_rate_pct, p_max_dti_pct, p_min_monthly_income, p_user_id
  ) returning * into v_rule;
  insert into public.sp_financing_audit_events(actor_user_id, action, entity_type, entity_id, correlation_id, outcome, details)
    values (p_user_id, 'PRODUCT_RULE_CONFIGURED', 'financing_product_rule', v_rule.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text), 'SUCCESS',
      jsonb_build_object('product_code',p_product_code,'version',v_version,'min_amount',p_min_amount,'max_amount',p_max_amount,
        'min_tenor_months',p_min_tenor_months,'max_tenor_months',p_max_tenor_months,
        'annual_interest_rate_pct',p_annual_interest_rate_pct,'max_dti_pct',p_max_dti_pct,'min_monthly_income',p_min_monthly_income));
  return jsonb_build_object('id',v_rule.id,'product_code',p_product_code,'version',v_rule.version,'active',v_rule.active,
    'min_amount',v_rule.min_amount,'max_amount',v_rule.max_amount,'min_tenor_months',v_rule.min_tenor_months,
    'max_tenor_months',v_rule.max_tenor_months,'annual_interest_rate_pct',v_rule.annual_interest_rate_pct,
    'max_dti_pct',v_rule.max_dti_pct,'min_monthly_income',v_rule.min_monthly_income,'created_at',v_rule.created_at);
end;
$$;

create or replace function public.sp_financing_record_credit_assessment(
  p_user_id uuid,
  p_application_id uuid,
  p_rule_id uuid,
  p_monthly_income numeric,
  p_existing_monthly_obligations numeric,
  p_down_payment numeric,
  p_estimated_monthly_payment numeric,
  p_debt_to_income_pct numeric,
  p_outcome text,
  p_reason_codes text[],
  p_notes text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_app public.sp_financing_applications%rowtype;
  v_rule public.sp_financing_product_rules%rowtype;
  v_assessment public.sp_financing_credit_assessments%rowtype;
begin
  if not exists (
    select 1 from public.sp_financing_user_roles
    where user_id = p_user_id and active = true and role in ('FINANCING_ADMIN','CREDIT_ANALYST')
  ) then raise exception 'credit_analyst_required'; end if;
  if p_monthly_income is null or p_monthly_income <= 0 or p_existing_monthly_obligations is null or p_existing_monthly_obligations < 0
    or p_down_payment is null or p_down_payment < 0 or p_estimated_monthly_payment is null or p_estimated_monthly_payment < 0
    or p_debt_to_income_pct is null or p_debt_to_income_pct < 0
    or p_outcome not in ('RECOMMEND_REVIEW','REFER','INELIGIBLE') or length(coalesce(p_notes,'')) > 2000 then
    raise exception 'invalid_credit_assessment';
  end if;
  select * into v_app from public.sp_financing_applications where id = p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.status <> 'CREDIT_REVIEW' then raise exception 'application_not_in_credit_review'; end if;
  select * into v_rule from public.sp_financing_product_rules where id = p_rule_id;
  if not found then raise exception 'product_rule_not_found'; end if;
  if v_rule.product_id <> v_app.product_id then raise exception 'product_rule_mismatch'; end if;
  insert into public.sp_financing_credit_assessments(
    application_id, product_rule_id, rule_version, assessor_user_id, monthly_income,
    existing_monthly_obligations, down_payment, estimated_monthly_payment, debt_to_income_pct,
    outcome, reason_codes, notes
  ) values (
    p_application_id, p_rule_id, v_rule.version, p_user_id, p_monthly_income,
    p_existing_monthly_obligations, p_down_payment, p_estimated_monthly_payment, p_debt_to_income_pct,
    p_outcome, coalesce(p_reason_codes,'{}'), coalesce(p_notes,'')
  ) returning * into v_assessment;
  insert into public.sp_financing_audit_events(actor_user_id, action, entity_type, entity_id, correlation_id, outcome, details)
    values (p_user_id, 'CREDIT_ASSESSMENT_RECORDED', 'financing_application', p_application_id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text), 'SUCCESS',
      jsonb_build_object('assessment_id',v_assessment.id,'rule_version',v_rule.version,'outcome',p_outcome,
        'debt_to_income_pct',p_debt_to_income_pct,'reason_codes',coalesce(p_reason_codes,'{}')));
  return jsonb_build_object('id',v_assessment.id,'application_id',v_assessment.application_id,
    'rule_version',v_assessment.rule_version,'estimated_monthly_payment',v_assessment.estimated_monthly_payment,
    'debt_to_income_pct',v_assessment.debt_to_income_pct,'outcome',v_assessment.outcome,
    'reason_codes',v_assessment.reason_codes,'created_at',v_assessment.created_at);
end;
$$;

revoke all on function public.sp_financing_configure_product_rule(uuid,text,numeric,numeric,integer,integer,numeric,numeric,numeric,text) from public, anon, authenticated;
revoke all on function public.sp_financing_record_credit_assessment(uuid,uuid,uuid,numeric,numeric,numeric,numeric,numeric,text,text[],text,text) from public, anon, authenticated;
grant execute on function public.sp_financing_configure_product_rule(uuid,text,numeric,numeric,integer,integer,numeric,numeric,numeric,text) to service_role;
grant execute on function public.sp_financing_record_credit_assessment(uuid,uuid,uuid,numeric,numeric,numeric,numeric,numeric,text,text[],text,text) to service_role;
