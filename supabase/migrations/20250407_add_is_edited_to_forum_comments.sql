
-- Add is_edited column to forum_comments table if it doesn't exist
ALTER TABLE forum_comments 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;
