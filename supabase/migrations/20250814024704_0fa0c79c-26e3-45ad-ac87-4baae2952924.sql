-- Remove just the profiles trigger that's causing the "net" schema error
DROP TRIGGER IF EXISTS trigger_profiles_image_deletion ON public.profiles;