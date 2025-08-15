-- Clean up all conflicting triggers and ensure only the correct one is active
-- This migration will remove all old triggers and create only the correct ones

-- Drop all existing image-related triggers
DROP TRIGGER IF EXISTS trigger_collection_items_image_cleanup ON collection_items;
DROP TRIGGER IF EXISTS trigger_detailed_banknotes_image_cleanup ON detailed_banknotes;
DROP TRIGGER IF EXISTS trigger_profiles_image_cleanup ON profiles;
DROP TRIGGER IF EXISTS trigger_countries_image_cleanup ON countries;
DROP TRIGGER IF EXISTS trigger_forum_posts_image_cleanup ON forum_posts;
DROP TRIGGER IF EXISTS trigger_forum_announcements_image_cleanup ON forum_announcements;
DROP TRIGGER IF EXISTS trigger_blog_posts_image_cleanup ON blog_posts;
DROP TRIGGER IF EXISTS trigger_image_suggestions_image_cleanup ON image_suggestions;

-- Drop old conflicting triggers
DROP TRIGGER IF EXISTS trigger_collection_items_image_deletion ON collection_items;
DROP TRIGGER IF EXISTS trigger_detailed_banknotes_image_deletion ON detailed_banknotes;
DROP TRIGGER IF EXISTS trigger_forum_announcements_image_deletion ON forum_announcements;
DROP TRIGGER IF EXISTS trigger_forum_posts_image_deletion ON forum_posts;
DROP TRIGGER IF EXISTS trigger_image_suggestions_image_deletion ON image_suggestions;

-- Drop old functions that are no longer needed
DROP FUNCTION IF EXISTS public.handle_image_deletion() CASCADE;

-- Ensure the image_cleanup_queue table exists
CREATE TABLE IF NOT EXISTS public.image_cleanup_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  banknote_id TEXT,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_image_cleanup_queue_processed ON public.image_cleanup_queue(processed);
CREATE INDEX IF NOT EXISTS idx_image_cleanup_queue_created_at ON public.image_cleanup_queue(created_at);

-- Now create only the correct triggers with AFTER UPDATE timing
CREATE TRIGGER trigger_collection_items_image_cleanup
  AFTER UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_detailed_banknotes_image_cleanup
  AFTER UPDATE ON detailed_banknotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_profiles_image_cleanup
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_countries_image_cleanup
  AFTER UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_forum_posts_image_cleanup
  AFTER UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_forum_announcements_image_cleanup
  AFTER UPDATE ON forum_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_blog_posts_image_cleanup
  AFTER UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_image_suggestions_image_cleanup
  AFTER UPDATE ON image_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

-- Verify the triggers were created
DO $$
BEGIN
  RAISE NOTICE '=== TRIGGER CLEANUP VERIFICATION ===';
  
  -- Check if triggers exist
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_detailed_banknotes_image_cleanup' 
    AND event_object_table = 'detailed_banknotes'
  ) THEN
    RAISE NOTICE 'Trigger trigger_detailed_banknotes_image_cleanup created successfully';
  ELSE
    RAISE NOTICE 'WARNING: Trigger trigger_detailed_banknotes_image_cleanup was not created!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_collection_items_image_cleanup' 
    AND event_object_table = 'collection_items'
  ) THEN
    RAISE NOTICE 'Trigger trigger_collection_items_image_cleanup created successfully';
  ELSE
    RAISE NOTICE 'WARNING: Trigger trigger_collection_items_image_cleanup was not created!';
  END IF;
  
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'handle_old_image_cleanup'
  ) THEN
    RAISE NOTICE 'Function handle_old_image_cleanup exists';
  ELSE
    RAISE NOTICE 'WARNING: Function handle_old_image_cleanup does not exist!';
  END IF;
  
END $$; 