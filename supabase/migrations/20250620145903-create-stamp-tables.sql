-- Create watermark_pictures table
CREATE TABLE IF NOT EXISTS public.watermark_pictures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tughra_pictures table
CREATE TABLE IF NOT EXISTS public.tughra_pictures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for watermark_pictures
ALTER TABLE public.watermark_pictures ENABLE ROW LEVEL SECURITY;

-- Everyone can read watermark pictures
CREATE POLICY "Everyone can read watermark pictures"
  ON public.watermark_pictures
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete watermark pictures
CREATE POLICY "Admins can manage watermark pictures"
  ON public.watermark_pictures
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Super Admin'));

-- Add RLS policies for tughra_pictures
ALTER TABLE public.tughra_pictures ENABLE ROW LEVEL SECURITY;

-- Everyone can read tughra pictures
CREATE POLICY "Everyone can read tughra pictures"
  ON public.tughra_pictures
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete tughra pictures
CREATE POLICY "Admins can manage tughra pictures"
  ON public.tughra_pictures
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Super Admin')); 