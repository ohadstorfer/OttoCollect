-- Add translation columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN title_ar TEXT,
ADD COLUMN title_tr TEXT,
ADD COLUMN content_ar TEXT,
ADD COLUMN content_tr TEXT;

-- Update existing notifications with translations for common notification types
UPDATE public.notifications SET
  title_ar = CASE 
    WHEN title = 'New Follower' THEN 'متابع جديد'
    WHEN title = 'Collection Update' THEN 'تحديث المجموعة'
    WHEN title = 'New Collection Items' THEN 'عناصر جديدة في المجموعة'
    WHEN title = 'Collection Updates' THEN 'تحديثات المجموعة'
    WHEN title = 'New Forum Post' THEN 'منشور جديد في المنتدى'
    WHEN title = 'Congratulations! New Badge Earned' THEN 'تهانينا! حصلت على شارة جديدة'
    WHEN title = 'Badge Achievement' THEN 'إنجاز الشارة'
    ELSE title
  END,
  title_tr = CASE 
    WHEN title = 'New Follower' THEN 'Yeni Takipçi'
    WHEN title = 'Collection Update' THEN 'Koleksiyon Güncelleme'
    WHEN title = 'New Collection Items' THEN 'Yeni Koleksiyon Öğeleri'
    WHEN title = 'Collection Updates' THEN 'Koleksiyon Güncellemeleri'
    WHEN title = 'New Forum Post' THEN 'Yeni Forum Gönderisi'
    WHEN title = 'Congratulations! New Badge Earned' THEN 'Tebrikler! Yeni Rozet Kazandınız'
    WHEN title = 'Badge Achievement' THEN 'Rozet Başarısı'
    ELSE title
  END;

-- Update content translations for follow notifications
UPDATE public.notifications SET
  content_ar = CASE 
    WHEN type = 'follow' AND content LIKE '%started following you' THEN 
      REPLACE(content, ' started following you', ' بدأ في متابعتك')
    WHEN type = 'collection_activity' AND content LIKE '%added%and updated%collection items' THEN
      REGEXP_REPLACE(content, '(.+) added (\d+) and updated (\d+) collection items', 
        '\1 أضاف \2 وحدّث \3 عناصر في المجموعة')
    WHEN type = 'collection_activity' AND content LIKE '%added%new banknotes to their collection' THEN
      REGEXP_REPLACE(content, '(.+) added (\d+) new banknotes to their collection', 
        '\1 أضاف \2 أوراق نقدية جديدة إلى مجموعته')
    WHEN type = 'collection_activity' AND content LIKE '%updated%collection items' THEN
      REGEXP_REPLACE(content, '(.+) updated (\d+) collection items', 
        '\1 حدّث \2 عناصر في المجموعة')
    WHEN type = 'forum_post' AND content LIKE '%posted in the forum:%' THEN
      REGEXP_REPLACE(content, '(.+) posted in the forum: (.+)', 
        '\1 نشر في المنتدى: \2')
    WHEN type = 'badge_earned' AND content LIKE 'You have earned the%badge!' THEN
      REGEXP_REPLACE(content, 'You have earned the "(.+)" badge! (.+)', 
        'لقد حصلت على شارة "\1"! \2')
    WHEN type = 'badge_achievement' AND content LIKE '%earned the%badge!' THEN
      REGEXP_REPLACE(content, '(.+) earned the "(.+)" badge! (.+)', 
        '\1 حصل على شارة "\2"! \3')
    ELSE content
  END,
  content_tr = CASE 
    WHEN type = 'follow' AND content LIKE '%started following you' THEN 
      REPLACE(content, ' started following you', ' sizi takip etmeye başladı')
    WHEN type = 'collection_activity' AND content LIKE '%added%and updated%collection items' THEN
      REGEXP_REPLACE(content, '(.+) added (\d+) and updated (\d+) collection items', 
        '\1 \2 öğe ekledi ve \3 öğe güncelledi')
    WHEN type = 'collection_activity' AND content LIKE '%added%new banknotes to their collection' THEN
      REGEXP_REPLACE(content, '(.+) added (\d+) new banknotes to their collection', 
        '\1 koleksiyonuna \2 yeni banknot ekledi')
    WHEN type = 'collection_activity' AND content LIKE '%updated%collection items' THEN
      REGEXP_REPLACE(content, '(.+) updated (\d+) collection items', 
        '\1 \2 koleksiyon öğesini güncelledi')
    WHEN type = 'forum_post' AND content LIKE '%posted in the forum:%' THEN
      REGEXP_REPLACE(content, '(.+) posted in the forum: (.+)', 
        '\1 forumda gönderi paylaştı: \2')
    WHEN type = 'badge_earned' AND content LIKE 'You have earned the%badge!' THEN
      REGEXP_REPLACE(content, 'You have earned the "(.+)" badge! (.+)', 
        '"\1" rozetini kazandınız! \2')
    WHEN type = 'badge_achievement' AND content LIKE '%earned the%badge!' THEN
      REGEXP_REPLACE(content, '(.+) earned the "(.+)" badge! (.+)', 
        '\1 "\2" rozetini kazandı! \3')
    ELSE content
  END;

-- Update create_follow_notification function to include translations
CREATE OR REPLACE FUNCTION public.create_follow_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- Update create_forum_post_notification function to include translations
CREATE OR REPLACE FUNCTION public.create_forum_post_notification()
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
$function$;

-- Update create_badge_notifications function to include translations
CREATE OR REPLACE FUNCTION public.create_badge_notifications(target_user_id uuid, new_badge_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  badge_record RECORD;
  follower_record RECORD;
  target_username text;
BEGIN
  -- Get the username of the user who received the badge
  SELECT username INTO target_username
  FROM profiles
  WHERE id = target_user_id;

  -- Loop through each new badge
  FOR badge_record IN
    SELECT b.id, b.name, b.description, b.stage
    FROM badges b
    WHERE b.id = ANY(new_badge_ids)
  LOOP
    -- Send congratulations notification to the badge recipient
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
      target_user_id,
      'badge_earned',
      'Congratulations! New Badge Earned',
      'تهانينا! حصلت على شارة جديدة',
      'Tebrikler! Yeni Rozet Kazandınız',
      'You have earned the "' || badge_record.name || '" badge! ' || badge_record.description,
      'لقد حصلت على شارة "' || badge_record.name || '"! ' || badge_record.description,
      '"' || badge_record.name || '" rozetini kazandınız! ' || badge_record.description,
      badge_record.id,
      jsonb_build_object(
        'badge_id', badge_record.id,
        'badge_name', badge_record.name,
        'badge_description', badge_record.description,
        'badge_stage', badge_record.stage,
        'recipient_id', target_user_id,
        'recipient_username', target_username
      )
    );

    -- Send notifications to all followers
    FOR follower_record IN
      SELECT follower_id
      FROM followers
      WHERE following_id = target_user_id
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
        'Badge Achievement',
        'إنجاز الشارة',
        'Rozet Başarısı',
        target_username || ' earned the "' || badge_record.name || '" badge! ' || badge_record.description,
        target_username || ' حصل على شارة "' || badge_record.name || '"! ' || badge_record.description,
        target_username || ' "' || badge_record.name || '" rozetini kazandı! ' || badge_record.description,
        badge_record.id,
        jsonb_build_object(
          'badge_id', badge_record.id,
          'badge_name', badge_record.name,
          'badge_description', badge_record.description,
          'badge_stage', badge_record.stage,
          'recipient_id', target_user_id,
          'recipient_username', target_username
        )
      );
    END LOOP;
  END LOOP;
END;
$function$;

-- Update generate_collection_activity_notifications function to include translations  
CREATE OR REPLACE FUNCTION public.generate_collection_activity_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      notification_title_ar text;
      notification_title_tr text;
      notification_content text;
      notification_content_ar text;
      notification_content_tr text;
      total_activity integer;
    BEGIN
      total_activity := activity_record.items_added + activity_record.items_updated;
      
      -- Create appropriate title and content based on activity
      IF activity_record.items_added > 0 AND activity_record.items_updated > 0 THEN
        notification_title := 'Collection Update';
        notification_title_ar := 'تحديث المجموعة';
        notification_title_tr := 'Koleksiyon Güncelleme';
        notification_content := activity_record.active_username || ' added ' || activity_record.items_added || ' and updated ' || activity_record.items_updated || ' collection items';
        notification_content_ar := activity_record.active_username || ' أضاف ' || activity_record.items_added || ' وحدّث ' || activity_record.items_updated || ' عناصر في المجموعة';
        notification_content_tr := activity_record.active_username || ' ' || activity_record.items_added || ' öğe ekledi ve ' || activity_record.items_updated || ' öğe güncelledi';
      ELSIF activity_record.items_added > 0 THEN
        notification_title := 'New Collection Items';
        notification_title_ar := 'عناصر جديدة في المجموعة';
        notification_title_tr := 'Yeni Koleksiyon Öğeleri';
        notification_content := activity_record.active_username || ' added ' || activity_record.items_added || ' new banknotes to their collection';
        notification_content_ar := activity_record.active_username || ' أضاف ' || activity_record.items_added || ' أوراق نقدية جديدة إلى مجموعته';
        notification_content_tr := activity_record.active_username || ' koleksiyonuna ' || activity_record.items_added || ' yeni banknot ekledi';
      ELSE
        notification_title := 'Collection Updates';
        notification_title_ar := 'تحديثات المجموعة';
        notification_title_tr := 'Koleksiyon Güncellemeleri';
        notification_content := activity_record.active_username || ' updated ' || activity_record.items_updated || ' collection items';
        notification_content_ar := activity_record.active_username || ' حدّث ' || activity_record.items_updated || ' عناصر في المجموعة';
        notification_content_tr := activity_record.active_username || ' ' || activity_record.items_updated || ' koleksiyon öğesini güncelledi';
      END IF;

      -- Insert notification (only if one doesn't already exist for today)
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
      ) 
      SELECT 
        activity_record.user_id,
        'collection_activity',
        notification_title,
        notification_title_ar,
        notification_title_tr,
        notification_content,
        notification_content_ar,
        notification_content_tr,
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
$function$;