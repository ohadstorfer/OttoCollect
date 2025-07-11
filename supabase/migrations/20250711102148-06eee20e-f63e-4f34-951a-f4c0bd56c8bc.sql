
-- Create function to send badge notifications
CREATE OR REPLACE FUNCTION create_badge_notifications(target_user_id uuid, new_badge_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      content,
      reference_id,
      reference_data
    ) VALUES (
      target_user_id,
      'badge_earned',
      'Congratulations! New Badge Earned',
      'You have earned the "' || badge_record.name || '" badge! ' || badge_record.description,
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
        content,
        reference_id,
        reference_data
      ) VALUES (
        follower_record.follower_id,
        'badge_achievement',
        'Badge Achievement',
        target_username || ' earned the "' || badge_record.name || '" badge! ' || badge_record.description,
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
$$;

-- Update the badge award function to include notifications
CREATE OR REPLACE FUNCTION check_and_award_badges_for_user(user_id_to_check uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  user_stat RECORD;
  new_badges uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Get user's current stats
  FOR user_stat IN SELECT * FROM get_user_badge_stats(user_id_to_check)
  LOOP
    -- Find eligible badges for this category that haven't been awarded yet
    FOR badge_record IN 
      SELECT b.* 
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = user_id_to_check
      WHERE b.category = user_stat.category
        AND b.threshold_value <= user_stat.current_value
        AND ub.id IS NULL
    LOOP
      -- Award the badge
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (user_id_to_check, badge_record.id);
      
      -- Add to list of new badges for notification
      new_badges := array_append(new_badges, badge_record.id);
    END LOOP;
  END LOOP;

  -- Create notifications for new badges
  IF array_length(new_badges, 1) > 0 THEN
    PERFORM create_badge_notifications(user_id_to_check, new_badges);
  END IF;
END;
$$;

-- Update the award_historical_badges_for_user function to include notifications
CREATE OR REPLACE FUNCTION award_historical_badges_for_user(target_user_id uuid)
RETURNS TABLE(badges_awarded integer, details text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  user_stats RECORD;
  badges_count integer := 0;
  new_badges uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Get user stats for the target user
  SELECT 
    COALESCE((SELECT COUNT(*) FROM collection_items ci 
              LEFT JOIN detailed_banknotes db ON ci.banknote_id = db.id 
              WHERE ci.user_id = target_user_id 
              AND db.rarity IS NOT NULL AND db.rarity != ''), 0) as rare_banknotes_count,
    COALESCE((SELECT COUNT(*) FROM collection_items WHERE user_id = target_user_id), 0) as total_banknotes_count,
    COALESCE((SELECT COUNT(*) FROM forum_posts WHERE author_id = target_user_id), 0) as forum_posts_count,
    COALESCE((SELECT get_followers_count(target_user_id)), 0) as followers_count
  INTO user_stats;
  
  -- Award badges for each category
  FOR badge_record IN
    SELECT * FROM badges 
    WHERE is_automatic_award = true 
    ORDER BY category, threshold_value ASC
  LOOP
    DECLARE
      current_value integer := 0;
      should_award boolean := false;
    BEGIN
      -- Determine current value based on badge category
      CASE badge_record.category
        WHEN 'rare_banknotes' THEN
          current_value := user_stats.rare_banknotes_count;
        WHEN 'add_banknotes' THEN
          current_value := user_stats.total_banknotes_count;
        WHEN 'forum_posts' THEN
          current_value := user_stats.forum_posts_count;
        WHEN 'social_engagement' THEN
          current_value := user_stats.followers_count;
        ELSE
          current_value := 0;
      END CASE;
      
      -- Check if user qualifies for this badge
      IF current_value >= COALESCE(badge_record.threshold_value, 0) THEN
        should_award := true;
      END IF;
      
      -- Award badge if qualified and not already awarded
      IF should_award AND NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_id = target_user_id AND badge_id = badge_record.id
      ) THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (target_user_id, badge_record.id);
        
        badges_count := badges_count + 1;
        new_badges := array_append(new_badges, badge_record.id);
      END IF;
    END;
  END LOOP;
  
  -- Create notifications for new badges
  IF array_length(new_badges, 1) > 0 THEN
    PERFORM create_badge_notifications(target_user_id, new_badges);
  END IF;
  
  -- Return result
  RETURN QUERY SELECT 
    badges_count,
    format('Rare: %s, Total: %s, Posts: %s, Followers: %s', 
           user_stats.rare_banknotes_count, 
           user_stats.total_banknotes_count, 
           user_stats.forum_posts_count, 
           user_stats.followers_count);
END;
$$;
