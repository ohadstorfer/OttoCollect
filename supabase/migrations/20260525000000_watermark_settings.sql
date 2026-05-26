-- Per-country watermark settings for the admin watermark tool.
-- One row per country; absence of a row means "use the app defaults".

CREATE TABLE IF NOT EXISTS public.watermark_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL UNIQUE REFERENCES public.countries(id) ON DELETE CASCADE,
  width_ratio_portrait double precision NOT NULL,
  width_ratio_landscape double precision NOT NULL,
  padding_x_ratio_portrait double precision NOT NULL,
  padding_y_ratio_portrait double precision NOT NULL,
  padding_x_ratio_landscape double precision NOT NULL,
  padding_y_ratio_landscape double precision NOT NULL,
  opacity double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_watermark_settings_country_id
  ON public.watermark_settings(country_id);

-- RLS: public read, admin write (mirrors country_default_preferences).
ALTER TABLE public.watermark_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read watermark settings"
  ON public.watermark_settings;
CREATE POLICY "Anyone can read watermark settings"
  ON public.watermark_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage watermark settings"
  ON public.watermark_settings;
CREATE POLICY "Super admins can manage watermark settings"
  ON public.watermark_settings
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

DROP POLICY IF EXISTS "Country admins can manage their watermark settings"
  ON public.watermark_settings;
CREATE POLICY "Country admins can manage their watermark settings"
  ON public.watermark_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.countries c ON c.id = watermark_settings.country_id
      WHERE p.id = auth.uid()
      AND p.role = c.name || ' Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.countries c ON c.id = watermark_settings.country_id
      WHERE p.id = auth.uid()
      AND p.role = c.name || ' Admin'
    )
  );
