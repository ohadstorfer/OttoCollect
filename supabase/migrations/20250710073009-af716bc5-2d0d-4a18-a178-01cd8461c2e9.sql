
-- Create a function to award badges to existing users based on their current stats
CREATE OR REPLACE FUNCTION public.award_historical_badges()
RETURNS TABLE(
  user_id uuid,
  username text,
  badges_awarded integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  badge_record RECORD;
  user_stats RECORD;
  badges_count integer;
  total_badges integer := 0;
BEGIN
  -- Loop through all users
  FOR user_record IN
    SELECT id, username FROM profiles
  LOOP
    badges_count := 0;
    
    -- Get user stats for this user
    SELECT 
      COALESCE((SELECT COUNT(*) FROM collection_items ci 
                LEFT JOIN detailed_banknotes db ON ci.banknote_id = db.id 
                WHERE ci.user_id = user_record.id 
                AND db.rarity IS NOT NULL AND db.rarity != ''), 0) as rare_banknotes_count,
      COALESCE((SELECT COUNT(*) FROM collection_items WHERE user_id = user_record.id), 0) as total_banknotes_count,
      COALESCE((SELECT COUNT(*) FROM forum_posts WHERE author_id = user_record.id), 0) as forum_posts_count,
      COALESCE((SELECT get_followers_count(user_record.id)), 0) as followers_count
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
          WHERE user_id = user_record.id AND badge_id = badge_record.id
        ) THEN
          INSERT INTO user_badges (user_id, badge_id)
          VALUES (user_record.id, badge_record.id);
          
          badges_count := badges_count + 1;
          total_badges := total_badges + 1;
        END IF;
      END;
    END LOOP;
    
    -- Return result for this user if any badges were awarded
    IF badges_count > 0 THEN
      RETURN QUERY SELECT 
        user_record.id,
        user_record.username,
        badges_count,
        format('Rare: %s, Total: %s, Posts: %s, Followers: %s', 
               user_stats.rare_banknotes_count, 
               user_stats.total_banknotes_count, 
               user_stats.forum_posts_count, 
               user_stats.followers_count);
    END IF;
  END LOOP;
  
  -- Log total badges awarded
  RAISE NOTICE 'Total badges awarded: %', total_badges;
END;
$$;

-- Create a simpler function to award badges for a specific user
CREATE OR REPLACE FUNCTION public.award_historical_badges_for_user(target_user_id uuid)
RETURNS TABLE(
  badges_awarded integer,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  user_stats RECORD;
  badges_count integer := 0;
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
      END IF;
    END;
  END LOOP;
  
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
