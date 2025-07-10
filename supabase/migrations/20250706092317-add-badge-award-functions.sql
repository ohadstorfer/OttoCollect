-- Function to get user's stats for badge categories
CREATE OR REPLACE FUNCTION get_user_badge_stats(user_id_param uuid)
RETURNS TABLE (
  category badge_category,
  current_value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'add_banknotes'::badge_category,
    COUNT(*)::bigint
  FROM collection_items
  WHERE user_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'forum_posts'::badge_category,
    COUNT(*)::bigint
  FROM forum_posts
  WHERE user_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'rare_banknotes'::badge_category,
    COUNT(*)::bigint
  FROM collection_items ci
  JOIN banknotes b ON ci.banknote_id = b.id
  WHERE ci.user_id = user_id_param AND b.is_rare = true
  
  UNION ALL
  
  SELECT 
    'wish_list'::badge_category,
    COUNT(*)::bigint
  FROM wishlist_items
  WHERE user_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'social_engagement'::badge_category,
    COUNT(*)::bigint
  FROM user_followers
  WHERE followed_id = user_id_param;
END;
$$;

-- Function to check and award badges for a specific user
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

-- Function to check and award badges (trigger function)
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_to_check uuid;
BEGIN
  -- Determine which user to check based on the triggering table
  CASE TG_TABLE_NAME
    WHEN 'collection_items' THEN
      user_id_to_check := NEW.user_id;
    WHEN 'forum_posts' THEN
      user_id_to_check := NEW.user_id;
    WHEN 'wishlist_items' THEN
      user_id_to_check := NEW.user_id;
    WHEN 'user_followers' THEN
      user_id_to_check := NEW.followed_id;
    ELSE
      RETURN NEW;
  END CASE;

  -- Call the main function
  PERFORM check_and_award_badges_for_user(user_id_to_check);

  RETURN NEW;
END;
$$;

-- Create triggers for each relevant table
DROP TRIGGER IF EXISTS check_badges_collection_items ON collection_items;
CREATE TRIGGER check_badges_collection_items
  AFTER INSERT OR UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

DROP TRIGGER IF EXISTS check_badges_forum_posts ON forum_posts;
CREATE TRIGGER check_badges_forum_posts
  AFTER INSERT OR UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

DROP TRIGGER IF EXISTS check_badges_wishlist_items ON wishlist_items;
CREATE TRIGGER check_badges_wishlist_items
  AFTER INSERT OR UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

DROP TRIGGER IF EXISTS check_badges_user_followers ON user_followers;
CREATE TRIGGER check_badges_user_followers
  AFTER INSERT OR UPDATE ON user_followers
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

-- Run initial badge check for all users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    PERFORM check_and_award_badges_for_user(user_record.id);
  END LOOP;
END;
$$; 