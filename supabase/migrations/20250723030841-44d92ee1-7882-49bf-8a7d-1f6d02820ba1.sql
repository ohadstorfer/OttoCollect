-- Add view_mode column to user_filter_preferences table to save list/grid view preference
ALTER TABLE user_filter_preferences 
ADD COLUMN view_mode text DEFAULT 'grid' CHECK (view_mode IN ('grid', 'list'));