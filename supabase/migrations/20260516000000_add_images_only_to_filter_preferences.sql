-- Add a per-user, per-country preference that hides catalog banknotes
-- without any image (front_picture and back_picture both null/empty).
-- Default TRUE so new users start with the cleaner view; existing rows
-- are backfilled to TRUE for the same reason.

ALTER TABLE public.user_filter_preferences
  ADD COLUMN IF NOT EXISTS images_only boolean NOT NULL DEFAULT true;

UPDATE public.user_filter_preferences
SET images_only = true
WHERE images_only IS NULL;

COMMENT ON COLUMN public.user_filter_preferences.images_only
  IS 'When true, catalog hides banknotes without front_picture or back_picture.';
