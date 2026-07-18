-- cleanup-loadtest-accounts.sql — removes accounts created by
-- tests/load/k6-100-users.js (email pattern: loadtest_k6_*@loadtest.invalid).
--
-- Run this in the Supabase SQL Editor (or via execute_sql) after a k6 run
-- against a real project. Safe: only ever matches the synthetic
-- @loadtest.invalid domain used exclusively by the load test script.
--
-- Run the SELECT first to confirm the row count looks right before deleting.

-- 1) Preview what will be deleted:
SELECT count(*) AS sp_users_to_delete
FROM public.sp_users
WHERE email LIKE 'loadtest_k6_%@loadtest.invalid';

-- 2) Delete the SurePath profile rows (sp_users has no FK cascade from
--    auth.users, so this must run before or independently of step 3):
DELETE FROM public.sp_users
WHERE email LIKE 'loadtest_k6_%@loadtest.invalid';

-- 3) Delete the underlying Supabase Auth users. This requires the
--    Admin API (service_role), not plain SQL — auth.users is managed by
--    GoTrue. Run this from a Node/shell script with the service role key:
--
--    for id in $(psql "$DATABASE_URL" -tA -c \
--      "select id from auth.users where email like 'loadtest_k6_%@loadtest.invalid'"); do
--      curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/$id" \
--        -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "apikey: $SERVICE_ROLE_KEY"
--    done
--
--    Or, if direct SQL access to auth.users is available to your role:
-- DELETE FROM auth.users WHERE email LIKE 'loadtest_k6_%@loadtest.invalid';
