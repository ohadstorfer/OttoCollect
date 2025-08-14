-- Remove the trigger that's causing the "net" schema error for profiles table
DROP TRIGGER IF EXISTS handle_image_deletion_trigger ON public.profiles;

-- The trigger was trying to call an edge function using net.http_post which requires
-- the net extension that doesn't exist in this Supabase instance