-- Debug script to check current triggers and functions
-- Run this in the Supabase SQL editor

-- Check all triggers on detailed_banknotes
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'detailed_banknotes'
ORDER BY trigger_name;

-- Check all triggers on collection_items
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'collection_items'
ORDER BY trigger_name;

-- Check all functions that might be used by triggers
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%image%' OR routine_name LIKE '%cleanup%' OR routine_name LIKE '%deletion%'
ORDER BY routine_name;

-- Check if the image_cleanup_queue table exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'image_cleanup_queue'
ORDER BY ordinal_position; 