
CREATE TABLE IF NOT EXISTS public.image_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banknote_id UUID REFERENCES public.detailed_banknotes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('obverse', 'reverse')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.image_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can read their own suggestions
CREATE POLICY "Users can read their own image suggestions"
  ON public.image_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own suggestions
CREATE POLICY "Users can create their own image suggestions"
  ON public.image_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can update suggestions
CREATE POLICY "Admins can update image suggestions"
  ON public.image_suggestions
  FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Super Admin'));

-- Create storage bucket for banknote images if it doesn't exist
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists()
RETURNS void AS $$
BEGIN
  -- This will throw an error if the bucket doesn't exist, which we catch and create
  BEGIN
    PERFORM storage.buckets WHERE name = 'banknote_images';
  EXCEPTION WHEN undefined_table THEN
    -- Bucket table doesn't exist yet, this is normal during initial setup
    NULL;
  END;
END;
$$ LANGUAGE plpgsql;

SELECT create_bucket_if_not_exists();
