
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the collection activity notification generator to run daily at 8 AM GMT+3
-- Note: pg_cron uses UTC internally, so 8 AM GMT+3 = 5 AM UTC
SELECT cron.schedule(
  'daily-collection-activity-notifications',
  '0 5 * * *', -- 5:00 AM UTC (8:00 AM GMT+3)
  $$SELECT generate_collection_activity_notifications();$$
);

-- Verify the scheduled job was created
SELECT * FROM cron.job WHERE jobname = 'daily-collection-activity-notifications';
