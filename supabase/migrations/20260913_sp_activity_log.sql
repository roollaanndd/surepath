-- APPLIED TO PRODUCTION 2026-09-13.
--
-- Per-user activity log.
--
-- Why a new table rather than reusing sp_audit_log: that one is row-change
-- shaped (table_name, row_id, old_data, new_data) and answers "what changed in
-- the database". This answers a different question — "what did this person do,
-- and what did they look at" — which includes reads that change nothing at all.
create table if not exists public.sp_activity_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  actor_role  text,
  action      text not null,
  target_id   text,
  status      text not null check (status in ('OK', 'DENIED', 'ERROR')),
  http_status int,
  duration_ms int,
  -- Key names only. Payloads here carry KTP numbers, base64 photos and
  -- passwords; an audit table is the wrong place for a second copy of them.
  param_keys  text[],
  ip          text,
  user_agent  text
);

create index if not exists sp_activity_log_actor_idx   on public.sp_activity_log (actor_id, created_at desc);
create index if not exists sp_activity_log_created_idx on public.sp_activity_log (created_at desc);
create index if not exists sp_activity_log_action_idx  on public.sp_activity_log (action, created_at desc);

alter table public.sp_activity_log enable row level security;

comment on table public.sp_activity_log is
  'Per-user activity trail written by the data-gateway dispatcher. Values of request params are never stored — only their key names.';
