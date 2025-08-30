-- Add English translation columns to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN title_en text,
ADD COLUMN content_en text,
ADD COLUMN excerpt_en text;

-- Add English translation columns to blog_comments table
ALTER TABLE blog_comments 
ADD COLUMN content_en text;

-- Add English translation columns to forum_announcement_comments table
ALTER TABLE forum_announcement_comments 
ADD COLUMN content_en text;

-- Add English translation columns to forum_announcements table
ALTER TABLE forum_announcements 
ADD COLUMN title_en text,
ADD COLUMN content_en text;

-- Add English translation columns to forum_posts table
ALTER TABLE forum_posts 
ADD COLUMN title_en text,
ADD COLUMN content_en text;

-- Add English translation columns to forum_comments table
ALTER TABLE forum_comments 
ADD COLUMN content_en text;