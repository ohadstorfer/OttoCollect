-- Create daily statistics tables for admin dashboard

-- User activity statistics
CREATE TABLE public.daily_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_registered_users INTEGER NOT NULL DEFAULT 0,
  weekly_guest_visits INTEGER NOT NULL DEFAULT 0,
  weekly_active_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Catalog statistics per country
CREATE TABLE public.daily_catalog_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  country_name TEXT NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_collections INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  items_missing_photos INTEGER NOT NULL DEFAULT 0,
  items_with_photos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog statistics
CREATE TABLE public.daily_blog_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_blog_posts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum statistics
CREATE TABLE public.daily_forum_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_forum_posts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User collection view statistics
CREATE TABLE public.user_collection_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for guest views
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog post views tracking
CREATE TABLE public.blog_post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for guest views
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guest session tracking for unregistered users
CREATE TABLE public.guest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User login tracking for active users count
CREATE TABLE public.user_logins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, login_date) -- One login per user per day
);

-- Enable RLS on all tables
ALTER TABLE public.daily_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_catalog_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_blog_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_forum_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only super admins can access stats tables
CREATE POLICY "Only super admins can access daily_user_stats" ON public.daily_user_stats
  FOR ALL USING (is_super_admin());

CREATE POLICY "Only super admins can access daily_catalog_stats" ON public.daily_catalog_stats
  FOR ALL USING (is_super_admin());

CREATE POLICY "Only super admins can access daily_blog_stats" ON public.daily_blog_stats
  FOR ALL USING (is_super_admin());

CREATE POLICY "Only super admins can access daily_forum_stats" ON public.daily_forum_stats
  FOR ALL USING (is_super_admin());

CREATE POLICY "Only super admins can access user_collection_views" ON public.user_collection_views
  FOR ALL USING (is_super_admin());

CREATE POLICY "Only super admins can access blog_post_views" ON public.blog_post_views
  FOR ALL USING (is_super_admin());

CREATE POLICY "Allow authenticated users to track their sessions" ON public.guest_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow users to track their logins" ON public.user_logins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only super admins can view user_logins" ON public.user_logins
  FOR SELECT USING (is_super_admin());

-- Create indexes for better performance
CREATE INDEX idx_daily_user_stats_date ON public.daily_user_stats(date DESC);
CREATE INDEX idx_daily_catalog_stats_date_country ON public.daily_catalog_stats(date DESC, country_id);
CREATE INDEX idx_daily_blog_stats_date ON public.daily_blog_stats(date DESC);
CREATE INDEX idx_daily_forum_stats_date ON public.daily_forum_stats(date DESC);
CREATE INDEX idx_user_collection_views_user_date ON public.user_collection_views(user_id, view_date DESC);
CREATE INDEX idx_blog_post_views_post_date ON public.blog_post_views(blog_post_id, view_date DESC);
CREATE INDEX idx_user_logins_date ON public.user_logins(login_date DESC);

-- Function to generate daily statistics
CREATE OR REPLACE FUNCTION public.generate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate user statistics
  INSERT INTO public.daily_user_stats (date, total_registered_users, weekly_guest_visits, weekly_active_users)
  VALUES (
    target_date,
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(DISTINCT session_id) FROM guest_sessions 
     WHERE created_at >= target_date - INTERVAL '7 days' AND created_at < target_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM user_logins 
     WHERE login_date >= target_date - INTERVAL '7 days' AND login_date <= target_date)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_registered_users = EXCLUDED.total_registered_users,
    weekly_guest_visits = EXCLUDED.weekly_guest_visits,
    weekly_active_users = EXCLUDED.weekly_active_users,
    updated_at = now();

  -- Generate catalog statistics for each country
  INSERT INTO public.daily_catalog_stats (date, country_id, country_name, total_views, total_collections, total_items, items_missing_photos, items_with_photos)
  SELECT 
    target_date,
    c.id,
    c.name,
    COALESCE(cv.view_count, 0) as total_views,
    COALESCE(coll.collection_count, 0) as total_collections,
    COALESCE(items.item_count, 0) as total_items,
    COALESCE(items.item_count, 0) - COALESCE(items.items_with_photos, 0) as items_missing_photos,
    COALESCE(items.items_with_photos, 0) as items_with_photos
  FROM countries c
  LEFT JOIN (
    SELECT country_id, COUNT(*) as view_count
    FROM user_collection_views
    WHERE view_date = target_date
    GROUP BY country_id
  ) cv ON c.id = cv.country_id
  LEFT JOIN (
    SELECT 
      c2.id as country_id,
      COUNT(DISTINCT ci.user_id) as collection_count
    FROM collection_items ci
    JOIN detailed_banknotes db ON ci.banknote_id = db.id
    JOIN countries c2 ON db.country = c2.name
    WHERE DATE(ci.created_at) <= target_date
    GROUP BY c2.id
  ) coll ON c.id = coll.country_id
  LEFT JOIN (
    SELECT 
      c3.id as country_id,
      COUNT(*) as item_count,
      COUNT(CASE WHEN db.front_picture IS NOT NULL OR db.back_picture IS NOT NULL THEN 1 END) as items_with_photos
    FROM detailed_banknotes db
    JOIN countries c3 ON db.country = c3.name
    WHERE DATE(db.created_at) <= target_date
    GROUP BY c3.id
  ) items ON c.id = items.country_id
  ON CONFLICT (date, country_id) DO UPDATE SET
    total_views = EXCLUDED.total_views,
    total_collections = EXCLUDED.total_collections,
    total_items = EXCLUDED.total_items,
    items_missing_photos = EXCLUDED.items_missing_photos,
    items_with_photos = EXCLUDED.items_with_photos,
    updated_at = now();

  -- Generate blog statistics
  INSERT INTO public.daily_blog_stats (date, total_blog_posts)
  VALUES (
    target_date,
    (SELECT COUNT(*) FROM blog_posts WHERE DATE(created_at) <= target_date)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_blog_posts = EXCLUDED.total_blog_posts,
    updated_at = now();

  -- Generate forum statistics
  INSERT INTO public.daily_forum_stats (date, total_forum_posts)
  VALUES (
    target_date,
    (SELECT COUNT(*) FROM forum_posts WHERE DATE(created_at) <= target_date)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_forum_posts = EXCLUDED.total_forum_posts,
    updated_at = now();
END;
$$;

-- Function to track user login (to be called from auth context)
CREATE OR REPLACE FUNCTION public.track_user_login(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_logins (user_id, login_date)
  VALUES (user_id_param, CURRENT_DATE)
  ON CONFLICT (user_id, login_date) DO NOTHING;
END;
$$;

-- Function to track collection view
CREATE OR REPLACE FUNCTION public.track_collection_view(
  collection_user_id UUID,
  country_id_param UUID,
  viewer_id_param UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_collection_views (user_id, country_id, viewer_id, view_date)
  VALUES (collection_user_id, country_id_param, viewer_id_param, CURRENT_DATE);
END;
$$;

-- Function to track blog post view
CREATE OR REPLACE FUNCTION public.track_blog_post_view(
  post_id UUID,
  viewer_id_param UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.blog_post_views (blog_post_id, viewer_id, view_date)
  VALUES (post_id, viewer_id_param, CURRENT_DATE);
END;
$$;