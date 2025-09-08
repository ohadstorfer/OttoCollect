-- Add selected_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_language TEXT DEFAULT 'en';

-- Add comment to the column
COMMENT ON COLUMN public.profiles.selected_language IS 'User selected language preference (en, ar, tr)';

-- Update existing users to have 'en' as default language if they don't have one
UPDATE public.profiles 
SET selected_language = 'en' 
WHERE selected_language IS NULL;
