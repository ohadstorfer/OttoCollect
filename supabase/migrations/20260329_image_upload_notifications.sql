-- Step 1: Add images_uploaded_at column
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS images_uploaded_at timestamptz;

-- Step 2: Trigger to auto-set images_uploaded_at when images change
CREATE OR REPLACE FUNCTION public.set_images_uploaded_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (OLD.obverse_image IS DISTINCT FROM NEW.obverse_image AND NEW.obverse_image IS NOT NULL)
     OR (OLD.reverse_image IS DISTINCT FROM NEW.reverse_image AND NEW.reverse_image IS NOT NULL)
  THEN
    NEW.images_uploaded_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_images_uploaded_at ON collection_items;
CREATE TRIGGER trg_set_images_uploaded_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION set_images_uploaded_at();

-- Step 3: Generate image upload notifications (daily cron)
CREATE OR REPLACE FUNCTION public.generate_image_upload_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  activity_record RECORD;
BEGIN
  FOR activity_record IN
    SELECT
      f.follower_id as user_id,
      ci.user_id as active_user_id,
      p.username as active_username,
      json_agg(
        json_build_object(
          'collection_item_id', ci.id,
          'extended_pick_number', COALESCE(db.extended_pick_number, ub.extended_pick_number, 'Unknown'),
          'country', COALESCE(db.country, ub.country, 'Unknown'),
          'is_unlisted', ci.is_unlisted_banknote
        )
      ) as items_details,
      COUNT(*) as total_items
    FROM followers f
    JOIN collection_items ci ON ci.user_id = f.following_id
    JOIN profiles p ON p.id = f.following_id
    LEFT JOIN detailed_banknotes db ON db.id = ci.banknote_id AND NOT ci.is_unlisted_banknote
    LEFT JOIN unlisted_banknotes ub ON ub.id = ci.unlisted_banknotes_id AND ci.is_unlisted_banknote
    WHERE ci.images_uploaded_at::date = CURRENT_DATE - INTERVAL '1 day'
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
      ref_data jsonb;
      items_json jsonb;
      items_to_include jsonb;
      pick_numbers text;
      country_names text;
      first_country text;
      remaining_count integer;
      total_count integer;
    BEGIN
      items_json := activity_record.items_details::jsonb;
      total_count := activity_record.total_items;

      -- Get country info
      SELECT string_agg(DISTINCT item->>'country', ' & ')
      INTO country_names
      FROM jsonb_array_elements(items_json) AS item;

      SELECT item->>'country'
      INTO first_country
      FROM jsonb_array_elements(items_json) AS item
      LIMIT 1;

      -- Take first 10 items for the chips
      SELECT jsonb_agg(item)
      INTO items_to_include
      FROM (
        SELECT item
        FROM jsonb_array_elements(items_json) AS item
        LIMIT 10
      ) sub;

      remaining_count := total_count - LEAST(total_count, 10);

      -- Build pick numbers string from included items
      SELECT string_agg(item->>'extended_pick_number', ', ')
      INTO pick_numbers
      FROM jsonb_array_elements(items_to_include) AS item;

      notification_title := 'New Collection Images';
      notification_title_ar := 'صور جديدة في المجموعة';
      notification_title_tr := 'Yeni Koleksiyon Görselleri';

      IF remaining_count > 0 THEN
        notification_content := activity_record.active_username || ' uploaded images for ' || pick_numbers || ' and ' || remaining_count || ' more in their ' || country_names || ' collection';
        notification_content_ar := activity_record.active_username || ' رفع صوراً لـ ' || pick_numbers || ' و ' || remaining_count || ' أخرى في مجموعة ' || country_names;
        notification_content_tr := activity_record.active_username || ' ' || country_names || ' koleksiyonundaki ' || pick_numbers || ' ve ' || remaining_count || ' tane daha için görsel yükledi';
      ELSE
        notification_content := activity_record.active_username || ' uploaded images for ' || pick_numbers || ' in their ' || country_names || ' collection';
        notification_content_ar := activity_record.active_username || ' رفع صوراً لـ ' || pick_numbers || ' في مجموعة ' || country_names;
        notification_content_tr := activity_record.active_username || ' ' || country_names || ' koleksiyonundaki ' || pick_numbers || ' için görsel yükledi';
      END IF;

      ref_data := jsonb_build_object(
        'active_user_id', activity_record.active_user_id,
        'active_username', activity_record.active_username,
        'items_added', total_count,
        'activity_date', CURRENT_DATE - INTERVAL '1 day',
        'country', first_country,
        'items', items_to_include
      );

      INSERT INTO notifications (user_id, type, title, title_ar, title_tr, content, content_ar, content_tr, reference_id, reference_data)
      SELECT
        activity_record.user_id,
        'collection_image_upload',
        notification_title, notification_title_ar, notification_title_tr,
        notification_content, notification_content_ar, notification_content_tr,
        activity_record.active_user_id,
        ref_data
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = activity_record.user_id
          AND type = 'collection_image_upload'
          AND reference_id = activity_record.active_user_id
          AND created_at::date = CURRENT_DATE
      );
    END;
  END LOOP;
END;
$function$;

-- Step 4: Schedule daily (run right after the collection activity notifications)
-- Adjust the time to match your existing cron schedule
SELECT cron.schedule(
  'generate-image-upload-notifications',
  '5 5 * * *',  -- 5:05 AM UTC daily (5 min after collection activity)
  $$SELECT generate_image_upload_notifications()$$
);
