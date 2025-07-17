-- Create function to send notifications to all users when admin creates blog post
CREATE OR REPLACE FUNCTION public.create_blog_post_notifications_for_all()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  author_username text;
  author_role text;
  user_record RECORD;
BEGIN
  -- Get author username and role
  SELECT username, role INTO author_username, author_role
  FROM profiles
  WHERE id = NEW.author_id;

  -- Only send notifications if author is admin
  IF author_role = 'Super Admin' OR author_role LIKE '%Admin%' THEN
    -- Create notifications for all users except the author
    FOR user_record IN
      SELECT id FROM profiles WHERE id != NEW.author_id
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        reference_id,
        reference_data
      ) VALUES (
        user_record.id,
        'blog_post',
        'New Blog Article Published',
        author_username || ' published a new blog article: ' || NEW.title,
        NEW.id,
        jsonb_build_object(
          'author_id', NEW.author_id,
          'author_username', author_username,
          'post_title', NEW.title
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for blog post notifications to all users
DROP TRIGGER IF EXISTS create_blog_post_notifications_for_all_trigger ON blog_posts;
CREATE TRIGGER create_blog_post_notifications_for_all_trigger
  AFTER INSERT ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_blog_post_notifications_for_all();