-- Simple test to verify if the trigger is working
-- Run this in the Supabase SQL editor

-- First, let's check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'collection_items'
ORDER BY trigger_name;

-- Let's also check if the function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_old_image_cleanup';

-- Now let's do a simple test update to see if the trigger fires
-- First, let's see what's in the collection_items table
SELECT id, obverse_image, reverse_image, banknote_id
FROM collection_items 
LIMIT 5;

-- Let's do a test update on a collection item to see if the trigger fires
-- We'll update a non-image field first to see if the trigger fires at all
UPDATE collection_items 
SET updated_at = now()
WHERE id = 'be9e3402-00cc-4ddb-bdcf-77b91b6eeab3';

-- Check if anything was added to the cleanup queue
SELECT COUNT(*) as queue_count FROM image_cleanup_queue;

-- Let's also check the logs to see if the trigger fired
-- (You'll need to check the Supabase logs in the dashboard)

-- Now let's check what the current image values are for this specific item
SELECT id, obverse_image, reverse_image, banknote_id, updated_at
FROM collection_items 
WHERE id = 'be9e3402-00cc-4ddb-bdcf-77b91b6eeab3'; 