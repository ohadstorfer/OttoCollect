-- Schedule daily collection activity notifications for 7 AM GMT+3 (4 AM UTC)
-- Enable required extensions if not already enabled
DO $$
BEGIN
  -- Enable pg_cron extension if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Extension might already be enabled by Supabase
    NULL;
END;
$$;

-- Schedule the daily collection activity notifications
-- Runs at 4 AM UTC (7 AM GMT+3) every day
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('daily-collection-notifications');
EXCEPTION
  WHEN OTHERS THEN
    -- Job might not exist, continue
    NULL;
END;
$$;

-- Schedule new job
SELECT cron.schedule(
  'daily-collection-notifications',
  '0 4 * * *', -- 4 AM UTC (7 AM GMT+3) daily
  $$SELECT public.generate_collection_activity_notifications();$$
);