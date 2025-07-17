-- Fix wishlist items badge integration with correct column names

-- Drop and recreate the function with correct return type and column names
DROP FUNCTION IF EXISTS get_user_badge_stats(uuid);

CREATE OR REPLACE FUNCTION get_user_badge_stats(user_id_param uuid)
RETURNS TABLE (
  category text,
  current_value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'add_banknotes'::text,
    COUNT(*)::bigint
  FROM collection_items
  WHERE user_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'forum_posts'::text,
    COUNT(*)::bigint
  FROM forum_posts
  WHERE author_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'rare_banknotes'::text,
    COUNT(*)::bigint
  FROM collection_items ci
  JOIN detailed_banknotes b ON ci.banknote_id = b.id
  WHERE ci.user_id = user_id_param AND b.rarity IS NOT NULL AND b.rarity != ''
  
  UNION ALL
  
  SELECT 
    'wish_list'::text,
    COUNT(*)::bigint
  FROM wishlist_items
  WHERE user_id = user_id_param
  
  UNION ALL
  
  SELECT 
    'social_engagement'::text,
    COUNT(*)::bigint
  FROM followers
  WHERE following_id = user_id_param;
END;
$$;

-- Create a trigger function that calls the badge checking function
CREATE OR REPLACE FUNCTION check_and_award_badges_trigger()
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
      user_id_to_check := NEW.author_id;
    WHEN 'wishlist_items' THEN
      user_id_to_check := NEW.user_id;
    WHEN 'followers' THEN
      user_id_to_check := NEW.following_id;
    ELSE
      RETURN NEW;
  END CASE;

  -- Call the main function
  PERFORM check_and_award_badges_for_user(user_id_to_check);

  RETURN NEW;
END;
$$;

-- Add missing trigger for wishlist_items
DROP TRIGGER IF EXISTS check_badges_wishlist_items ON wishlist_items;
CREATE TRIGGER check_badges_wishlist_items
  AFTER INSERT OR UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges_trigger();

-- Award historical badges for all users' wishlist items
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