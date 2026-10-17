-- Phase 5: repayment schedule generation, idempotent receipt/allocation, and double-entry accounting.
-- All cash movement remains external; this records operator-attested settlement/payment evidence only.

create table if not exists public.sp_financing_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique check (account_code ~ '^[A-Z][A-Z0-9_]{1,59}$'),
  account_name text not null check (length(trim(account_name)) between 2 and 120),
  account_type text not null check (account_type in ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  currency char(3) not null default 'IDR' check (currency='IDR'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.sp_financing_ledger_accounts(account_code,account_name,account_type) values
 ('BANK_CLEARING','Bank clearing — settlement evidence pending reconciliation','ASSET'),
 ('PAYMENT_SUSPENSE','Payment suspense — incoming receipts pending bank reconciliation','ASSET'),
 ('LOAN_PRINCIPAL_RECEIVABLE','Loan principal receivable','ASSET'),
 ('INTEREST_RECEIVABLE','Contractual interest receivable','ASSET'),
 ('FEES_RECEIVABLE','Contractual fees receivable','ASSET'),
 ('UNALLOCATED_RECEIPTS','Customer receipts not yet allocated','LIABILITY'),
 ('INTEREST_INCOME','Contractual interest income','INCOME'),
 ('FEE_INCOME','Contractual fee income','INCOME')
on conflict(account_code) do nothing;

create table if not exists public.sp_financing_ledger_journals (
  id uuid primary key default gen_random_uuid(),
  journal_number text not null unique,
  source_type text not null check (source_type in ('DISBURSEMENT_SETTLEMENT','INTEREST_ACCRUAL','PAYMENT_RECEIPT','PAYMENT_ALLOCATION','MANUAL_ADJUSTMENT')),
  source_id text not null,
  currency char(3) not null default 'IDR' check (currency='IDR'),
  status text not null default 'POSTED' check (status in ('POSTED','REVERSED')),
  correlation_id text not null,
  memo text not null default '' check (length(memo)<=500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(source_type,source_id)
);
create table if not exists public.sp_financing_ledger_entries (
  id bigint generated always as identity primary key,
  journal_id uuid not null references public.sp_financing_ledger_journals(id) on delete restrict,
  account_id uuid not null references public.sp_financing_ledger_accounts(id) on delete restrict,
  debit numeric(18,2) not null default 0 check (debit>=0),
  credit numeric(18,2) not null default 0 check (credit>=0),
  created_at timestamptz not null default now(),
  check ((debit>0 and credit=0) or (credit>0 and debit=0))
);
create index if not exists sp_financing_ledger_entries_journal_idx on public.sp_financing_ledger_entries(journal_id,id);
create index if not exists sp_financing_ledger_journals_created_idx on public.sp_financing_ledger_journals(created_at desc);

create table if not exists public.sp_financing_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  repayment_id uuid not null references public.sp_financing_repayments(id) on delete restrict,
  schedule_id uuid not null references public.sp_financing_repayment_schedules(id) on delete restrict,
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 128),
  principal_amount numeric(18,2) not null default 0 check (principal_amount>=0),
  interest_amount numeric(18,2) not null default 0 check (interest_amount>=0),
  fees_amount numeric(18,2) not null default 0 check (fees_amount>=0),
  total_amount numeric(18,2) generated always as (principal_amount+interest_amount+fees_amount) stored,
  allocated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (principal_amount+interest_amount+fees_amount>0)
);
create index if not exists sp_financing_payment_allocations_payment_idx on public.sp_financing_payment_allocations(repayment_id,created_at);
create index if not exists sp_financing_payment_allocations_schedule_idx on public.sp_financing_payment_allocations(schedule_id,created_at);

alter table public.sp_financing_repayment_schedules add column if not exists schedule_version integer not null default 1 check (schedule_version>0);
alter table public.sp_financing_repayment_schedules add column if not exists principal_opening_balance numeric(18,2) not null default 0 check (principal_opening_balance>=0);
alter table public.sp_financing_repayment_schedules add column if not exists scheduled_payment numeric(18,2) not null default 0 check (scheduled_payment>=0);
alter table public.sp_financing_repayment_schedules add column if not exists generated_by uuid references auth.users(id);
create unique index if not exists sp_financing_repayment_schedules_account_version_installment
 on public.sp_financing_repayment_schedules(loan_account_id,schedule_version,installment_number);

alter table public.sp_financing_ledger_accounts enable row level security;
alter table public.sp_financing_ledger_journals enable row level security;
alter table public.sp_financing_ledger_entries enable row level security;
alter table public.sp_financing_payment_allocations enable row level security;
alter table public.sp_financing_repayment_schedules enable row level security;
alter table public.sp_financing_repayments enable row level security;
revoke all on public.sp_financing_ledger_accounts from anon,authenticated;
revoke all on public.sp_financing_ledger_journals from anon,authenticated;
revoke all on public.sp_financing_ledger_entries from anon,authenticated;
revoke all on public.sp_financing_payment_allocations from anon,authenticated;
revoke all on public.sp_financing_repayment_schedules from anon,authenticated;
revoke all on public.sp_financing_repayments from anon,authenticated;
grant select on public.sp_financing_ledger_accounts,public.sp_financing_ledger_journals,public.sp_financing_ledger_entries,public.sp_financing_payment_allocations,public.sp_financing_repayment_schedules,public.sp_financing_repayments to service_role;

create or replace function public.sp_financing_post_journal(
 p_user_id uuid,p_source_type text,p_source_id text,p_correlation_id text,p_memo text,p_lines jsonb
) returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_journal_id uuid;
 v_journal_number text;
 v_line jsonb;
 v_account_id uuid;
 v_debit numeric(18,2);
 v_credit numeric(18,2);
 v_total_debit numeric(18,2):=0;
 v_total_credit numeric(18,2):=0;
 v_count integer:=0;
begin
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then raise exception 'invalid_journal_lines'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
   select id into v_account_id from public.sp_financing_ledger_accounts
    where account_code=v_line->>'account_code' and active=true;
   if not found then raise exception 'ledger_account_unavailable'; end if;
   v_debit:=coalesce((v_line->>'debit')::numeric,0);
   v_credit:=coalesce((v_line->>'credit')::numeric,0);
   if v_debit<0 or v_credit<0 or not ((v_debit>0 and v_credit=0) or (v_credit>0 and v_debit=0)) then
     raise exception 'invalid_journal_line';
   end if;
   v_total_debit:=v_total_debit+v_debit; v_total_credit:=v_total_credit+v_credit; v_count:=v_count+1;
 end loop;
 if v_total_debit<=0 or v_total_debit<>v_total_credit then raise exception 'unbalanced_journal'; end if;
 if exists(select 1 from public.sp_financing_ledger_journals where source_type=p_source_type and source_id=p_source_id) then
   raise exception 'journal_source_already_posted';
 end if;
 v_journal_number:='SPJ-'||to_char(clock_timestamp() at time zone 'UTC','YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.sp_financing_ledger_journals(journal_number,source_type,source_id,correlation_id,memo,created_by)
 values(v_journal_number,p_source_type,p_source_id,coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),left(coalesce(p_memo,''),500),p_user_id)
 returning id into v_journal_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
   select id into v_account_id from public.sp_financing_ledger_accounts where account_code=v_line->>'account_code' and active=true;
   v_debit:=coalesce((v_line->>'debit')::numeric,0); v_credit:=coalesce((v_line->>'credit')::numeric,0);
   insert into public.sp_financing_ledger_entries(journal_id,account_id,debit,credit)
    values(v_journal_id,v_account_id,v_debit,v_credit);
 end loop;
 return v_journal_id;
end;
$$;

create or replace function public.sp_financing_settle_disbursement_and_generate_schedule(
 p_user_id uuid,p_request_id uuid,p_external_settlement_ref text,p_first_due_date date,p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_req public.sp_financing_disbursement_requests%rowtype;
 v_account public.sp_financing_loan_accounts%rowtype;
 v_contract public.sp_financing_contracts%rowtype;
 v_rate numeric;
 v_monthly_rate numeric;
 v_payment numeric;
 v_balance numeric;
 v_interest numeric;
 v_principal numeric;
 v_total_interest numeric:=0;
 v_i integer;
 v_due_date date;
 v_schedule_count integer:=0;
 v_existing uuid;
 v_journal_id uuid;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE')) then
  raise exception 'servicing_finance_required';
 end if;
 if length(trim(coalesce(p_external_settlement_ref,'')))<6 or length(p_external_settlement_ref)>200 or p_first_due_date<current_date then
  raise exception 'settlement_evidence_required';
 end if;
 select * into v_req from public.sp_financing_disbursement_requests where id=p_request_id for update;
 if not found then raise exception 'disbursement_request_not_found'; end if;
 if v_req.status='SETTLED' then
  if v_req.external_reference=trim(p_external_settlement_ref) then
   select * into v_account from public.sp_financing_loan_accounts where id=v_req.loan_account_id;
   return jsonb_build_object('request_id',v_req.id,'status','SETTLED','loan_account_id',v_account.id,'schedule_count',
    (select count(*) from public.sp_financing_repayment_schedules where loan_account_id=v_account.id),'idempotent_replay',true);
  end if;
  raise exception 'settlement_reference_conflict';
 end if;
 if v_req.status<>'APPROVED' then raise exception 'disbursement_not_approved'; end if;
 select * into v_account from public.sp_financing_loan_accounts where id=v_req.loan_account_id for update;
 if not found then raise exception 'loan_account_not_found'; end if;
 if v_account.status<>'PENDING_DISBURSEMENT' then raise exception 'loan_not_pending_disbursement'; end if;
 if exists(select 1 from public.sp_financing_disbursement_requests where external_reference=trim(p_external_settlement_ref) and id<>v_req.id) then
  raise exception 'settlement_reference_conflict';
 end if;
 select * into v_contract from public.sp_financing_contracts where id=v_account.contract_id;
 if not found then raise exception 'contract_not_found'; end if;
 if v_contract.tenor_months<1 or v_contract.annual_rate<0 then raise exception 'invalid_contract_terms'; end if;
 v_rate:=v_contract.annual_rate; v_monthly_rate:=v_rate/1200; v_balance:=v_account.principal_amount;
 if v_monthly_rate=0 then v_payment:=round(v_balance/v_contract.tenor_months,2);
 else v_payment:=round(v_balance*v_monthly_rate/(1-power(1+v_monthly_rate,-v_contract.tenor_months)),2); end if;

 update public.sp_financing_disbursement_requests set status='SETTLED',external_reference=trim(p_external_settlement_ref),updated_at=now() where id=v_req.id;
 update public.sp_financing_loan_accounts set status='ACTIVE',disbursed_at=now(),updated_at=now() where id=v_account.id;

 for v_i in 1..v_contract.tenor_months loop
  v_due_date:=(p_first_due_date+((v_i-1)*interval '1 month'))::date;
  v_interest:=round(v_balance*v_monthly_rate,2);
  if v_i=v_contract.tenor_months then v_principal:=v_balance;
  else v_principal:=least(v_balance,greatest(0,round(v_payment-v_interest,2))); end if;
  insert into public.sp_financing_repayment_schedules(
    loan_account_id,installment_number,due_date,principal_due,interest_due,fees_due,amount_paid,status,
    schedule_version,principal_opening_balance,scheduled_payment,generated_by
  ) values(v_account.id,v_i,v_due_date,v_principal,v_interest,0,0,'UPCOMING',1,v_balance,round(v_principal+v_interest,2),p_user_id);
  v_balance:=round(v_balance-v_principal,2); v_total_interest:=v_total_interest+v_interest; v_schedule_count:=v_schedule_count+1;
 end loop;

 v_journal_id:=public.sp_financing_post_journal(p_user_id,'DISBURSEMENT_SETTLEMENT',v_req.id::text,p_correlation_id,
  'Disbursement settlement evidence '||trim(p_external_settlement_ref),
  jsonb_build_array(
   jsonb_build_object('account_code','LOAN_PRINCIPAL_RECEIVABLE','debit',v_account.principal_amount,'credit',0),
   jsonb_build_object('account_code','BANK_CLEARING','debit',0,'credit',v_account.principal_amount)
  ));
 if v_total_interest>0 then
  perform public.sp_financing_post_journal(p_user_id,'INTEREST_ACCRUAL',v_account.id::text,p_correlation_id,
   'Contractual interest receivable schedule accrual',
   jsonb_build_array(
    jsonb_build_object('account_code','INTEREST_RECEIVABLE','debit',round(v_total_interest,2),'credit',0),
    jsonb_build_object('account_code','INTEREST_INCOME','debit',0,'credit',round(v_total_interest,2))
   ));
 end if;
 insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
 values(p_user_id,'DISBURSEMENT_SETTLED_SCHEDULE_GENERATED','loan_account',v_account.id::text,
  coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
  jsonb_build_object('request_id',v_req.id,'settlement_reference',trim(p_external_settlement_ref),'schedule_count',v_schedule_count,
   'principal_amount',v_account.principal_amount,'total_interest',round(v_total_interest,2),'journal_id',v_journal_id));
 return jsonb_build_object('request_id',v_req.id,'request_status','SETTLED','loan_account_id',v_account.id,
  'loan_account_status','ACTIVE','schedule_count',v_schedule_count,'total_interest',round(v_total_interest,2),
  'disbursement_journal_id',v_journal_id,'money_moved_by_surepath',false,'idempotent_replay',false);
end;
$$;

create or replace function public.sp_financing_record_repayment(
 p_user_id uuid,p_loan_account_id uuid,p_amount numeric,p_channel text,p_external_reference text,
 p_idempotency_key text,p_payment_date timestamptz,p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_account public.sp_financing_loan_accounts%rowtype;
 v_payment public.sp_financing_repayments%rowtype;
 v_existing public.sp_financing_repayments%rowtype;
 v_journal_id uuid;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE')) then
  raise exception 'servicing_finance_required';
 end if;
 if p_amount is null or p_amount<=0 or length(trim(coalesce(p_channel,'')))<2 or length(p_channel)>60
  or length(coalesce(p_idempotency_key,''))<8 or length(p_idempotency_key)>128
  or length(coalesce(p_external_reference,''))>200 or p_payment_date is null or p_payment_date>now()+interval '1 day' then
  raise exception 'invalid_repayment';
 end if;
 perform pg_advisory_xact_lock(hashtext(p_idempotency_key)::bigint);
 select * into v_existing from public.sp_financing_repayments where idempotency_key=p_idempotency_key;
 if found then
  if v_existing.loan_account_id<>p_loan_account_id or v_existing.amount<>p_amount or v_existing.channel<>trim(p_channel)
    or coalesce(v_existing.external_reference,'')<>coalesce(nullif(trim(p_external_reference),''),'') then
   raise exception 'idempotency_conflict';
  end if;
  return jsonb_build_object('id',v_existing.id,'loan_account_id',v_existing.loan_account_id,'amount',v_existing.amount,
   'status',v_existing.status,'idempotent_replay',true);
 end if;
 select * into v_account from public.sp_financing_loan_accounts where id=p_loan_account_id for update;
 if not found then raise exception 'loan_account_not_found'; end if;
 if v_account.status<>'ACTIVE' then raise exception 'loan_not_active'; end if;
 insert into public.sp_financing_repayments(loan_account_id,amount,currency,payment_date,channel,external_reference,idempotency_key,status,received_by)
 values(p_loan_account_id,p_amount,'IDR',p_payment_date,trim(p_channel),nullif(trim(p_external_reference),''),p_idempotency_key,'RECEIVED',p_user_id)
 returning * into v_payment;
 v_journal_id:=public.sp_financing_post_journal(p_user_id,'PAYMENT_RECEIPT',v_payment.id::text,p_correlation_id,
  'Payment receipt recorded; bank settlement reconciliation pending',
  jsonb_build_array(
   jsonb_build_object('account_code','PAYMENT_SUSPENSE','debit',p_amount,'credit',0),
   jsonb_build_object('account_code','UNALLOCATED_RECEIPTS','debit',0,'credit',p_amount)
  ));
 insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
 values(p_user_id,'REPAYMENT_RECEIVED','repayment',v_payment.id::text,coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
  jsonb_build_object('loan_account_id',p_loan_account_id,'amount',p_amount,'channel',trim(p_channel),
   'external_reference',nullif(trim(p_external_reference),''),'journal_id',v_journal_id,'bank_reconciled',false));
 return jsonb_build_object('id',v_payment.id,'loan_account_id',v_payment.loan_account_id,'amount',v_payment.amount,
  'currency','IDR','status',v_payment.status,'journal_id',v_journal_id,'bank_reconciled',false,'idempotent_replay',false);
end;
$$;

create or replace function public.sp_financing_allocate_repayment(
 p_user_id uuid,p_repayment_id uuid,p_schedule_id uuid,p_principal_amount numeric,p_interest_amount numeric,
 p_fees_amount numeric,p_idempotency_key text,p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_payment public.sp_financing_repayments%rowtype;
 v_schedule public.sp_financing_repayment_schedules%rowtype;
 v_account public.sp_financing_loan_accounts%rowtype;
 v_alloc public.sp_financing_payment_allocations%rowtype;
 v_existing public.sp_financing_payment_allocations%rowtype;
 v_total numeric(18,2);
 v_paid numeric(18,2);
 v_remain_payment numeric(18,2);
 v_remain_principal numeric(18,2);
 v_remain_interest numeric(18,2);
 v_remain_fees numeric(18,2);
 v_journal_id uuid;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE')) then
  raise exception 'servicing_finance_required';
 end if;
 if length(coalesce(p_idempotency_key,''))<8 or length(p_idempotency_key)>128 or
   coalesce(p_principal_amount,0)<0 or coalesce(p_interest_amount,0)<0 or coalesce(p_fees_amount,0)<0 or
   coalesce(p_principal_amount,0)+coalesce(p_interest_amount,0)+coalesce(p_fees_amount,0)<=0 then
  raise exception 'invalid_allocation';
 end if;
 perform pg_advisory_xact_lock(hashtext(p_idempotency_key)::bigint);
 select * into v_existing from public.sp_financing_payment_allocations where idempotency_key=p_idempotency_key;
 if found then
  if v_existing.repayment_id<>p_repayment_id or v_existing.schedule_id<>p_schedule_id or
    v_existing.principal_amount<>p_principal_amount or v_existing.interest_amount<>p_interest_amount or v_existing.fees_amount<>p_fees_amount then
   raise exception 'idempotency_conflict';
  end if;
  return jsonb_build_object('id',v_existing.id,'total_amount',v_existing.total_amount,'idempotent_replay',true);
 end if;
 select * into v_payment from public.sp_financing_repayments where id=p_repayment_id for update;
 if not found then raise exception 'repayment_not_found'; end if;
 if v_payment.status not in ('RECEIVED','ALLOCATED') then raise exception 'repayment_not_allocatable'; end if;
 select * into v_schedule from public.sp_financing_repayment_schedules where id=p_schedule_id for update;
 if not found then raise exception 'schedule_not_found'; end if;
 if v_schedule.loan_account_id<>v_payment.loan_account_id then raise exception 'loan_account_mismatch'; end if;
 if v_schedule.status='WAIVED' then raise exception 'schedule_waived'; end if;
 select * into v_account from public.sp_financing_loan_accounts where id=v_payment.loan_account_id for update;
 select coalesce(sum(total_amount),0) into v_paid from public.sp_financing_payment_allocations where repayment_id=v_payment.id;
 v_remain_payment:=round(v_payment.amount-v_paid,2);
 if p_principal_amount+p_interest_amount+p_fees_amount>v_remain_payment then raise exception 'allocation_exceeds_payment_balance'; end if;
 select
  round(v_schedule.principal_due-coalesce(sum(principal_amount),0),2),
  round(v_schedule.interest_due-coalesce(sum(interest_amount),0),2),
  round(v_schedule.fees_due-coalesce(sum(fees_amount),0),2)
 into v_remain_principal,v_remain_interest,v_remain_fees
 from public.sp_financing_payment_allocations where schedule_id=v_schedule.id;
 v_remain_principal:=coalesce(v_remain_principal,v_schedule.principal_due);
 v_remain_interest:=coalesce(v_remain_interest,v_schedule.interest_due);
 v_remain_fees:=coalesce(v_remain_fees,v_schedule.fees_due);
 if p_principal_amount>v_remain_principal or p_interest_amount>v_remain_interest or p_fees_amount>v_remain_fees then
  raise exception 'allocation_exceeds_schedule_balance';
 end if;
 if p_principal_amount>v_account.outstanding_principal then raise exception 'allocation_exceeds_outstanding_principal'; end if;
 insert into public.sp_financing_payment_allocations(repayment_id,schedule_id,idempotency_key,principal_amount,interest_amount,fees_amount,allocated_by)
 values(p_repayment_id,p_schedule_id,p_idempotency_key,p_principal_amount,p_interest_amount,p_fees_amount,p_user_id)
 returning * into v_alloc;
 v_total:=v_alloc.total_amount;
 v_journal_id:=public.sp_financing_post_journal(p_user_id,'PAYMENT_ALLOCATION',v_alloc.id::text,p_correlation_id,
  'Repayment allocation '||v_alloc.id::text,
  jsonb_build_array(
   jsonb_build_object('account_code','UNALLOCATED_RECEIPTS','debit',v_total,'credit',0),
   jsonb_build_object('account_code','LOAN_PRINCIPAL_RECEIVABLE','debit',0,'credit',p_principal_amount),
   jsonb_build_object('account_code','INTEREST_RECEIVABLE','debit',0,'credit',p_interest_amount),
   jsonb_build_object('account_code','FEES_RECEIVABLE','debit',0,'credit',p_fees_amount)
  ));
 update public.sp_financing_loan_accounts set outstanding_principal=round(outstanding_principal-p_principal_amount,2),updated_at=now()
 where id=v_account.id;
 update public.sp_financing_repayment_schedules set amount_paid=round(amount_paid+v_total,2),
  status=case when round(amount_paid+v_total,2)>=principal_due+interest_due+fees_due then 'PAID' else 'PARTIALLY_PAID' end,
  updated_at=now() where id=v_schedule.id;
 select coalesce(sum(total_amount),0) into v_paid from public.sp_financing_payment_allocations where repayment_id=v_payment.id;
 if v_paid>=v_payment.amount then update public.sp_financing_repayments set status='ALLOCATED' where id=v_payment.id; end if;
 insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
 values(p_user_id,'REPAYMENT_ALLOCATED','repayment',v_payment.id::text,coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
  jsonb_build_object('allocation_id',v_alloc.id,'schedule_id',v_schedule.id,'principal',p_principal_amount,
   'interest',p_interest_amount,'fees',p_fees_amount,'total',v_total,'journal_id',v_journal_id));
 return jsonb_build_object('id',v_alloc.id,'repayment_id',v_payment.id,'schedule_id',v_schedule.id,'total_amount',v_total,
  'journal_id',v_journal_id,'payment_allocated_total',v_paid,'payment_remaining',round(v_payment.amount-v_paid,2),'idempotent_replay',false);
end;
$$;

create or replace function public.sp_financing_get_ledger_trial_balance(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_result jsonb;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE','AUDITOR')) then
  raise exception 'ledger_access_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('account_code',a.account_code,'account_name',a.account_name,
  'account_type',a.account_type,'total_debit',x.total_debit,'total_credit',x.total_credit,
  'net_debit',round(x.total_debit-x.total_credit,2)) order by a.account_code),'[]'::jsonb)
 into v_result from public.sp_financing_ledger_accounts a
 left join (select e.account_id,round(sum(e.debit),2) total_debit,round(sum(e.credit),2) total_credit
   from public.sp_financing_ledger_entries e join public.sp_financing_ledger_journals j on j.id=e.journal_id
   where j.status='POSTED' group by e.account_id) x on x.account_id=a.id where a.active=true;
 return v_result;
end;
$$;

revoke all on function public.sp_financing_post_journal(uuid,text,text,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.sp_financing_settle_disbursement_and_generate_schedule(uuid,uuid,text,date,text) from public,anon,authenticated;
revoke all on function public.sp_financing_record_repayment(uuid,uuid,numeric,text,text,text,timestamptz,text) from public,anon,authenticated;
revoke all on function public.sp_financing_allocate_repayment(uuid,uuid,uuid,numeric,numeric,numeric,text,text) from public,anon,authenticated;
revoke all on function public.sp_financing_get_ledger_trial_balance(uuid) from public,anon,authenticated;
grant execute on function public.sp_financing_settle_disbursement_and_generate_schedule(uuid,uuid,text,date,text) to service_role;
grant execute on function public.sp_financing_record_repayment(uuid,uuid,numeric,text,text,text,timestamptz,text) to service_role;
grant execute on function public.sp_financing_allocate_repayment(uuid,uuid,uuid,numeric,numeric,numeric,text,text) to service_role;
grant execute on function public.sp_financing_get_ledger_trial_balance(uuid) to service_role;
