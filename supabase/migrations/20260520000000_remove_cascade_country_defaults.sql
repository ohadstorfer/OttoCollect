-- Revert the cascade introduced in 20260518000000.
--
-- Product decision (2026-05-20): changing the 'new_user' catalog default for a
-- country must NOT overwrite the preferences of users who already exist. The
-- default applies only to FUTURE signups (via create_complete_user_filter_preferences,
-- which reads country_default_preferences at insert time).
--
-- Existing registered users keep whatever they have. The 'anonymous' default is
-- unaffected -- anonymous visitors still read it live on each visit.

DROP TRIGGER IF EXISTS on_country_default_preferences_cascade
  ON public.country_default_preferences;

DROP FUNCTION IF EXISTS public.sync_user_filter_preferences_from_default();
