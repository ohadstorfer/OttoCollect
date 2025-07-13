
-- Remove the at_least_one_image_required constraint that's preventing single image suggestions
ALTER TABLE public.image_suggestions 
DROP CONSTRAINT IF EXISTS at_least_one_image_required;

-- Ensure the table structure matches what the service expects
-- The table should have image_url and type columns for single image suggestions
