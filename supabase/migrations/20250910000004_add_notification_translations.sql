-- Add translation columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title_ar text,
ADD COLUMN IF NOT EXISTS title_tr text,
ADD COLUMN IF NOT EXISTS content_ar text,
ADD COLUMN IF NOT EXISTS content_tr text;

-- Create a helper function to get localized notification content
CREATE OR REPLACE FUNCTION public.get_localized_notification(
  notification_id uuid,
  language text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  notification_row notifications%ROWTYPE;
BEGIN
  SELECT * INTO notification_row FROM notifications WHERE id = notification_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Notification not found');
  END IF;
  
  CASE language
    WHEN 'ar' THEN
      result := jsonb_build_object(
        'id', notification_row.id,
        'title', COALESCE(notification_row.title_ar, notification_row.title),
        'content', COALESCE(notification_row.content_ar, notification_row.content),
        'type', notification_row.type,
        'is_read', notification_row.is_read,
        'created_at', notification_row.created_at,
        'reference_id', notification_row.reference_id,
        'reference_data', notification_row.reference_data
      );
    WHEN 'tr' THEN
      result := jsonb_build_object(
        'id', notification_row.id,
        'title', COALESCE(notification_row.title_tr, notification_row.title),
        'content', COALESCE(notification_row.content_tr, notification_row.content),
        'type', notification_row.type,
        'is_read', notification_row.is_read,
        'created_at', notification_row.created_at,
        'reference_id', notification_row.reference_id,
        'reference_data', notification_row.reference_data
      );
    ELSE -- Default to English
      result := jsonb_build_object(
        'id', notification_row.id,
        'title', notification_row.title,
        'content', notification_row.content,
        'type', notification_row.type,
        'is_read', notification_row.is_read,
        'created_at', notification_row.created_at,
        'reference_id', notification_row.reference_id,
        'reference_data', notification_row.reference_data
      );
  END CASE;
  
  RETURN result;
END;
$$;

-- Update blog post notification function (for followers)
CREATE OR REPLACE FUNCTION public.create_blog_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  author_username text;
  follower_record RECORD;
BEGIN
  SELECT username INTO author_username FROM public.profiles WHERE id = NEW.author_id;

  FOR follower_record IN
    SELECT follower_id
    FROM public.followers
    WHERE following_id = NEW.author_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      title_ar,
      title_tr,
      content,
      content_ar,
      content_tr,
      reference_id,
      reference_data
    ) VALUES (
      follower_record.follower_id,
      'blog_post',
      'New Blog Post',
      'منشور مدونة جديد',
      'Yeni Blog Yazısı',
      author_username || ' published: ' || NEW.title,
      author_username || ' نشر: ' || NEW.title,
      author_username || ' yayınladı: ' || NEW.title,
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
$$;

-- Update admin blog post notification function (for all users)
CREATE OR REPLACE FUNCTION public.create_admin_blog_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        title_ar,
        title_tr,
        content,
        content_ar,
        content_tr,
        reference_id,
        reference_data
      ) VALUES (
        user_record.id,
        'blog_post',
        'New Blog Article Published',
        'تم نشر مقال مدونة جديد',
        'Yeni Blog Makalesi Yayınlandı',
        author_username || ' published a new blog article: ' || NEW.title,
        author_username || ' نشر مقال مدونة جديد: ' || NEW.title,
        author_username || ' yeni bir blog makalesi yayınladı: ' || NEW.title,
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
$$;

-- Update follow notification function
CREATE OR REPLACE FUNCTION public.create_follow_notification()
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
    title_ar,
    title_tr,
    content,
    content_ar,
    content_tr,
    reference_id,
    reference_data
  ) VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    'متابع جديد',
    'Yeni Takipçi',
    follower_username || ' started following you',
    follower_username || ' بدأ في متابعتك',
    follower_username || ' sizi takip etmeye başladı',
    NEW.follower_id,
    jsonb_build_object('follower_id', NEW.follower_id, 'follower_username', follower_username)
  );

  RETURN NEW;
END;
$$;

-- Update forum post notification function
CREATE OR REPLACE FUNCTION public.create_forum_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      title_ar,
      title_tr,
      content,
      content_ar,
      content_tr,
      reference_id,
      reference_data
    ) VALUES (
      follower_record.follower_id,
      'forum_post',
      'New Forum Post',
      'منشور جديد في المنتدى',
      'Yeni Forum Gönderisi',
      author_username || ' posted in the forum: ' || NEW.title,
      author_username || ' نشر في المنتدى: ' || NEW.title,
      author_username || ' forumda gönderi paylaştı: ' || NEW.title,
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
$$;

-- Update message notification function
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_username text;
BEGIN
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    title_ar,
    title_tr,
    content,
    content_ar,
    content_tr,
    reference_id,
    reference_data
  ) VALUES (
    NEW.receiver_id,
    'message',
    'New Message',
    'رسالة جديدة',
    'Yeni Mesaj',
    COALESCE(sender_username, 'Someone') || ' sent you a message',
    COALESCE(sender_username, 'شخص ما') || ' أرسل لك رسالة',
    COALESCE(sender_username, 'Biri') || ' size bir mesaj gönderdi',
    NEW.id,
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'preview', left(NEW.content, 120),
      'reference_item_id', NEW.reference_item_id
    )
  );
  RETURN NEW;
END;
$$;

-- Create or update badge notification function
CREATE OR REPLACE FUNCTION public.create_badge_notifications(
  recipient_user_id uuid,
  badge_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  recipient_username text;
  follower_record RECORD;
  badge_id uuid;
BEGIN
  -- Get recipient username
  SELECT username INTO recipient_username
  FROM profiles
  WHERE id = recipient_user_id;

  -- Loop through each badge
  FOREACH badge_id IN ARRAY badge_ids
  LOOP
    -- Get badge details
    SELECT name, stage INTO badge_record
    FROM badges
    WHERE id = badge_id;

    -- Create notification for the badge recipient
    INSERT INTO notifications (
      user_id,
      type,
      title,
      title_ar,
      title_tr,
      content,
      content_ar,
      content_tr,
      reference_id,
      reference_data
    ) VALUES (
      recipient_user_id,
      'badge_earned',
      'Badge Earned!',
      'تم الحصول على الشارة!',
      'Rozet Kazanıldı!',
      'Congratulations! You earned the ' || badge_record.name || ' badge',
      'تهانينا! لقد حصلت على شارة ' || badge_record.name,
      'Tebrikler! ' || badge_record.name || ' rozetini kazandınız',
      badge_id,
      jsonb_build_object(
        'badge_id', badge_id,
        'badge_name', badge_record.name,
        'badge_stage', badge_record.stage,
        'recipient_username', recipient_username
      )
    );

    -- Create achievement notifications for followers
    FOR follower_record IN
      SELECT follower_id
      FROM followers
      WHERE following_id = recipient_user_id
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        title_ar,
        title_tr,
        content,
        content_ar,
        content_tr,
        reference_id,
        reference_data
      ) VALUES (
        follower_record.follower_id,
        'badge_achievement',
        'Achievement Unlocked',
        'إنجاز مفتوح',
        'Başarı Kilidi Açıldı',
        recipient_username || ' earned the ' || badge_record.name || ' badge!',
        recipient_username || ' حصل على شارة ' || badge_record.name || '!',
        recipient_username || ' ' || badge_record.name || ' rozetini kazandı!',
        badge_id,
        jsonb_build_object(
          'badge_id', badge_id,
          'badge_name', badge_record.name,
          'badge_stage', badge_record.stage,
          'recipient_username', recipient_username
        )
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Add collection activity notification function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.create_collection_activity_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_username text;
  follower_record RECORD;
  activity_type text;
  activity_description text;
  activity_description_ar text;
  activity_description_tr text;
BEGIN
  -- Get active user username
  SELECT username INTO active_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Determine activity type and descriptions based on the trigger
  IF TG_OP = 'INSERT' THEN
    activity_type := 'added_to_collection';
    activity_description := ' added a new banknote to their collection';
    activity_description_ar := ' أضاف ورقة نقدية جديدة إلى مجموعته';
    activity_description_tr := ' koleksiyonuna yeni bir banknot ekledi';
  ELSIF TG_OP = 'UPDATE' AND OLD.for_sale = false AND NEW.for_sale = true THEN
    activity_type := 'listed_for_sale';
    activity_description := ' listed a banknote for sale';
    activity_description_ar := ' عرض ورقة نقدية للبيع';
    activity_description_tr := ' bir banknotunu satışa çıkardı';
  ELSE
    RETURN NEW; -- No notification needed for other updates
  END IF;

  -- Create notifications for each follower
  FOR follower_record IN
    SELECT follower_id
    FROM followers
    WHERE following_id = NEW.user_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      title_ar,
      title_tr,
      content,
      content_ar,
      content_tr,
      reference_id,
      reference_data
    ) VALUES (
      follower_record.follower_id,
      'collection_activity',
      'Collection Activity',
      'نشاط المجموعة',
      'Koleksiyon Etkinliği',
      active_username || activity_description,
      active_username || activity_description_ar,
      active_username || activity_description_tr,
      NEW.id,
      jsonb_build_object(
        'active_user_id', NEW.user_id,
        'active_username', active_username,
        'activity_type', activity_type,
        'item_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update blog_post constraint to include all notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('message', 'forum_post', 'collection_activity', 'follow', 'badge_earned', 'badge_achievement', 'blog_post'));

-- Create indexes for better performance on translation columns
CREATE INDEX IF NOT EXISTS idx_notifications_title_ar ON notifications (title_ar);
CREATE INDEX IF NOT EXISTS idx_notifications_title_tr ON notifications (title_tr);
CREATE INDEX IF NOT EXISTS idx_notifications_content_ar ON notifications (content_ar);
CREATE INDEX IF NOT EXISTS idx_notifications_content_tr ON notifications (content_tr);

-- Create a view for localized notifications (optional, for easier querying)
CREATE OR REPLACE VIEW public.notifications_localized AS
SELECT 
  id,
  user_id,
  type,
  title as title_en,
  title_ar,
  title_tr,
  content as content_en,
  content_ar,
  content_tr,
  reference_id,
  reference_data,
  is_read,
  created_at,
  updated_at
FROM notifications;