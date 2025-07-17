-- Fix wishlist items badge integration

-- First, update get_user_badge_stats to include wishlist items correctly
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
  WHERE user_id = user_id_param
  
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
  FROM user_followers
  WHERE followed_id = user_id_param;
END;
$$;

-- Add missing trigger for wishlist_items
DROP TRIGGER IF EXISTS check_badges_wishlist_items ON wishlist_items;
CREATE TRIGGER check_badges_wishlist_items
  AFTER INSERT OR UPDATE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

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