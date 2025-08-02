-- Add missing RPC functions for statistics service

-- Function to get weekly guest visits
CREATE OR REPLACE FUNCTION public.get_weekly_guest_visits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT session_id)
    FROM guest_sessions 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  );
END;
$$;

-- Function to get weekly active users
CREATE OR REPLACE FUNCTION public.get_weekly_active_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM user_logins 
    WHERE login_date >= CURRENT_DATE - INTERVAL '7 days'
  );
END;
$$;

-- Add unique constraint to daily_user_stats to prevent duplicates
ALTER TABLE public.daily_user_stats ADD CONSTRAINT unique_daily_user_stats_date UNIQUE (date);

-- Add unique constraint to daily_blog_stats to prevent duplicates  
ALTER TABLE public.daily_blog_stats ADD CONSTRAINT unique_daily_blog_stats_date UNIQUE (date);

-- Add unique constraint to daily_forum_stats to prevent duplicates
ALTER TABLE public.daily_forum_stats ADD CONSTRAINT unique_daily_forum_stats_date UNIQUE (date);