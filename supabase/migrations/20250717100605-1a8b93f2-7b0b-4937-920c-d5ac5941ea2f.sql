-- Add blog_post to the allowed notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Create a new check constraint that includes blog_post
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'forum_post', 'collection_activity', 'message', 'badge_earned', 'badge_achievement', 'blog_post'));