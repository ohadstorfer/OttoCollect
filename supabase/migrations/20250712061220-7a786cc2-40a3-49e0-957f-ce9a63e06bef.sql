
-- Update image_suggestions table to support both obverse and reverse images in one record
ALTER TABLE public.image_suggestions 
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS type;

-- Add new columns for obverse and reverse images with all versions
ALTER TABLE public.image_suggestions 
ADD COLUMN IF NOT EXISTS obverse_image TEXT,
ADD COLUMN IF NOT EXISTS reverse_image TEXT,
ADD COLUMN IF NOT EXISTS obverse_image_watermarked TEXT,
ADD COLUMN IF NOT EXISTS reverse_image_watermarked TEXT,
ADD COLUMN IF NOT EXISTS obverse_image_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS reverse_image_thumbnail TEXT;

-- Update the check constraint to ensure at least one image is provided
ALTER TABLE public.image_suggestions 
DROP CONSTRAINT IF EXISTS image_suggestions_status_check;

ALTER TABLE public.image_suggestions 
ADD CONSTRAINT image_suggestions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add constraint to ensure at least one image is provided
ALTER TABLE public.image_suggestions 
ADD CONSTRAINT at_least_one_image_required 
CHECK (obverse_image IS NOT NULL OR reverse_image IS NOT NULL);

-- Add index for better performance on banknote_id and user_id queries
CREATE INDEX IF NOT EXISTS idx_image_suggestions_banknote_user 
ON public.image_suggestions(banknote_id, user_id);

-- Create or replace function to handle image suggestion approval
CREATE OR REPLACE FUNCTION public.approve_image_suggestion_v2(
  p_suggestion_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_banknote_id UUID;
  v_obverse_image TEXT;
  v_reverse_image TEXT;
  v_obverse_watermarked TEXT;
  v_reverse_watermarked TEXT;
  v_obverse_thumbnail TEXT;
  v_reverse_thumbnail TEXT;
BEGIN
  -- Get the suggestion details
  SELECT 
    banknote_id, 
    obverse_image, 
    reverse_image,
    obverse_image_watermarked,
    reverse_image_watermarked,
    obverse_image_thumbnail,
    reverse_image_thumbnail
  INTO 
    v_banknote_id, 
    v_obverse_image, 
    v_reverse_image,
    v_obverse_watermarked,
    v_reverse_watermarked,
    v_obverse_thumbnail,
    v_reverse_thumbnail
  FROM public.image_suggestions 
  WHERE id = p_suggestion_id;
  
  -- Update the banknote with the new images
  UPDATE public.detailed_banknotes 
  SET 
    front_picture = COALESCE(v_obverse_image, front_picture),
    back_picture = COALESCE(v_reverse_image, back_picture),
    front_picture_watermarked = COALESCE(v_obverse_watermarked, front_picture_watermarked),
    back_picture_watermarked = COALESCE(v_reverse_watermarked, back_picture_watermarked),
    front_picture_thumbnail = COALESCE(v_obverse_thumbnail, front_picture_thumbnail),
    back_picture_thumbnail = COALESCE(v_reverse_thumbnail, back_picture_thumbnail),
    updated_at = now()
  WHERE id = v_banknote_id;
  
  -- Mark the suggestion as approved
  UPDATE public.image_suggestions 
  SET status = 'approved', updated_at = now() 
  WHERE id = p_suggestion_id;
END;
$$;
