-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly sitemap generation (every Monday at 2 AM UTC)
SELECT cron.schedule(
  'weekly-sitemap-generation',
  '0 2 * * 1',
  $$
  SELECT
    net.http_post(
      url:='https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-sitemap',
      headers:='{"Content-Type": "application/xml"}'::jsonb
    ) as request_id;
  $$
);

-- Also create a function to manually trigger sitemap regeneration
CREATE OR REPLACE FUNCTION trigger_sitemap_generation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- This function can be called manually to regenerate the sitemap
  SELECT net.http_post(
    url := 'https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-sitemap',
    headers := '{"Content-Type": "application/xml"}'::jsonb
  ) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Sitemap generation triggered',
    'timestamp', now()
  );
END;
$$;

-- Grant execute permission to authenticated users (admins only should call this)
GRANT EXECUTE ON FUNCTION trigger_sitemap_generation() TO authenticated;