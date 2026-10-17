-- Allow a user to hold multiple least-privilege financing roles.
alter table public.sp_financing_user_roles drop constraint if exists sp_financing_user_roles_pkey;
alter table public.sp_financing_user_roles add constraint sp_financing_user_roles_pkey primary key (user_id, role);
