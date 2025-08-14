-- Remove the image deletion trigger that's causing the net schema error
DROP TRIGGER IF EXISTS trigger_profiles_image_deletion ON public.profiles;

-- Also remove the problematic function if it exists
DROP FUNCTION IF EXISTS public.handle_image_deletion();