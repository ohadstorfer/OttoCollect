
-- Function to check for existing image suggestions
CREATE OR REPLACE FUNCTION public.check_image_suggestion(
  p_banknote_id UUID,
  p_user_id UUID,
  p_type TEXT
) 
RETURNS TABLE (
  id UUID,
  status TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id, status 
  FROM public.image_suggestions 
  WHERE banknote_id = p_banknote_id 
  AND user_id = p_user_id 
  AND type = p_type 
  AND status = 'pending'
$$;

-- Function to update an existing image suggestion
CREATE OR REPLACE FUNCTION public.update_image_suggestion(
  p_suggestion_id UUID,
  p_image_url TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.image_suggestions 
  SET image_url = p_image_url, updated_at = now() 
  WHERE id = p_suggestion_id
$$;

-- Function to create a new image suggestion
CREATE OR REPLACE FUNCTION public.create_image_suggestion(
  p_banknote_id UUID,
  p_user_id UUID,
  p_image_url TEXT,
  p_type TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.image_suggestions (banknote_id, user_id, image_url, type) 
  VALUES (p_banknote_id, p_user_id, p_image_url, p_type)
$$;

-- Function to count pending image suggestions
CREATE OR REPLACE FUNCTION public.count_pending_image_suggestions()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer 
  FROM public.image_suggestions 
  WHERE status = 'pending'
$$;

-- Function to get image suggestions with pagination
CREATE OR REPLACE FUNCTION public.get_image_suggestions(
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS TABLE (
  id UUID,
  banknote_id UUID,
  user_id UUID,
  image_url TEXT,
  type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  catalogId TEXT,
  country TEXT,
  denomination TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    is.id,
    is.banknote_id,
    is.user_id,
    is.image_url,
    is.type,
    is.status,
    is.created_at,
    db.extended_pick_number as catalogId,
    db.country,
    db.face_value as denomination,
    p.username,
    p.avatar_url
  FROM 
    public.image_suggestions is
    JOIN public.detailed_banknotes db ON is.banknote_id = db.id
    JOIN public.profiles p ON is.user_id = p.id
  WHERE 
    is.status = 'pending'
  ORDER BY 
    is.created_at DESC
  LIMIT 
    p_limit
  OFFSET 
    p_offset
$$;

-- Function to approve an image suggestion
CREATE OR REPLACE FUNCTION public.approve_image_suggestion(
  p_suggestion_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_banknote_id UUID;
  v_type TEXT;
  v_image_url TEXT;
BEGIN
  -- Get the suggestion details
  SELECT banknote_id, type, image_url 
  INTO v_banknote_id, v_type, v_image_url 
  FROM public.image_suggestions 
  WHERE id = p_suggestion_id;
  
  -- Update the banknote with the new image
  IF v_type = 'obverse' THEN
    UPDATE public.detailed_banknotes 
    SET front_picture = v_image_url 
    WHERE id = v_banknote_id;
  ELSE
    UPDATE public.detailed_banknotes 
    SET back_picture = v_image_url 
    WHERE id = v_banknote_id;
  END IF;
  
  -- Mark the suggestion as approved
  UPDATE public.image_suggestions 
  SET status = 'approved', updated_at = now() 
  WHERE id = p_suggestion_id;
END;
$$;

-- Function to reject an image suggestion
CREATE OR REPLACE FUNCTION public.reject_image_suggestion(
  p_suggestion_id UUID
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.image_suggestions 
  SET status = 'rejected', updated_at = now() 
  WHERE id = p_suggestion_id
$$;
