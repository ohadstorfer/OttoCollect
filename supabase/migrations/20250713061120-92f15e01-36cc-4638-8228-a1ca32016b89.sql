
-- Remove the at_least_one_image_required constraint that's preventing single image suggestions
ALTER TABLE public.image_suggestions 
DROP CONSTRAINT IF EXISTS at_least_one_image_required;

-- Verify the table structure is correct for single image suggestions
-- The table should accept individual image suggestions with image_url and type columns
