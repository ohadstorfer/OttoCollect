
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message', 'forum_post', 'collection_activity', 'follow')),
  title text NOT NULL,
  content text NOT NULL,
  reference_id uuid, -- Can reference message_id, post_id, or user_id depending on type
  reference_data jsonb, -- Additional data like counts, usernames, etc.
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create message notifications
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_username text;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for receiver
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    reference_id,
    reference_data
  ) VALUES (
    NEW.receiver_id,
    'message',
    'New Message',
    sender_username || ' sent you a message',
    NEW.id,
    jsonb_build_object('sender_id', NEW.sender_id, 'sender_username', sender_username)
  );

  RETURN NEW;
END;
$$;

-- Function to create follow notifications
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follower_username text;
BEGIN
  -- Get follower username
  SELECT username INTO follower_username
  FROM profiles
  WHERE id = NEW.follower_id;

  -- Create notification for the user being followed
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    reference_id,
    reference_data
  ) VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    follower_username || ' started following you',
    NEW.follower_id,
    jsonb_build_object('follower_id', NEW.follower_id, 'follower_username', follower_username)
  );

  RETURN NEW;
END;
$$;

-- Function to generate daily collection activity summaries
CREATE OR REPLACE FUNCTION generate_collection_activity_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_record RECORD;
BEGIN
  -- Generate notifications for collection activity from yesterday
  FOR activity_record IN
    SELECT 
      f.follower_id as user_id,
      ci.user_id as active_user_id,
      p.username as active_username,
      COUNT(CASE WHEN ci.created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as items_added,
      COUNT(CASE WHEN ci.updated_at::date = CURRENT_DATE - INTERVAL '1 day' AND ci.created_at::date != CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as items_updated
    FROM followers f
    JOIN collection_items ci ON ci.user_id = f.following_id
    JOIN profiles p ON p.id = f.following_id
    WHERE (ci.created_at::date = CURRENT_DATE - INTERVAL '1 day' 
           OR (ci.updated_at::date = CURRENT_DATE - INTERVAL '1 day' AND ci.created_at::date != CURRENT_DATE - INTERVAL '1 day'))
    GROUP BY f.follower_id, ci.user_id, p.username
    HAVING COUNT(*) > 0
  LOOP
    DECLARE
      notification_title text;
      notification_content text;
      total_activity integer;
    BEGIN
      total_activity := activity_record.items_added + activity_record.items_updated;
      
      -- Create appropriate title and content based on activity
      IF activity_record.items_added > 0 AND activity_record.items_updated > 0 THEN
        notification_title := 'Collection Update';
        notification_content := activity_record.active_username || ' added ' || activity_record.items_added || ' and updated ' || activity_record.items_updated || ' collection items';
      ELSIF activity_record.items_added > 0 THEN
        notification_title := 'New Collection Items';
        notification_content := activity_record.active_username || ' added ' || activity_record.items_added || ' new banknotes to their collection';
      ELSE
        notification_title := 'Collection Updates';
        notification_content := activity_record.active_username || ' updated ' || activity_record.items_updated || ' collection items';
      END IF;

      -- Insert notification (only if one doesn't already exist for today)
      INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        reference_id,
        reference_data
      ) 
      SELECT 
        activity_record.user_id,
        'collection_activity',
        notification_title,
        notification_content,
        activity_record.active_user_id,
        jsonb_build_object(
          'active_user_id', activity_record.active_user_id,
          'active_username', activity_record.active_username,
          'items_added', activity_record.items_added,
          'items_updated', activity_record.items_updated,
          'activity_date', CURRENT_DATE - INTERVAL '1 day'
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = activity_record.user_id 
          AND type = 'collection_activity'
          AND reference_id = activity_record.active_user_id
          AND created_at::date = CURRENT_DATE
      );
    END;
  END LOOP;
END;
$$;

-- Function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_id_param uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE user_id = user_id_param AND is_read = false;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(user_id_param uuid, notification_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF notification_ids IS NULL THEN
    -- Mark all notifications as read for user
    UPDATE notifications 
    SET is_read = true, updated_at = now()
    WHERE user_id = user_id_param AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications 
    SET is_read = true, updated_at = now()
    WHERE user_id = user_id_param AND id = ANY(notification_ids);
  END IF;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON followers
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();
