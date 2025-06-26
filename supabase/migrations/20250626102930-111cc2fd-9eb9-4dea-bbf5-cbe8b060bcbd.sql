
-- Create function to generate forum post notifications
CREATE OR REPLACE FUNCTION create_forum_post_notification()
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
      'forum_post',
      'New Forum Post',
      author_username || ' posted in the forum: ' || NEW.title,
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

-- Create function to delete forum post notifications when post is deleted
CREATE OR REPLACE FUNCTION delete_forum_post_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete all notifications related to this forum post
  DELETE FROM notifications
  WHERE type = 'forum_post' AND reference_id = OLD.id;

  RETURN OLD;
END;
$function$;

-- Create function to delete follow notifications when user unfollows
CREATE OR REPLACE FUNCTION delete_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete the follow notification for this relationship
  DELETE FROM notifications
  WHERE type = 'follow' 
    AND user_id = OLD.following_id 
    AND reference_id = OLD.follower_id;

  RETURN OLD;
END;
$function$;

-- Create triggers for forum posts
CREATE TRIGGER forum_post_notification_trigger
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_forum_post_notification();

CREATE TRIGGER forum_post_delete_notification_trigger
  AFTER DELETE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION delete_forum_post_notifications();

-- Create trigger for unfollow cleanup
CREATE TRIGGER unfollow_notification_cleanup_trigger
  AFTER DELETE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION delete_follow_notification();
