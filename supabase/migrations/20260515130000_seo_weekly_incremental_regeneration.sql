-- Weekly incremental regeneration of banknote and country-catalog pages.
-- Calls generate-catalog-pages with {since: now()-7days}. The edge function's
-- incremental mode only regenerates banknotes whose updated_at >= since and
-- whose country.is_visible = true, plus those countries' catalog pages.
-- Forum/blog/marketplace pages are not touched by this cron — they are
-- regenerated only when a country becomes visible (see 20260515120000_*.sql).

SELECT cron.schedule(
  'weekly-incremental-banknote-regeneration',
  '0 3 * * 0', -- Sundays at 03:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-catalog-pages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbnpvbG91bmZ3Z3ZrdXBlcHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mzg1OTQ1OSwiZXhwIjoyMDU5NDM1NDU5fQ.gQpT6k-uRxBECIGdp5jO3O2RSCxKUj3hHLAO6fwHt7M"}'::jsonb,
    body := jsonb_build_object(
      'since',
      to_char((now() - interval '7 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  ) as request_id;
  $$
);
