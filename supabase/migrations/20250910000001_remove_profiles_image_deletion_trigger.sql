-- Remove the problematic trigger from profiles table
-- This trigger tries to use 'net' schema which isn't available and isn't needed for profile avatars
DROP TRIGGER IF EXISTS trigger_profiles_image_deletion ON profiles; 