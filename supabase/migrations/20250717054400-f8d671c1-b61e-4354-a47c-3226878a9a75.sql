-- Create blog_posts table (copy of forum_posts)
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog_comments table (copy of forum_comments)
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_posts (copy of forum_posts policies)
CREATE POLICY "Enable read access for all users" ON public.blog_posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own blog posts" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own blog posts" ON public.blog_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own blog posts" ON public.blog_posts FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "Allow super/country admin all actions" ON public.blog_posts FOR ALL USING (is_super_or_country_admin() OR (author_id = auth.uid()));

-- RLS policies for blog_comments (copy of forum_comments policies)
CREATE POLICY "Users can view all blog comments" ON public.blog_comments FOR SELECT USING (true);
CREATE POLICY "Users can create their own blog comments" ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own blog comments" ON public.blog_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own blog comments" ON public.blog_comments FOR DELETE USING (auth.uid() = author_id);

-- Create blog-specific functions (copies of forum functions)
CREATE OR REPLACE FUNCTION public.award_points_for_blog_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Award 5 points for creating blog post
    PERFORM award_points_and_update_rank(NEW.author_id, 5);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_points_for_blog_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Award 1 point for adding blog comment
    PERFORM award_points_and_update_rank(NEW.author_id, 1);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_blog_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  author_username text;
  follower_record RECORD;
BEGIN
  -- Get author username
  SELECT username INTO author_username
  FROM profiles
  WHERE id = NEW.author_id;

  -- Create notifications for each follower
  FOR follower_record IN
    SELECT follower_id
    FROM followers
    WHERE following_id = NEW.author_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      reference_id,
      reference_data
    ) VALUES (
      follower_record.follower_id,
      'blog_post',
      'New Blog Post',
      author_username || ' published a blog post: ' || NEW.title,
      NEW.id,
      jsonb_build_object(
        'author_id', NEW.author_id,
        'author_username', author_username,
        'post_title', NEW.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_blog_post_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete all notifications related to this blog post
  DELETE FROM notifications
  WHERE type = 'blog_post' AND reference_id = OLD.id;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_daily_blog_activity_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    daily_count integer;
BEGIN
    -- Count posts and comments created today
    SELECT 
        (SELECT COUNT(*) FROM blog_posts 
         WHERE author_id = user_id_param 
         AND DATE(created_at) = CURRENT_DATE) +
        (SELECT COUNT(*) FROM blog_comments 
         WHERE author_id = user_id_param 
         AND DATE(created_at) = CURRENT_DATE)
    INTO daily_count;
    
    RETURN COALESCE(daily_count, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_reached_daily_blog_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_rank text;
    daily_count integer;
    limit_reached boolean := false;
BEGIN
    -- Get user's rank
    SELECT rank INTO user_rank
    FROM profiles
    WHERE id = user_id_param;
    
    -- Check if user has limited ranks
    IF user_rank IN ('Newbie Collector', 'Beginner Collector', 'Mid Collector') THEN
        -- Get daily activity count
        daily_count := get_user_daily_blog_activity_count(user_id_param);
        
        -- Check if limit is reached (6 activities per day)
        IF daily_count >= 6 THEN
            limit_reached := true;
        END IF;
    END IF;
    
    RETURN limit_reached;
END;
$function$;

-- Create triggers for blog tables
CREATE TRIGGER award_points_for_blog_post_trigger
    AFTER INSERT ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.award_points_for_blog_post();

CREATE TRIGGER award_points_for_blog_comment_trigger
    AFTER INSERT ON public.blog_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.award_points_for_blog_comment();

CREATE TRIGGER create_blog_post_notification_trigger
    AFTER INSERT ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.create_blog_post_notification();

CREATE TRIGGER delete_blog_post_notifications_trigger
    BEFORE DELETE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_blog_post_notifications();