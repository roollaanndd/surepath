-- Serialize duplicate idempotent application submissions.
create or replace function public.sp_financing_create_application(
  p_user_id uuid,
  p_customer_type text,
  p_customer_name text,
  p_product_code text,
  p_amount numeric,
  p_tenor_months integer,
  p_source_channel text,
  p_notes text,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous public.sp_financing_idempotency%rowtype;
  v_customer_id uuid;
  v_product_id uuid;
  v_application public.sp_financing_applications%rowtype;
  v_response jsonb;
begin
  if p_user_id is null then raise exception 'actor_required'; end if;
  if p_customer_type not in ('INDIVIDUAL','BUSINESS') then raise exception 'invalid_customer_type'; end if;
  if length(trim(p_customer_name)) < 2 or length(trim(p_customer_name)) > 160 then raise exception 'invalid_customer_name'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000000 then raise exception 'invalid_amount'; end if;
  if p_tenor_months is null or p_tenor_months < 1 or p_tenor_months > 240 then raise exception 'invalid_tenor'; end if;
  if p_source_channel not in ('DIRECT','DEALER','MERCHANT','PARTNER','MANUAL') then raise exception 'invalid_source_channel'; end if;
  if length(coalesce(p_notes,'')) > 2000 then raise exception 'notes_too_long'; end if;
  if length(coalesce(p_idempotency_key,'')) < 8 or length(p_idempotency_key) > 128 then raise exception 'idempotency_key_required'; end if;

  -- Serialize concurrent requests with the same user/key before checking idempotency.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext(p_idempotency_key));
  select * into v_previous from public.sp_financing_idempotency
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_previous.request_hash <> p_request_hash then raise exception 'idempotency_conflict'; end if;
    if v_previous.response_body is not null then return v_previous.response_body; end if;
    raise exception 'idempotency_in_progress';
  end if;

  insert into public.sp_financing_idempotency(user_id,idempotency_key,request_hash)
    values (p_user_id,p_idempotency_key,p_request_hash);

  select id into v_product_id from public.sp_financing_products where code = p_product_code and active = true;
  if v_product_id is null then raise exception 'product_unavailable'; end if;

  insert into public.sp_financing_customers(customer_type,display_name,created_by)
    values (p_customer_type,trim(p_customer_name),p_user_id) returning id into v_customer_id;

  insert into public.sp_financing_applications(
    application_number,customer_id,product_id,requested_amount,requested_tenor_months,
    source_channel,notes,created_by
  ) values (
    'SPF-' || to_char(clock_timestamp() at time zone 'UTC','YYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    v_customer_id,v_product_id,p_amount,p_tenor_months,p_source_channel,coalesce(p_notes,''),p_user_id
  ) returning * into v_application;

  v_response := jsonb_build_object(
    'id',v_application.id,
    'application_number',v_application.application_number,
    'customer_id',v_customer_id,
    'product_code',p_product_code,
    'requested_amount',v_application.requested_amount,
    'currency',v_application.currency,
    'requested_tenor_months',v_application.requested_tenor_months,
    'status',v_application.status,
    'version',v_application.version,
    'created_at',v_application.created_at
  );

  update public.sp_financing_idempotency set response_body=v_response,status_code=201
    where user_id=p_user_id and idempotency_key=p_idempotency_key;
  insert into public.sp_financing_audit_events(actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details)
    values (p_user_id,'APPLICATION_CREATED','financing_application',v_application.id::text,p_idempotency_key,'SUCCESS',
      jsonb_build_object('product_code',p_product_code,'amount',p_amount,'currency','IDR','tenor_months',p_tenor_months));
  return v_response;
end;
$$;

