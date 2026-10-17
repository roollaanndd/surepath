-- Phase 6: explicit bank-statement reconciliation for operator-imported normalized lines.
-- This is not a bank API; users must verify/import official statement data from their provider.
alter table public.sp_financing_ledger_accounts drop constraint if exists sp_financing_ledger_accounts_account_type_check;
alter table public.sp_financing_ledger_accounts add constraint sp_financing_ledger_accounts_account_type_check
 check (account_type in ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'));
insert into public.sp_financing_ledger_accounts(account_code,account_name,account_type)
values('OPERATING_BANK','Operating bank account — masked statement reconciliation','ASSET')
on conflict(account_code) do nothing;

alter table public.sp_financing_ledger_journals drop constraint if exists sp_financing_ledger_journals_source_type_check;
alter table public.sp_financing_ledger_journals add constraint sp_financing_ledger_journals_source_type_check
 check (source_type in ('DISBURSEMENT_SETTLEMENT','INTEREST_ACCRUAL','PAYMENT_RECEIPT','PAYMENT_ALLOCATION','BANK_RECONCILIATION','MANUAL_ADJUSTMENT'));

create table if not exists public.sp_financing_reconciliation_batches (
 id uuid primary key default gen_random_uuid(),
 statement_reference text not null unique check (length(trim(statement_reference)) between 6 and 120),
 masked_bank_account text not null check (length(trim(masked_bank_account)) between 4 and 40),
 period_start date not null,
 period_end date not null,
 status text not null default 'IMPORTED' check (status in ('IMPORTED','PARTIAL','RECONCILED','EXCEPTION')),
 line_count integer not null default 0 check (line_count between 0 and 500),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check (period_end>=period_start)
);
create table if not exists public.sp_financing_bank_statement_lines (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.sp_financing_reconciliation_batches(id) on delete restrict,
 line_number integer not null check (line_number>0),
 transaction_date date not null,
 direction text not null check (direction in ('IN','OUT')),
 amount numeric(18,2) not null check (amount>0),
 external_reference text not null check (length(trim(external_reference)) between 3 and 200),
 description_hash text check (description_hash is null or description_hash ~ '^[a-fA-F0-9]{64}$'),
 status text not null default 'UNMATCHED' check (status in ('UNMATCHED','MATCHED','EXCEPTION')),
 matched_entity_type text check (matched_entity_type is null or matched_entity_type in ('REPAYMENT','DISBURSEMENT')),
 matched_entity_id uuid,
 matched_by uuid references auth.users(id),
 matched_at timestamptz,
 exception_code text,
 created_at timestamptz not null default now(),
 unique(batch_id,line_number)
);
create index if not exists sp_financing_statement_lines_match_idx
 on public.sp_financing_bank_statement_lines(status,direction,external_reference,amount);
create index if not exists sp_financing_statement_lines_batch_idx
 on public.sp_financing_bank_statement_lines(batch_id,line_number);

alter table public.sp_financing_repayments add column if not exists bank_reconciled boolean not null default false;
alter table public.sp_financing_repayments add column if not exists bank_reconciled_at timestamptz;
alter table public.sp_financing_repayments add column if not exists bank_statement_line_id uuid references public.sp_financing_bank_statement_lines(id);
alter table public.sp_financing_disbursement_requests add column if not exists bank_reconciled boolean not null default false;
alter table public.sp_financing_disbursement_requests add column if not exists bank_reconciled_at timestamptz;
alter table public.sp_financing_disbursement_requests add column if not exists bank_statement_line_id uuid references public.sp_financing_bank_statement_lines(id);
create unique index if not exists sp_financing_repayments_statement_line_unique on public.sp_financing_repayments(bank_statement_line_id) where bank_statement_line_id is not null;
create unique index if not exists sp_financing_disbursements_statement_line_unique on public.sp_financing_disbursement_requests(bank_statement_line_id) where bank_statement_line_id is not null;
create unique index if not exists sp_financing_disbursement_external_reference_unique on public.sp_financing_disbursement_requests(external_reference) where external_reference is not null;

alter table public.sp_financing_reconciliation_batches enable row level security;
alter table public.sp_financing_bank_statement_lines enable row level security;
revoke all on public.sp_financing_reconciliation_batches from anon,authenticated;
revoke all on public.sp_financing_bank_statement_lines from anon,authenticated;
grant select on public.sp_financing_reconciliation_batches,public.sp_financing_bank_statement_lines to service_role;

create or replace function public.sp_financing_import_reconciliation_batch(
 p_user_id uuid,p_statement_reference text,p_masked_bank_account text,p_period_start date,p_period_end date,
 p_lines jsonb,p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_batch public.sp_financing_reconciliation_batches%rowtype;
 v_line jsonb;
 v_count integer:=0;
 v_date date;
 v_direction text;
 v_amount numeric(18,2);
 v_reference text;
 v_hash text;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE','AUDITOR')) then
  raise exception 'reconciliation_access_required';
 end if;
 if length(trim(coalesce(p_statement_reference,'')))<6 or length(p_statement_reference)>120
  or length(trim(coalesce(p_masked_bank_account,'')))<4 or length(p_masked_bank_account)>40
  or p_masked_bank_account !~ '.*([*•]{2,}|[Xx]{2,}).*'
  or p_period_start is null or p_period_end is null or p_period_end<p_period_start
  or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>500 then
  raise exception 'invalid_reconciliation_batch';
 end if;
 if exists(select 1 from public.sp_financing_reconciliation_batches where statement_reference=trim(p_statement_reference)) then
  raise exception 'statement_reference_already_imported';
 end if;
 insert into public.sp_financing_reconciliation_batches(statement_reference,masked_bank_account,period_start,period_end,line_count,created_by)
 values(trim(p_statement_reference),trim(p_masked_bank_account),p_period_start,p_period_end,jsonb_array_length(p_lines),p_user_id)
 returning * into v_batch;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  begin v_date:=(v_line->>'transaction_date')::date;
  exception when others then raise exception 'invalid_statement_line_date'; end;
  v_direction:=v_line->>'direction';
  begin v_amount:=round((v_line->>'amount')::numeric,2);
  exception when others then raise exception 'invalid_statement_line_amount'; end;
  v_reference:=trim(coalesce(v_line->>'external_reference',''));
  v_hash:=nullif(trim(v_line->>'description_hash'),'');
  if v_date<p_period_start or v_date>p_period_end or v_direction not in ('IN','OUT') or v_amount<=0
   or length(v_reference)<3 or length(v_reference)>200
   or (v_hash is not null and v_hash !~ '^[a-fA-F0-9]{64}$') then
   raise exception 'invalid_statement_line';
  end if;
  v_count:=v_count+1;
  insert into public.sp_financing_bank_statement_lines(batch_id,line_number,transaction_date,direction,amount,external_reference,description_hash)
  values(v_batch.id,v_count,v_date,v_direction,v_amount,v_reference,v_hash);
 end loop;
 insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
 values(p_user_id,'BANK_STATEMENT_IMPORTED','reconciliation_batch',v_batch.id::text,
  coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
  jsonb_build_object('statement_reference',v_batch.statement_reference,'masked_bank_account',v_batch.masked_bank_account,
   'period_start',v_batch.period_start,'period_end',v_batch.period_end,'line_count',v_count));
 return jsonb_build_object('id',v_batch.id,'statement_reference',v_batch.statement_reference,'status',v_batch.status,
  'line_count',v_count,'created_at',v_batch.created_at,'external_bank_connection',false);
end;
$$;

create or replace function public.sp_financing_reconcile_statement_line(
 p_user_id uuid,p_statement_line_id uuid,p_entity_type text,p_entity_id uuid,p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_line public.sp_financing_bank_statement_lines%rowtype;
 v_batch public.sp_financing_reconciliation_batches%rowtype;
 v_payment public.sp_financing_repayments%rowtype;
 v_request public.sp_financing_disbursement_requests%rowtype;
 v_journal_id uuid;
 v_reason text;
 v_matched_count integer;
 v_total_count integer;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE')) then
  raise exception 'reconciliation_access_required';
 end if;
 if p_entity_type not in ('REPAYMENT','DISBURSEMENT') then raise exception 'invalid_reconciliation_target'; end if;
 select * into v_line from public.sp_financing_bank_statement_lines where id=p_statement_line_id for update;
 if not found then raise exception 'statement_line_not_found'; end if;
 if v_line.status<>'UNMATCHED' then raise exception 'statement_line_not_unmatched'; end if;
 select * into v_batch from public.sp_financing_reconciliation_batches where id=v_line.batch_id for update;
 if p_entity_type='REPAYMENT' then
  if v_line.direction<>'IN' then v_reason:='DIRECTION_MISMATCH';
  else
   select * into v_payment from public.sp_financing_repayments where id=p_entity_id for update;
   if not found then v_reason:='PAYMENT_NOT_FOUND';
   elsif v_payment.bank_reconciled then v_reason:='PAYMENT_ALREADY_RECONCILED';
   elsif v_payment.amount<>v_line.amount then v_reason:='AMOUNT_MISMATCH';
   elsif coalesce(v_payment.external_reference,'')='' or v_payment.external_reference<>v_line.external_reference then v_reason:='REFERENCE_MISMATCH';
   elsif v_payment.status not in ('RECEIVED','ALLOCATED') then v_reason:='PAYMENT_STATUS_INVALID';
   end if;
  end if;
 else
  if v_line.direction<>'OUT' then v_reason:='DIRECTION_MISMATCH';
  else
   select * into v_request from public.sp_financing_disbursement_requests where id=p_entity_id for update;
   if not found then v_reason:='DISBURSEMENT_NOT_FOUND';
   elsif v_request.bank_reconciled then v_reason:='DISBURSEMENT_ALREADY_RECONCILED';
   elsif v_request.amount<>v_line.amount then v_reason:='AMOUNT_MISMATCH';
   elsif coalesce(v_request.external_reference,'')='' or v_request.external_reference<>v_line.external_reference then v_reason:='REFERENCE_MISMATCH';
   elsif v_request.status<>'SETTLED' then v_reason:='DISBURSEMENT_NOT_SETTLED';
   end if;
  end if;
 end if;
 if v_reason is not null then
  update public.sp_financing_bank_statement_lines set status='EXCEPTION',exception_code=v_reason where id=v_line.id;
  update public.sp_financing_reconciliation_batches set status='EXCEPTION' where id=v_batch.id;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
  values(p_user_id,'BANK_STATEMENT_MATCH_EXCEPTION','statement_line',v_line.id::text,
   coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'FAILURE',
   jsonb_build_object('batch_id',v_batch.id,'target_type',p_entity_type,'target_id',p_entity_id,'reason',v_reason));
  return jsonb_build_object('matched',false,'status','EXCEPTION','reason',v_reason,'statement_line_id',v_line.id);
 end if;
 if p_entity_type='REPAYMENT' then
  v_journal_id:=public.sp_financing_post_journal(p_user_id,'BANK_RECONCILIATION',v_line.id::text,p_correlation_id,
   'Incoming bank statement matched to repayment '||v_payment.id::text,
   jsonb_build_array(
    jsonb_build_object('account_code','OPERATING_BANK','debit',v_payment.amount,'credit',0),
    jsonb_build_object('account_code','PAYMENT_SUSPENSE','debit',0,'credit',v_payment.amount)
   ));
  update public.sp_financing_repayments set bank_reconciled=true,bank_reconciled_at=now(),bank_statement_line_id=v_line.id where id=v_payment.id;
 else
  v_journal_id:=public.sp_financing_post_journal(p_user_id,'BANK_RECONCILIATION',v_line.id::text,p_correlation_id,
   'Outgoing bank statement matched to disbursement '||v_request.id::text,
   jsonb_build_array(
    jsonb_build_object('account_code','BANK_CLEARING','debit',v_request.amount,'credit',0),
    jsonb_build_object('account_code','OPERATING_BANK','debit',0,'credit',v_request.amount)
   ));
  update public.sp_financing_disbursement_requests set bank_reconciled=true,bank_reconciled_at=now(),bank_statement_line_id=v_line.id where id=v_request.id;
 end if;
 update public.sp_financing_bank_statement_lines set status='MATCHED',matched_entity_type=p_entity_type,matched_entity_id=p_entity_id,matched_by=p_user_id,matched_at=now() where id=v_line.id;
 select count(*) into v_matched_count from public.sp_financing_bank_statement_lines where batch_id=v_batch.id and status='MATCHED';
 select count(*) into v_total_count from public.sp_financing_bank_statement_lines where batch_id=v_batch.id;
 update public.sp_financing_reconciliation_batches set status=case when v_matched_count=v_total_count then 'RECONCILED' else 'PARTIAL' end where id=v_batch.id;
 insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
 values(p_user_id,'BANK_STATEMENT_LINE_RECONCILED','statement_line',v_line.id::text,
  coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
  jsonb_build_object('batch_id',v_batch.id,'target_type',p_entity_type,'target_id',p_entity_id,'amount',v_line.amount,'journal_id',v_journal_id));
 return jsonb_build_object('matched',true,'status','MATCHED','statement_line_id',v_line.id,'target_type',p_entity_type,
  'target_id',p_entity_id,'journal_id',v_journal_id,'batch_status',case when v_matched_count=v_total_count then 'RECONCILED' else 'PARTIAL' end);
end;
$$;

create or replace function public.sp_financing_list_reconciliation_batches(p_user_id uuid,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_result jsonb;
begin
 if not exists(select 1 from public.sp_financing_user_roles where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','SERVICING_FINANCE','AUDITOR')) then
  raise exception 'reconciliation_access_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'statement_reference',b.statement_reference,
  'masked_bank_account',b.masked_bank_account,'period_start',b.period_start,'period_end',b.period_end,
  'status',b.status,'line_count',b.line_count,'matched_count',b.matched_count,'exception_count',b.exception_count,'created_at',b.created_at)
  order by b.created_at desc),'[]'::jsonb)
 into v_result from (
  select b.*,x.matched_count,x.exception_count from public.sp_financing_reconciliation_batches b
  left join lateral (select count(*) filter(where status='MATCHED') matched_count,count(*) filter(where status='EXCEPTION') exception_count
   from public.sp_financing_bank_statement_lines l where l.batch_id=b.id) x on true
  order by b.created_at desc limit least(100,greatest(1,coalesce(p_limit,50)))
 ) b;
 return v_result;
end;
$$;

revoke all on function public.sp_financing_import_reconciliation_batch(uuid,text,text,date,date,jsonb,text) from public,anon,authenticated;
revoke all on function public.sp_financing_reconcile_statement_line(uuid,uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.sp_financing_list_reconciliation_batches(uuid,integer) from public,anon,authenticated;
grant execute on function public.sp_financing_import_reconciliation_batch(uuid,text,text,date,date,jsonb,text) to service_role;
grant execute on function public.sp_financing_reconcile_statement_line(uuid,uuid,text,uuid,text) to service_role;
grant execute on function public.sp_financing_list_reconciliation_batches(uuid,integer) to service_role;
