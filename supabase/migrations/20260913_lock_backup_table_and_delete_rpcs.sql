-- APPLIED TO PRODUCTION 2026-09-13.
--
-- Two findings from the Supabase security advisor, both reachable with nothing
-- more than the public anon key that ships in the browser bundle.

-- 1. sp_db_object_backup stores the SQL `definition` of database objects —
--    functions, triggers, policies. RLS was never enabled, so it was readable
--    by anyone: a map of the server-side security logic. Deny-all (no policy)
--    matches how every other sensitive table in this schema is protected; the
--    data-gateway reaches it with service_role, which bypasses RLS.
alter table public.sp_db_object_backup enable row level security;

-- 2. soft_delete() is SECURITY DEFINER and only checks that the caller is
--    signed in — no ownership check at all. Any authenticated customer holding
--    a row id could soft-delete another agent's commissions, withdrawals or
--    payments. force_delete() does gate on is_admin(), but neither function is
--    called from application code (verified across services/, components/ and
--    supabase/functions/): they are operator tools, so PUBLIC never needed
--    EXECUTE. service_role keeps its own grant and is unaffected.
revoke execute on function public.soft_delete(text, uuid, text) from public;
revoke execute on function public.force_delete(text, uuid, text) from public;
