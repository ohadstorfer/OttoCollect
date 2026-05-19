-- When an admin updates the 'new_user' catalog default for a country,
-- propagate the change to every existing row in user_filter_preferences for
-- that country. This intentionally overwrites users who had personalized
-- their preferences -- per product decision (2026-05-17).
--
-- The 'anonymous' audience is not cascaded: anonymous visitors have no rows
-- to update; they read defaults live on each visit.

CREATE OR REPLACE FUNCTION public.sync_user_filter_preferences_from_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.audience <> 'new_user' THEN
    RETURN NEW;
  END IF;

  -- Skip cascade on INSERT: rows are seeded with current behavior, and new
  -- countries create user rows via the existing on_country_created trigger.
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  UPDATE public.user_filter_preferences
  SET
    selected_categories   = NEW.selected_categories,
    selected_types        = NEW.selected_types,
    selected_sort_options = NEW.selected_sort_options,
    group_mode            = NEW.group_mode,
    view_mode             = NEW.view_mode,
    images_only           = NEW.images_only,
    updated_at            = now()
  WHERE country_id = NEW.country_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_country_default_preferences_cascade
  ON public.country_default_preferences;

CREATE TRIGGER on_country_default_preferences_cascade
  AFTER UPDATE ON public.country_default_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_filter_preferences_from_default();
