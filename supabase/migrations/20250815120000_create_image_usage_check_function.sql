-- Create RPC function to check if an image is still used by a banknote
CREATE OR REPLACE FUNCTION public.is_image_used_by_banknote(
  image_url TEXT,
  banknote_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_used BOOLEAN := FALSE;
BEGIN
  -- Check if the image is used by the detailed_banknotes entry
  SELECT EXISTS(
    SELECT 1 FROM detailed_banknotes
    WHERE id = banknote_id::uuid
    AND (
      front_picture = image_url OR
      back_picture = image_url OR
      front_picture_watermarked = image_url OR
      back_picture_watermarked = image_url OR
      front_picture_thumbnail = image_url OR
      back_picture_thumbnail = image_url OR
      watermark_picture = image_url OR
      tughra_picture = image_url OR
      image_url = ANY(signature_pictures) OR
      image_url = ANY(seal_pictures) OR
      image_url = ANY(other_element_pictures)
    )
  ) INTO is_used;
  
  RETURN is_used;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_image_used_by_banknote(TEXT, TEXT) TO authenticated; 