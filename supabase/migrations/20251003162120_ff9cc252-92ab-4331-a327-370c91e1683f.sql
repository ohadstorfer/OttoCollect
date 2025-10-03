-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Now update the sitemap generation function to use pg_net correctly
CREATE OR REPLACE FUNCTION trigger_sitemap_generation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  request_id bigint;
BEGIN
  -- Make HTTP request using pg_net
  SELECT net.http_post(
    url := 'https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-sitemap',
    headers := '{"Content-Type": "application/xml"}'::jsonb
  ) INTO request_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Sitemap generation triggered',
    'request_id', request_id,
    'timestamp', now()
  );
END;
$$;