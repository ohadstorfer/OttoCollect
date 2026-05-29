-- Drafts must not behave like published posts: no follower notifications, no
-- author notification, no point awards. The existing trigger functions are
-- kept untouched — we just narrow *when* they fire by recreating the triggers
-- with a WHEN clause, and add matching AFTER UPDATE triggers that fire on the
-- transition draft -> published.
--
-- Side effects covered: skipping a draft INSERT means a published post (via
-- UPDATE is_draft=false) must replay all three side effects exactly once.

-- 1) Follower notifications "for all": only on a real publish.
DROP TRIGGER IF EXISTS create_blog_post_notifications_for_all_trigger ON public.blog_posts;
CREATE TRIGGER create_blog_post_notifications_for_all_trigger
  AFTER INSERT ON public.blog_posts
  FOR EACH ROW
  WHEN (NEW.is_draft = false)
  EXECUTE FUNCTION public.create_blog_post_notifications_for_all();

DROP TRIGGER IF EXISTS create_blog_post_notifications_for_all_on_publish_trigger ON public.blog_posts;
CREATE TRIGGER create_blog_post_notifications_for_all_on_publish_trigger
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  WHEN (OLD.is_draft = true AND NEW.is_draft = false)
  EXECUTE FUNCTION public.create_blog_post_notifications_for_all();

-- 2) Author/follower notification (single-row): same gating.
DROP TRIGGER IF EXISTS create_blog_post_notification_trigger ON public.blog_posts;
CREATE TRIGGER create_blog_post_notification_trigger
  AFTER INSERT ON public.blog_posts
  FOR EACH ROW
  WHEN (NEW.is_draft = false)
  EXECUTE FUNCTION public.create_blog_post_notification();

DROP TRIGGER IF EXISTS create_blog_post_notification_on_publish_trigger ON public.blog_posts;
CREATE TRIGGER create_blog_post_notification_on_publish_trigger
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  WHEN (OLD.is_draft = true AND NEW.is_draft = false)
  EXECUTE FUNCTION public.create_blog_post_notification();

-- 3) Points: drafts don't count; the user only earns the post-points the
-- first time the post becomes public.
DROP TRIGGER IF EXISTS award_points_for_blog_post_trigger ON public.blog_posts;
CREATE TRIGGER award_points_for_blog_post_trigger
  AFTER INSERT ON public.blog_posts
  FOR EACH ROW
  WHEN (NEW.is_draft = false)
  EXECUTE FUNCTION public.award_points_for_blog_post();

DROP TRIGGER IF EXISTS award_points_for_blog_post_on_publish_trigger ON public.blog_posts;
CREATE TRIGGER award_points_for_blog_post_on_publish_trigger
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  WHEN (OLD.is_draft = true AND NEW.is_draft = false)
  EXECUTE FUNCTION public.award_points_for_blog_post();
