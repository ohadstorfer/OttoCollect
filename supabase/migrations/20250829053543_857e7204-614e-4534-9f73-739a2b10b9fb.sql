-- Create function to monitor database connections
CREATE OR REPLACE FUNCTION public.monitor_connections()
RETURNS TABLE(
  pid integer,
  usename text,
  application_name text,
  client_addr inet,
  backend_start timestamp with time zone,
  state text,
  query text,
  wait_event_type text,
  wait_event text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    pg_stat_activity.pid,
    pg_stat_activity.usename,
    pg_stat_activity.application_name,
    pg_stat_activity.client_addr,
    pg_stat_activity.backend_start,
    pg_stat_activity.state,
    pg_stat_activity.query,
    pg_stat_activity.wait_event_type,
    pg_stat_activity.wait_event
  FROM pg_stat_activity
  WHERE pg_stat_activity.state IS NOT NULL
    AND pg_stat_activity.pid != pg_backend_pid()
  ORDER BY pg_stat_activity.backend_start DESC;
$$;

-- Create function to help set up monitoring
CREATE OR REPLACE FUNCTION public.create_monitoring_function()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'Connection monitoring function is ready'::text;
$$;