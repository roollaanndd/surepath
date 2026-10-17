-- Restrict website CMS writes to platform administrators.
-- Public/anonymous SELECT remains open so the marketing site can render CMS content.
-- The previous authenticated-write policy allowed any signed-in account to
-- edit the public website configuration directly through the Supabase client.

DROP POLICY IF EXISTS "website_config_authenticated_write" ON public.sp_website_config;
DROP POLICY IF EXISTS "website_config_admin_write" ON public.sp_website_config;

CREATE POLICY "website_config_admin_write"
  ON public.sp_website_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sp_users AS u
      WHERE u.id = auth.uid()
        AND u.role IN ('MASTER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sp_users AS u
      WHERE u.id = auth.uid()
        AND u.role IN ('MASTER_ADMIN', 'ADMIN')
    )
  );

COMMENT ON POLICY "website_config_admin_write" ON public.sp_website_config IS
  'Only MASTER_ADMIN and ADMIN may modify CMS sections; public read remains available to render the marketing website.';
