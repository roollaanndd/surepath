-- Financing application evidence, layered approvals, and finance reporting.
-- Private evidence storage; approval decisions are role-gated and audited.
create table if not exists public.sp_financing_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.sp_financing_applications(id) on delete restrict,
  document_type text not null check (document_type in ('IDENTITY','PROOF_OF_ADDRESS','INCOME_OR_BANK_STATEMENT','BUSINESS_REGISTRATION','TAX_DOCUMENT','FINANCIAL_STATEMENT','COLLATERAL','SIGNED_CONSENT','OTHER')),
  file_name text not null check (length(trim(file_name)) between 1 and 180),
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[a-fA-F0-9]{64}$'),
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  verification_note text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  verified_at timestamptz
);
create index if not exists sp_financing_application_documents_app_idx
 on public.sp_financing_application_documents(application_id,created_at desc);

create table if not exists public.sp_financing_approval_steps (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.sp_financing_applications(id) on delete restrict,
  step_order integer not null check (step_order between 1 and 10),
  step_code text not null check (step_code ~ '^[A-Z][A-Z0-9_]{1,59}$'),
  step_label text not null check (length(trim(step_label)) between 2 and 100),
  required_role text not null check (required_role in ('ORIGINATION','VERIFICATION_ANALYST','CREDIT_ANALYST','CREDIT_APPROVER','SERVICING_FINANCE','FINANCING_ADMIN')),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','SKIPPED')),
  decision_note text,
  requested_by uuid not null references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique(application_id,step_order),
  unique(application_id,step_code),
  check ((status='PENDING' and decided_by is null and decided_at is null) or (status<>'PENDING' and decided_by is not null and decided_at is not null))
);
create index if not exists sp_financing_approval_steps_queue_idx
 on public.sp_financing_approval_steps(status,required_role,step_order,created_at);
create index if not exists sp_financing_approval_steps_app_idx
 on public.sp_financing_approval_steps(application_id,step_order);

alter table public.sp_financing_application_documents enable row level security;
alter table public.sp_financing_approval_steps enable row level security;
revoke all on public.sp_financing_application_documents from anon,authenticated;
revoke all on public.sp_financing_approval_steps from anon,authenticated;
grant select on public.sp_financing_application_documents,public.sp_financing_approval_steps to service_role;
grant insert,update,delete on public.sp_financing_application_documents,public.sp_financing_approval_steps to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('financing-application-documents','financing-application-documents',false,10485760,
 array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=10485760,
 allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "financing evidence authorized upload" on storage.objects;
create policy "financing evidence authorized upload" on storage.objects
 for insert to authenticated
 with check (
  bucket_id='financing-application-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and exists(select 1 from public.sp_financing_user_roles r
   where r.user_id=(select auth.uid()) and r.active=true
    and r.role in ('FINANCING_ADMIN','ORIGINATION','VERIFICATION_ANALYST','CREDIT_ANALYST','CREDIT_APPROVER','SERVICING_FINANCE','COMPLIANCE'))
 );
drop policy if exists "financing evidence authorized read" on storage.objects;
create policy "financing evidence authorized read" on storage.objects
 for select to authenticated
 using (
  bucket_id='financing-application-documents'
  and exists(select 1 from public.sp_financing_user_roles r
   where r.user_id=(select auth.uid()) and r.active=true
    and r.role in ('FINANCING_ADMIN','ORIGINATION','VERIFICATION_ANALYST','CREDIT_ANALYST','CREDIT_APPROVER','SERVICING_FINANCE','COMPLIANCE','AUDITOR'))
 );
drop policy if exists "financing evidence authorized delete" on storage.objects;
create policy "financing evidence authorized delete" on storage.objects
 for delete to authenticated
 using (
  bucket_id='financing-application-documents'
  and exists(select 1 from public.sp_financing_user_roles r
   where r.user_id=(select auth.uid()) and r.active=true
    and r.role in ('FINANCING_ADMIN','ORIGINATION'))
 );

comment on table public.sp_financing_application_documents is 'Private object metadata for financing application evidence; document bytes are stored in the private financing-application-documents bucket.';
comment on table public.sp_financing_approval_steps is 'Sequential layered approval workflow. No approval step is actionable until all earlier steps are approved.';
