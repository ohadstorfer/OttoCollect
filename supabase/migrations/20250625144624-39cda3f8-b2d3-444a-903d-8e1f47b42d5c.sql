
-- Add hide_images column to collection_items table
ALTER TABLE collection_items 
ADD COLUMN hide_images boolean NOT NULL DEFAULT false;
