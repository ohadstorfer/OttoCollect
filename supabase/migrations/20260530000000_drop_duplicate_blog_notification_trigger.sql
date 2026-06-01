-- Remove the duplicate blog post notification trigger.
--
-- Migration 20250817053944 added `trg_create_blog_post_notification` calling
-- the same `create_blog_post_notification()` function that
-- `create_blog_post_notification_trigger` (from 20250717054400) already
-- handled. The duplicate fired unconditionally on every INSERT, including
-- drafts — bypassing the WHEN (NEW.is_draft = false) guard added in
-- 20260529000000 to the original trigger.
--
-- Net effect before this migration:
--   - Publishing a post: TWO notifications fired (one per trigger) and the
--     "no notifications on draft save" guard was effectively defeated.
--   - Saving a draft: still notified followers via the un-gated duplicate.
--
-- After this migration: only the original (gated) trigger remains. One
-- notification per publish, none on draft save.

DROP TRIGGER IF EXISTS trg_create_blog_post_notification ON public.blog_posts;
