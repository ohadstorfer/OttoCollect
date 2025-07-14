-- Add type and prefix columns to collection_items table
ALTER TABLE collection_items 
ADD COLUMN type text,
ADD COLUMN prefix text;