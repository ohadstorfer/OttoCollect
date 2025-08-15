-- Test script to debug trigger issues
-- Run this in the Supabase SQL editor

-- First, let's check if the trigger exists and is properly configured
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'collection_items'
ORDER BY trigger_name;

-- Check if the function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_old_image_cleanup';

-- Let's add some debug logging to the function to see if it's being called
-- First, let's see the current function definition
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_old_image_cleanup';

-- Let's test with a simple update to see if the trigger fires
-- First, let's see what's in the collection_items table
SELECT id, obverse_image, reverse_image 
FROM collection_items 
LIMIT 1;

-- Let's also check if there are any items in the cleanup queue
SELECT COUNT(*) as queue_count FROM image_cleanup_queue;

-- Let's check the current function to see if it has proper logging
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_old_image_cleanup'; 