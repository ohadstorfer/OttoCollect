-- Remove all image deletion triggers that use net.http_post
-- These are causing "schema net does not exist" errors

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_collection_items_image_deletion ON collection_items;
DROP TRIGGER IF EXISTS trigger_detailed_banknotes_image_deletion ON detailed_banknotes;
DROP TRIGGER IF EXISTS trigger_forum_announcements_image_deletion ON forum_announcements;
DROP TRIGGER IF EXISTS trigger_forum_posts_image_deletion ON forum_posts;
DROP TRIGGER IF EXISTS trigger_image_suggestions_image_deletion ON image_suggestions;
DROP TRIGGER IF EXISTS trigger_profiles_image_deletion ON profiles;

-- Drop the function that uses net.http_post
DROP FUNCTION IF EXISTS public.handle_image_deletion();

-- Create a simple service to handle image deletions client-side instead