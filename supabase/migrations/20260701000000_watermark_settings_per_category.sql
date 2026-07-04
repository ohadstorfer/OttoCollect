-- Allow per-category watermark settings, in addition to the per-country default.
--
-- `category_id` NULL means the country-wide default ("All categories"). A row
-- with a concrete `category_id` overrides the default for that single category.
-- Absence of any matching row still means "use the app defaults".

ALTER TABLE public.watermark_settings
  ADD COLUMN IF NOT EXISTS category_id uuid
  REFERENCES public.banknote_category_definitions(id) ON DELETE CASCADE;

-- Replace the country-only uniqueness with (country_id, category_id).
-- NULLS NOT DISTINCT keeps at most one country-wide row (category_id IS NULL)
-- per country, while still allowing one row per concrete category.
ALTER TABLE public.watermark_settings
  DROP CONSTRAINT IF EXISTS watermark_settings_country_id_key;

ALTER TABLE public.watermark_settings
  DROP CONSTRAINT IF EXISTS watermark_settings_country_category_key;

ALTER TABLE public.watermark_settings
  ADD CONSTRAINT watermark_settings_country_category_key
  UNIQUE NULLS NOT DISTINCT (country_id, category_id);

CREATE INDEX IF NOT EXISTS idx_watermark_settings_country_category
  ON public.watermark_settings(country_id, category_id);
