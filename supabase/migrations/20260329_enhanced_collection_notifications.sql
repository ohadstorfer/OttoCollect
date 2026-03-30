-- Enhanced generate_collection_activity_notifications function
-- Changes:
-- 1. Joins with detailed_banknotes/unlisted_banknotes to get country + extended_pick_number
-- 2. For ≤5 items: includes per-item details (pick number, country, collection_item_id) in reference_data
-- 3. For >5 items: groups by country, creates one notification per country with count summary

CREATE OR REPLACE FUNCTION public.generate_collection_activity_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  activity_record RECORD;
BEGIN
  -- Process each follower + followed-user pair with yesterday's collection activity
  FOR activity_record IN
    SELECT
      f.follower_id as user_id,
      ci.user_id as active_user_id,
      p.username as active_username,
      -- Collect per-item details as JSON array
      json_agg(
        json_build_object(
          'collection_item_id', ci.id,
          'extended_pick_number', COALESCE(db.extended_pick_number, ub.extended_pick_number, 'Unknown'),
          'country', COALESCE(db.country, ub.country, 'Unknown'),
          'is_unlisted', ci.is_unlisted_banknote
        )
      ) FILTER (WHERE ci.created_at::date = CURRENT_DATE - INTERVAL '1 day') as items_added_details,
      COUNT(CASE WHEN ci.created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as items_added,
      COUNT(CASE WHEN ci.updated_at::date = CURRENT_DATE - INTERVAL '1 day' AND ci.created_at::date != CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as items_updated
    FROM followers f
    JOIN collection_items ci ON ci.user_id = f.following_id
    JOIN profiles p ON p.id = f.following_id
    LEFT JOIN detailed_banknotes db ON db.id = ci.banknote_id AND NOT ci.is_unlisted_banknote
    LEFT JOIN unlisted_banknotes ub ON ub.id = ci.unlisted_banknotes_id AND ci.is_unlisted_banknote
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
      total_added integer;
      ref_data jsonb;
      items_json jsonb;
      pick_numbers text;
      country_record RECORD;
      country_counts jsonb;
      country_summary text;
      country_summary_ar text;
      country_summary_tr text;
    BEGIN
      total_added := activity_record.items_added;
      items_json := activity_record.items_added_details::jsonb;

      -- Handle items_updated only notifications (no added items)
      IF total_added = 0 AND activity_record.items_updated > 0 THEN
        notification_title := 'Collection Updates';
        notification_title_ar := 'تحديثات المجموعة';
        notification_title_tr := 'Koleksiyon Güncellemeleri';
        notification_content := activity_record.active_username || ' updated ' || activity_record.items_updated || ' collection items';
        notification_content_ar := activity_record.active_username || ' حدّث ' || activity_record.items_updated || ' عناصر في المجموعة';
        notification_content_tr := activity_record.active_username || ' ' || activity_record.items_updated || ' koleksiyon öğesini güncelledi';

        ref_data := jsonb_build_object(
          'active_user_id', activity_record.active_user_id,
          'active_username', activity_record.active_username,
          'items_added', 0,
          'items_updated', activity_record.items_updated,
          'activity_date', CURRENT_DATE - INTERVAL '1 day'
        );

        INSERT INTO notifications (user_id, type, title, title_ar, title_tr, content, content_ar, content_tr, reference_id, reference_data)
        SELECT
          activity_record.user_id,
          'collection_activity',
          notification_title, notification_title_ar, notification_title_tr,
          notification_content, notification_content_ar, notification_content_tr,
          activity_record.active_user_id,
          ref_data
        WHERE NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = activity_record.user_id
            AND type = 'collection_activity'
            AND reference_id = activity_record.active_user_id
            AND created_at::date = CURRENT_DATE
        );

      -- Items added: always include up to 10 items with pick numbers
      ELSE
        DECLARE
          country_names text;
          first_country text;
          items_to_include jsonb;
          remaining_count integer;
        BEGIN
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

          remaining_count := total_added - LEAST(total_added, 10);

          -- Build pick numbers string from the included items
          SELECT string_agg(item->>'extended_pick_number', ', ')
          INTO pick_numbers
          FROM jsonb_array_elements(items_to_include) AS item;

          notification_title := 'New Collection Items';
          notification_title_ar := 'عناصر جديدة في المجموعة';
          notification_title_tr := 'Yeni Koleksiyon Öğeleri';

          IF remaining_count > 0 THEN
            notification_content := activity_record.active_username || ' added ' || pick_numbers || ' and ' || remaining_count || ' more to their ' || country_names || ' collection';
            notification_content_ar := activity_record.active_username || ' أضاف ' || pick_numbers || ' و ' || remaining_count || ' أخرى إلى مجموعة ' || country_names;
            notification_content_tr := activity_record.active_username || ' ' || country_names || ' koleksiyonuna ' || pick_numbers || ' ve ' || remaining_count || ' tane daha ekledi';
          ELSE
            notification_content := activity_record.active_username || ' added ' || pick_numbers || ' to their ' || country_names || ' collection';
            notification_content_ar := activity_record.active_username || ' أضاف ' || pick_numbers || ' إلى مجموعة ' || country_names;
            notification_content_tr := activity_record.active_username || ' ' || country_names || ' koleksiyonuna ' || pick_numbers || ' ekledi';
          END IF;

          -- Also mention updates if any
          IF activity_record.items_updated > 0 THEN
            notification_content := notification_content || ' and updated ' || activity_record.items_updated || ' items';
            notification_content_ar := notification_content_ar || ' وحدّث ' || activity_record.items_updated || ' عناصر';
            notification_content_tr := notification_content_tr || ' ve ' || activity_record.items_updated || ' öğe güncelledi';
          END IF;

          ref_data := jsonb_build_object(
            'active_user_id', activity_record.active_user_id,
            'active_username', activity_record.active_username,
            'items_added', total_added,
            'items_updated', activity_record.items_updated,
            'activity_date', CURRENT_DATE - INTERVAL '1 day',
            'country', first_country,
            'items', items_to_include
          );

          INSERT INTO notifications (user_id, type, title, title_ar, title_tr, content, content_ar, content_tr, reference_id, reference_data)
          SELECT
            activity_record.user_id,
            'collection_activity',
            notification_title, notification_title_ar, notification_title_tr,
            notification_content, notification_content_ar, notification_content_tr,
            activity_record.active_user_id,
            ref_data
          WHERE NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE user_id = activity_record.user_id
              AND type = 'collection_activity'
              AND reference_id = activity_record.active_user_id
              AND created_at::date = CURRENT_DATE
          );
        END;
      END IF;
    END;
  END LOOP;
END;
$function$;
