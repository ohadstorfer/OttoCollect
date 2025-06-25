
-- Create function to count user's daily forum activity (posts + comments)
CREATE OR REPLACE FUNCTION get_user_daily_forum_activity_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_count integer;
BEGIN
    -- Count posts and comments created today
    SELECT 
        (SELECT COUNT(*) FROM forum_posts 
         WHERE author_id = user_id_param 
         AND DATE(created_at) = CURRENT_DATE) +
        (SELECT COUNT(*) FROM forum_comments 
         WHERE author_id = user_id_param 
         AND DATE(created_at) = CURRENT_DATE)
    INTO daily_count;
    
    RETURN COALESCE(daily_count, 0);
END;
$$;

-- Create function to check if user has reached daily forum limit
CREATE OR REPLACE FUNCTION user_has_reached_daily_forum_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_rank text;
    daily_count integer;
    limit_reached boolean := false;
BEGIN
    -- Get user's rank
    SELECT rank INTO user_rank
    FROM profiles
    WHERE id = user_id_param;
    
    -- Check if user has limited ranks
    IF user_rank IN ('Newbie Collector', 'Beginner Collector', 'Mid Collector') THEN
        -- Get daily activity count
        daily_count := get_user_daily_forum_activity_count(user_id_param);
        
        -- Check if limit is reached (6 activities per day)
        IF daily_count >= 6 THEN
            limit_reached := true;
        END IF;
    END IF;
    
    RETURN limit_reached;
END;
$$;
