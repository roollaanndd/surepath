-- Phase 4: contract controls and maker-checker disbursement workflow.
-- This records approval workflow only; it never transfers money.
create or replace function public.sp_financing_create_contract(
  p_user_id uuid,
  p_application_id uuid,
  p_expected_version integer,
  p_terms_version text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_app public.sp_financing_applications%rowtype;
  v_rule public.sp_financing_product_rules%rowtype;
  v_contract public.sp_financing_contracts%rowtype;
begin
  if not exists (select 1 from public.sp_financing_user_roles
    where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','CONTRACT_OFFICER')) then
    raise exception 'contract_officer_required';
  end if;
  if length(trim(coalesce(p_terms_version,''))) < 2 or length(p_terms_version) > 80 then
    raise exception 'terms_version_required';
  end if;
  select * into v_app from public.sp_financing_applications where id=p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if v_app.status <> 'APPROVED' then raise exception 'application_not_approved'; end if;
  if exists (select 1 from public.sp_financing_contracts where application_id=p_application_id) then
    raise exception 'contract_already_exists';
  end if;
  select * into v_rule from public.sp_financing_product_rules where product_id=v_app.product_id and active=true;
  if not found then raise exception 'product_rules_not_configured'; end if;
  if v_app.requested_amount < v_rule.min_amount or v_app.requested_amount > v_rule.max_amount
    or v_app.requested_tenor_months < v_rule.min_tenor_months or v_app.requested_tenor_months > v_rule.max_tenor_months then
    raise exception 'application_outside_product_policy';
  end if;
  insert into public.sp_financing_contracts(
    application_id, contract_number, status, principal_amount, annual_rate, tenor_months, terms_version, created_by
  ) values (
    p_application_id,
    'SPC-' || to_char(clock_timestamp() at time zone 'UTC','YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    'PENDING_SIGNATURE', v_app.requested_amount, v_rule.annual_interest_rate_pct, v_app.requested_tenor_months, trim(p_terms_version), p_user_id
  ) returning * into v_contract;
  update public.sp_financing_applications set status='OFFERED', version=version+1, updated_at=now()
    where id=p_application_id and version=p_expected_version;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'FINANCING_CONTRACT_CREATED','financing_contract',v_contract.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('application_id',p_application_id,'contract_number',v_contract.contract_number,
        'principal_amount',v_contract.principal_amount,'annual_rate',v_contract.annual_rate,
        'tenor_months',v_contract.tenor_months,'terms_version',v_contract.terms_version,'status',v_contract.status));
  return jsonb_build_object('id',v_contract.id,'application_id',v_contract.application_id,
    'contract_number',v_contract.contract_number,'status',v_contract.status,'principal_amount',v_contract.principal_amount,
    'annual_rate',v_contract.annual_rate,'tenor_months',v_contract.tenor_months,'terms_version',v_contract.terms_version,
    'application_version',p_expected_version+1,'created_at',v_contract.created_at);
end;
$$;

create or replace function public.sp_financing_verify_contract_signature(
  p_user_id uuid,
  p_contract_id uuid,
  p_expected_application_version integer,
  p_external_signature_ref text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_contract public.sp_financing_contracts%rowtype;
  v_app public.sp_financing_applications%rowtype;
  v_account public.sp_financing_loan_accounts%rowtype;
begin
  if not exists (select 1 from public.sp_financing_user_roles
    where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','COMPLIANCE')) then
    raise exception 'signature_verifier_required';
  end if;
  if length(trim(coalesce(p_external_signature_ref,''))) < 6 or length(p_external_signature_ref) > 200 then
    raise exception 'signature_evidence_required';
  end if;
  select * into v_contract from public.sp_financing_contracts where id=p_contract_id for update;
  if not found then raise exception 'contract_not_found'; end if;
  if v_contract.status <> 'PENDING_SIGNATURE' then raise exception 'contract_not_pending_signature'; end if;
  if v_contract.created_by=p_user_id then raise exception 'maker_checker_violation'; end if;
  select * into v_app from public.sp_financing_applications where id=v_contract.application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.version <> p_expected_application_version then raise exception 'version_conflict'; end if;
  if v_app.status <> 'OFFERED' then raise exception 'application_not_offered'; end if;

  update public.sp_financing_contracts set status='SIGNED', signed_at=now(),
    external_signature_ref=trim(p_external_signature_ref), updated_at=now()
    where id=p_contract_id returning * into v_contract;
  update public.sp_financing_applications set status='CONTRACTED', version=version+1, updated_at=now()
    where id=v_app.id and version=p_expected_application_version;
  insert into public.sp_financing_loan_accounts(
    contract_id, account_number, principal_amount, outstanding_principal, currency, status
  ) values (
    v_contract.id,
    'SPL-' || to_char(clock_timestamp() at time zone 'UTC','YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    v_contract.principal_amount, v_contract.principal_amount, 'IDR', 'PENDING_DISBURSEMENT'
  ) returning * into v_account;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'CONTRACT_SIGNATURE_VERIFIED','financing_contract',v_contract.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('application_id',v_app.id,'signature_reference',trim(p_external_signature_ref),
        'loan_account_id',v_account.id,'application_version',p_expected_application_version+1));
  return jsonb_build_object('contract_id',v_contract.id,'contract_number',v_contract.contract_number,
    'contract_status',v_contract.status,'application_id',v_app.id,'application_status','CONTRACTED',
    'application_version',p_expected_application_version+1,'loan_account_id',v_account.id,
    'account_number',v_account.account_number,'loan_account_status',v_account.status);
end;
$$;

create or replace function public.sp_financing_create_disbursement_request(
  p_user_id uuid,
  p_loan_account_id uuid,
  p_amount numeric,
  p_beneficiary_ref text,
  p_idempotency_key text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_account public.sp_financing_loan_accounts%rowtype;
  v_existing public.sp_financing_disbursement_requests%rowtype;
  v_request public.sp_financing_disbursement_requests%rowtype;
begin
  if not exists (select 1 from public.sp_financing_user_roles
    where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','DISBURSEMENT_MAKER')) then
    raise exception 'disbursement_maker_required';
  end if;
  if length(coalesce(p_idempotency_key,'')) < 8 or length(p_idempotency_key) > 128
    or length(trim(coalesce(p_beneficiary_ref,''))) < 3 or length(p_beneficiary_ref) > 160
    or p_amount is null or p_amount <= 0 then raise exception 'invalid_disbursement_request'; end if;
  select * into v_account from public.sp_financing_loan_accounts where id=p_loan_account_id for update;
  if not found then raise exception 'loan_account_not_found'; end if;
  select * into v_existing from public.sp_financing_disbursement_requests where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.loan_account_id <> p_loan_account_id or v_existing.amount <> p_amount or v_existing.beneficiary_ref <> trim(p_beneficiary_ref) then
      raise exception 'idempotency_conflict';
    end if;
    return jsonb_build_object('id',v_existing.id,'status',v_existing.status,'idempotent_replay',true);
  end if;
  if v_account.status <> 'PENDING_DISBURSEMENT' then raise exception 'loan_not_pending_disbursement'; end if;
  if p_amount <> v_account.principal_amount then raise exception 'partial_disbursement_not_supported'; end if;
  insert into public.sp_financing_disbursement_requests(
    loan_account_id,amount,beneficiary_ref,status,maker_user_id,idempotency_key
  ) values (
    p_loan_account_id,p_amount,trim(p_beneficiary_ref),'PENDING_APPROVAL',p_user_id,p_idempotency_key
  ) returning * into v_request;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'DISBURSEMENT_REQUEST_CREATED','disbursement_request',v_request.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('loan_account_id',p_loan_account_id,'amount',p_amount,'currency','IDR','status',v_request.status));
  return jsonb_build_object('id',v_request.id,'loan_account_id',v_request.loan_account_id,
    'amount',v_request.amount,'status',v_request.status,'idempotent_replay',false,'created_at',v_request.created_at);
end;
$$;

create or replace function public.sp_financing_approve_disbursement(
  p_user_id uuid,
  p_request_id uuid,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_request public.sp_financing_disbursement_requests%rowtype;
begin
  if not exists (select 1 from public.sp_financing_user_roles
    where user_id=p_user_id and active=true and role in ('FINANCING_ADMIN','DISBURSEMENT_CHECKER')) then
    raise exception 'disbursement_checker_required';
  end if;
  select * into v_request from public.sp_financing_disbursement_requests where id=p_request_id for update;
  if not found then raise exception 'disbursement_request_not_found'; end if;
  if v_request.status <> 'PENDING_APPROVAL' then raise exception 'disbursement_not_pending_approval'; end if;
  if v_request.maker_user_id=p_user_id then raise exception 'maker_checker_violation'; end if;
  update public.sp_financing_disbursement_requests set status='APPROVED',checker_user_id=p_user_id,updated_at=now()
    where id=p_request_id returning * into v_request;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'DISBURSEMENT_APPROVED','disbursement_request',v_request.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('loan_account_id',v_request.loan_account_id,'amount',v_request.amount,
        'maker_user_id',v_request.maker_user_id,'checker_user_id',p_user_id,'status',v_request.status));
  return jsonb_build_object('id',v_request.id,'status',v_request.status,'maker_user_id',v_request.maker_user_id,
    'checker_user_id',v_request.checker_user_id,'loan_account_id',v_request.loan_account_id,
    'amount',v_request.amount,'money_moved',false);
end;
$$;

-- Generic status transitions must not mark an offer as contracted.
-- The only allowed path to CONTRACTED is the audited signature-verification RPC above.
create or replace function public.sp_financing_transition_application(
  p_user_id uuid,
  p_application_id uuid,
  p_expected_version integer,
  p_target_status text,
  p_reason text,
  p_correlation_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_app public.sp_financing_applications%rowtype;
  v_allowed boolean := false;
  v_old_status text;
begin
  if p_user_id is null then raise exception 'actor_required'; end if;
  if length(coalesce(p_reason,'')) < 3 or length(p_reason) > 1000 then raise exception 'reason_required'; end if;
  select * into v_app from public.sp_financing_applications where id=p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_app.version <> p_expected_version then raise exception 'version_conflict'; end if;
  v_allowed := case v_app.status
    when 'NEW' then p_target_status in ('SUBMITTED','CANCELLED')
    when 'SUBMITTED' then p_target_status in ('DOCUMENTS_PENDING','VERIFICATION','CANCELLED')
    when 'DOCUMENTS_PENDING' then p_target_status in ('VERIFICATION','CANCELLED')
    when 'VERIFICATION' then p_target_status in ('CREDIT_REVIEW','REFERRED','DOCUMENTS_PENDING','CANCELLED')
    when 'REFERRED' then p_target_status in ('CREDIT_REVIEW','DECLINED','CANCELLED')
    when 'CREDIT_REVIEW' then p_target_status in ('APPROVED','DECLINED','REFERRED')
    when 'APPROVED' then p_target_status in ('OFFERED','CANCELLED')
    when 'OFFERED' then p_target_status = 'CANCELLED'
    when 'CONTRACTED' then p_target_status = 'BOOKED'
    else false
  end;
  if not v_allowed then raise exception 'invalid_state_transition'; end if;
  v_old_status := v_app.status;
  update public.sp_financing_applications set status=p_target_status,version=version+1,updated_at=now()
    where id=p_application_id and version=p_expected_version returning * into v_app;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'APPLICATION_STATUS_CHANGED','financing_application',v_app.id::text,
      coalesce(nullif(p_correlation_id,''),gen_random_uuid()::text),'SUCCESS',
      jsonb_build_object('from',v_old_status,'to',p_target_status,'reason',p_reason,'version',v_app.version));
  return jsonb_build_object('id',v_app.id,'application_number',v_app.application_number,'status',v_app.status,
    'version',v_app.version,'updated_at',v_app.updated_at);
end;
$$;

revoke all on function public.sp_financing_create_contract(uuid,uuid,integer,text,text) from public, anon, authenticated;
revoke all on function public.sp_financing_verify_contract_signature(uuid,uuid,integer,text,text) from public, anon, authenticated;
revoke all on function public.sp_financing_create_disbursement_request(uuid,uuid,numeric,text,text,text) from public, anon, authenticated;
revoke all on function public.sp_financing_approve_disbursement(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.sp_financing_create_contract(uuid,uuid,integer,text,text) to service_role;
grant execute on function public.sp_financing_verify_contract_signature(uuid,uuid,integer,text,text) to service_role;
grant execute on function public.sp_financing_create_disbursement_request(uuid,uuid,numeric,text,text,text) to service_role;
grant execute on function public.sp_financing_approve_disbursement(uuid,uuid,text) to service_role;
