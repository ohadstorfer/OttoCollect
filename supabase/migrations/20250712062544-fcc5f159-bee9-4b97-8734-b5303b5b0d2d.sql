
-- Revert the image_suggestions table to its original structure
-- First, drop the new columns that were added
ALTER TABLE public.image_suggestions 
DROP COLUMN IF EXISTS obverse_image,
DROP COLUMN IF EXISTS reverse_image,
DROP COLUMN IF EXISTS obverse_image_watermarked,
DROP COLUMN IF EXISTS reverse_image_watermarked,
DROP COLUMN IF EXISTS obverse_image_thumbnail,
DROP COLUMN IF EXISTS reverse_image_thumbnail;

-- Add back the original columns
ALTER TABLE public.image_suggestions 
ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL CHECK (type IN ('obverse', 'reverse'));

-- Drop the new constraint
ALTER TABLE public.image_suggestions 
DROP CONSTRAINT IF EXISTS at_least_one_image_required;

-- Drop the index that was added
DROP INDEX IF EXISTS idx_image_suggestions_banknote_user;

-- Drop the new function
DROP FUNCTION IF EXISTS public.approve_image_suggestion_v2(UUID);

-- Restore the original check constraint for type
ALTER TABLE public.image_suggestions 
DROP CONSTRAINT IF EXISTS image_suggestions_status_check;

ALTER TABLE public.image_suggestions 
ADD CONSTRAINT image_suggestions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add back the type constraint
ALTER TABLE public.image_suggestions 
ADD CONSTRAINT image_suggestions_type_check 
CHECK (type IN ('obverse', 'reverse'));
