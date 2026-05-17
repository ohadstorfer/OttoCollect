-- Static-page regeneration is now event-driven: it fires only when a country
-- (catalog) is made visible from the admin dashboard. The previous weekly cron
-- is no longer needed and is unscheduled here.

-- 1. Drop the weekly cron job set up in 20251006173113_*.sql.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-catalog-pages-generation') THEN
    PERFORM cron.unschedule('weekly-catalog-pages-generation');
  END IF;
END $$;

-- 2. Trigger function that calls the generate-catalog-pages edge function.
--    Uses pg_try_advisory_xact_lock so that bulk updates affecting multiple
--    countries in one transaction result in a single regeneration call.
CREATE OR REPLACE FUNCTION public.trigger_regenerate_static_pages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_lock_key CONSTANT bigint := 5247901234567890;
BEGIN
  -- Only act on transitions into the visible state.
  IF NEW.is_visible IS NOT TRUE THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_visible IS TRUE THEN
    RETURN NULL;
  END IF;

  -- Coalesce concurrent rows in the same transaction.
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := 'https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-catalog-pages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mzg1OTQ1OSwiZXhwIjoyMDU5NDM1NDU5fQ.gQpT6k-uRxBECIGdp5jO3O2RSCxKUj3hHLAO6fwHt7M"}'::jsonb,
    body := '{}'::jsonb
  );

  RETURN NULL;
END $$;

-- 3. Trigger on countries: fires on INSERT or UPDATE of is_visible.
DROP TRIGGER IF EXISTS regenerate_static_pages_on_country_visible ON public.countries;
CREATE TRIGGER regenerate_static_pages_on_country_visible
AFTER INSERT OR UPDATE OF is_visible ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_regenerate_static_pages();
