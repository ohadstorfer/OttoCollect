-- Rollback for 20260515120000_seo_event_driven_static_regeneration.sql

DROP TRIGGER IF EXISTS regenerate_static_pages_on_country_visible ON public.countries;
DROP FUNCTION IF EXISTS public.trigger_regenerate_static_pages();

-- Restore the weekly cron job (Sundays 02:00 UTC).
SELECT cron.schedule(
  'weekly-catalog-pages-generation',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-catalog-pages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mzg1OTQ1OSwiZXhwIjoyMDU5NDM1NDU5fQ.gQpT6k-uRxBECIGdp5jO3O2RSCxKUj3hHLAO6fwHt7M"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
