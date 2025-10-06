-- Create storage bucket for static pages if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('static-pages', 'static-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to static pages
CREATE POLICY "Public read access for static pages"
ON storage.objects FOR SELECT
USING (bucket_id = 'static-pages');

-- Allow service role to upload/update static pages
CREATE POLICY "Service role can manage static pages"
ON storage.objects FOR ALL
USING (bucket_id = 'static-pages' AND auth.role() = 'service_role');

-- Schedule weekly regeneration of catalog pages (every Sunday at 2 AM)
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