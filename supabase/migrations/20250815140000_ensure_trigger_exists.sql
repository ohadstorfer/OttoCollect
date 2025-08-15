-- Ensure the trigger exists on collection_items table
-- This migration will create the trigger if it doesn't exist

-- Drop the trigger if it exists to recreate it
DROP TRIGGER IF EXISTS trigger_collection_items_image_cleanup ON collection_items;

-- Create the trigger
CREATE TRIGGER trigger_collection_items_image_cleanup
  AFTER UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_collection_items_image_cleanup' 
    AND event_object_table = 'collection_items'
  ) THEN
    RAISE NOTICE 'Trigger trigger_collection_items_image_cleanup created successfully';
  ELSE
    RAISE NOTICE 'WARNING: Trigger was not created!';
  END IF;
END $$; 