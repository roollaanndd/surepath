-- Internal security/audit tables are written by trusted server-side code only.
-- RLS without policies denies row access, but client roles should not have table
-- privileges at all. Keep service_role grants intact for data-gateway/maintenance.
REVOKE ALL PRIVILEGES ON TABLE public.sp_activity_log
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.sp_db_object_backup
  FROM PUBLIC, anon, authenticated;
