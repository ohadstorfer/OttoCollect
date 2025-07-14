
-- Check current notification types constraint and update it to include badge notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the proper check constraint that includes all valid notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('message', 'forum_post', 'collection_activity', 'follow', 'badge_earned', 'badge_achievement'));
