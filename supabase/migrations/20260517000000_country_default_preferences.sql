-- Admin-configurable per-country catalog display defaults.
-- Two profiles per country:
--   - 'anonymous': applied to visitors without a session
--   - 'new_user' : applied at signup via create_complete_user_filter_preferences

-- 1. Enum for audience
DO $$ BEGIN
  CREATE TYPE catalog_default_audience AS ENUM ('anonymous', 'new_user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.country_default_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  audience catalog_default_audience NOT NULL,
  group_mode boolean NOT NULL DEFAULT true,
  view_mode text NOT NULL DEFAULT 'grid' CHECK (view_mode IN ('grid','list')),
  images_only boolean NOT NULL DEFAULT true,
  selected_categories uuid[] NOT NULL DEFAULT '{}',
  selected_types uuid[] NOT NULL DEFAULT '{}',
  selected_sort_options uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT country_default_preferences_unique UNIQUE (country_id, audience)
);

CREATE INDEX IF NOT EXISTS idx_country_default_preferences_country_id
  ON public.country_default_preferences(country_id);

-- 3. RLS
ALTER TABLE public.country_default_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read country default preferences"
  ON public.country_default_preferences;
CREATE POLICY "Anyone can read country default preferences"
  ON public.country_default_preferences
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage country default preferences"
  ON public.country_default_preferences;
CREATE POLICY "Super admins can manage country default preferences"
  ON public.country_default_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

DROP POLICY IF EXISTS "Country admins can manage their country defaults"
  ON public.country_default_preferences;
CREATE POLICY "Country admins can manage their country defaults"
  ON public.country_default_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.countries c ON c.id = country_default_preferences.country_id
      WHERE p.id = auth.uid()
      AND p.role = c.name || ' Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.countries c ON c.id = country_default_preferences.country_id
      WHERE p.id = auth.uid()
      AND p.role = c.name || ' Admin'
    )
  );

-- 4. Seed: one row per (country, audience). Mirrors current hardcoded behavior
-- so existing users / anonymous visitors see no change until admins customize.
INSERT INTO public.country_default_preferences (
  country_id, audience, group_mode, view_mode, images_only,
  selected_categories, selected_types, selected_sort_options
)
SELECT
  c.id,
  'anonymous'::catalog_default_audience,
  false,            -- matches today's anonymous group_mode fallback
  'grid',
  true,
  COALESCE((SELECT array_agg(id) FROM public.banknote_category_definitions WHERE country_id = c.id), '{}'::uuid[]),
  COALESCE((SELECT array_agg(id) FROM public.banknote_type_definitions     WHERE country_id = c.id), '{}'::uuid[]),
  COALESCE((SELECT array_agg(id) FROM public.banknote_sort_options         WHERE country_id = c.id), '{}'::uuid[])
FROM public.countries c
ON CONFLICT (country_id, audience) DO NOTHING;

INSERT INTO public.country_default_preferences (
  country_id, audience, group_mode, view_mode, images_only,
  selected_categories, selected_types, selected_sort_options
)
SELECT
  c.id,
  'new_user'::catalog_default_audience,
  true,             -- matches today's signup trigger
  'grid',
  true,
  COALESCE((SELECT array_agg(id) FROM public.banknote_category_definitions WHERE country_id = c.id), '{}'::uuid[]),
  COALESCE((SELECT array_agg(id) FROM public.banknote_type_definitions     WHERE country_id = c.id), '{}'::uuid[]),
  COALESCE((SELECT array_agg(id) FROM public.banknote_sort_options         WHERE country_id = c.id), '{}'::uuid[])
FROM public.countries c
ON CONFLICT (country_id, audience) DO NOTHING;

-- 5. Replace signup trigger to read from country_default_preferences.
-- Falls back to "all options" if no defaults row exists for the country.
CREATE OR REPLACE FUNCTION public.create_complete_user_filter_preferences(
  user_id_param UUID,
  country_id_param UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  defaults RECORD;
  fallback_categories UUID[];
  fallback_types UUID[];
  fallback_sort_options UUID[];
BEGIN
  SELECT
    selected_categories,
    selected_types,
    selected_sort_options,
    group_mode,
    view_mode,
    images_only
  INTO defaults
  FROM public.country_default_preferences
  WHERE country_id = country_id_param
    AND audience = 'new_user';

  IF defaults IS NULL THEN
    SELECT array_agg(id) INTO fallback_categories
    FROM public.banknote_category_definitions WHERE country_id = country_id_param;
    SELECT array_agg(id) INTO fallback_types
    FROM public.banknote_type_definitions WHERE country_id = country_id_param;
    SELECT array_agg(id) INTO fallback_sort_options
    FROM public.banknote_sort_options WHERE country_id = country_id_param;

    INSERT INTO public.user_filter_preferences (
      user_id, country_id,
      selected_categories, selected_types, selected_sort_options,
      group_mode, view_mode, images_only
    ) VALUES (
      user_id_param, country_id_param,
      COALESCE(fallback_categories,   ARRAY[]::uuid[]),
      COALESCE(fallback_types,        ARRAY[]::uuid[]),
      COALESCE(fallback_sort_options, ARRAY[]::uuid[]),
      true, 'grid', true
    )
    ON CONFLICT (user_id, country_id) DO UPDATE SET
      selected_categories   = EXCLUDED.selected_categories,
      selected_types        = EXCLUDED.selected_types,
      selected_sort_options = EXCLUDED.selected_sort_options,
      updated_at = now();
    RETURN;
  END IF;

  INSERT INTO public.user_filter_preferences (
    user_id, country_id,
    selected_categories, selected_types, selected_sort_options,
    group_mode, view_mode, images_only
  ) VALUES (
    user_id_param, country_id_param,
    defaults.selected_categories,
    defaults.selected_types,
    defaults.selected_sort_options,
    defaults.group_mode,
    defaults.view_mode,
    defaults.images_only
  )
  ON CONFLICT (user_id, country_id) DO UPDATE SET
    selected_categories   = EXCLUDED.selected_categories,
    selected_types        = EXCLUDED.selected_types,
    selected_sort_options = EXCLUDED.selected_sort_options,
    updated_at = now();
END;
$$;

-- 6. Seed a defaults row whenever a new country is created.
-- Runs BEFORE the existing on_country_created_filter_preferences trigger so
-- the trigger function sees the freshly-inserted defaults.
CREATE OR REPLACE FUNCTION public.seed_country_default_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.country_default_preferences (country_id, audience, group_mode, view_mode, images_only)
  VALUES
    (NEW.id, 'anonymous', false, 'grid', true),
    (NEW.id, 'new_user',  true,  'grid', true)
  ON CONFLICT (country_id, audience) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_country_created_seed_defaults ON public.countries;
CREATE TRIGGER on_country_created_seed_defaults
  AFTER INSERT ON public.countries
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_country_default_preferences();
