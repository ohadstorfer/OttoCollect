-- get_collection_view_count
--
-- Returns total view events for a given (user_id, country_id) collection.
-- Authorized for: the collection owner, super admins, and country admins of
-- THIS specific country. Returns NULL for unauthorized callers so the client
-- can simply hide the UI when no number is returned.
--
-- Excludes rows where viewer_id = user_id (legacy owner self-views) at read
-- time. Guest rows (viewer_id IS NULL) are kept.

CREATE OR REPLACE FUNCTION public.get_collection_view_count(
  target_user_id    UUID,
  target_country_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_count  INTEGER;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    v_caller = target_user_id
    OR public.is_super_admin()
    OR public.is_country_admin(target_country_id, v_caller)
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_count
  FROM public.user_collection_views
  WHERE user_id    = target_user_id
    AND country_id = target_country_id
    AND viewer_id IS DISTINCT FROM user_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_collection_view_count(UUID, UUID) TO authenticated;
