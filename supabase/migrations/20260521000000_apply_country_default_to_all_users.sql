-- Opt-in cascade: lets an admin explicitly overwrite the catalog preferences
-- of ALL existing users for a country with that country's 'new_user' default.
--
-- Product decision (2026-05-20): the cascade must be a deliberate choice per
-- save action, not an automatic trigger. Saving the default alone only affects
-- future signups; the admin calls this function when they choose "apply to all".
--
-- SECURITY DEFINER because a country admin cannot update other users' rows
-- under normal RLS. Authorization is enforced inline (super admin, or the
-- country admin for THIS country).

CREATE OR REPLACE FUNCTION public.apply_country_default_to_all_users(
  target_country_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_defaults record;
  v_count    integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_caller AND p.role = 'Super Admin'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.countries c ON c.id = target_country_id
    WHERE p.id = v_caller AND p.role = c.name || ' Admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized for this country';
  END IF;

  SELECT
    selected_categories,
    selected_types,
    selected_sort_options,
    group_mode,
    view_mode,
    images_only
  INTO v_defaults
  FROM public.country_default_preferences
  WHERE country_id = target_country_id
    AND audience = 'new_user';

  IF v_defaults IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.user_filter_preferences
  SET
    selected_categories   = v_defaults.selected_categories,
    selected_types        = v_defaults.selected_types,
    selected_sort_options = v_defaults.selected_sort_options,
    group_mode            = v_defaults.group_mode,
    view_mode             = v_defaults.view_mode,
    images_only           = v_defaults.images_only,
    updated_at            = now()
  WHERE country_id = target_country_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_country_default_to_all_users(uuid) TO authenticated;
