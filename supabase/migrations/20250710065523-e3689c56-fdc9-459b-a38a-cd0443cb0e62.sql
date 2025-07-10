
-- First, let's check if the columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='badges' AND column_name='category') THEN
        ALTER TABLE badges ADD COLUMN category text;
    END IF;
    
    -- Add stage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='badges' AND column_name='stage') THEN
        ALTER TABLE badges ADD COLUMN stage text;
    END IF;
    
    -- Add threshold_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='badges' AND column_name='threshold_value') THEN
        ALTER TABLE badges ADD COLUMN threshold_value integer;
    END IF;
END $$;

-- Clear existing badge data and insert new comprehensive badges
DELETE FROM user_badges;
DELETE FROM badges;

-- Insert comprehensive badge definitions with exact thresholds
INSERT INTO badges (name, description, category, stage, threshold_value, criteria, icon_url, is_automatic_award) VALUES

-- Rare Banknotes Category (1, 3, 10, 25, 50+)
('Rare Collector Bronze', 'Collected 1-3 rare banknotes', 'rare_banknotes', 'bronze', 1, 'Own 1-3 rare banknotes in collection', '/badges/bronze.png', true),
('Rare Collector Silver', 'Collected 3-10 rare banknotes', 'rare_banknotes', 'silver', 3, 'Own 3-10 rare banknotes in collection', '/badges/silver.png', true),  
('Rare Collector Gold', 'Collected 10-25 rare banknotes', 'rare_banknotes', 'gold', 10, 'Own 10-25 rare banknotes in collection', '/badges/gold.png', true),
('Rare Collector Platinum', 'Collected 25-50 rare banknotes', 'rare_banknotes', 'platinum', 25, 'Own 25-50 rare banknotes in collection', '/badges/platinum.png', true),
('Rare Collector Diamond', 'Collected 50+ rare banknotes', 'rare_banknotes', 'diamond', 50, 'Own 50+ rare banknotes in collection', '/badges/diamond.png', true),

-- Wish List Category (1, 4, 20, 50, 150+)
('Wishful Bronze', 'Added 1-4 banknotes to wish list', 'wish_list', 'bronze', 1, 'Add 1-4 banknotes to wish list', '/badges/bronze.png', true),
('Wishful Silver', 'Added 4-20 banknotes to wish list', 'wish_list', 'silver', 4, 'Add 4-20 banknotes to wish list', '/badges/silver.png', true),
('Wishful Gold', 'Added 20-50 banknotes to wish list', 'wish_list', 'gold', 20, 'Add 20-50 banknotes to wish list', '/badges/gold.png', true),
('Wishful Platinum', 'Added 50-150 banknotes to wish list', 'wish_list', 'platinum', 50, 'Add 50-150 banknotes to wish list', '/badges/platinum.png', true),
('Wishful Diamond', 'Added 150+ banknotes to wish list', 'wish_list', 'diamond', 150, 'Add 150+ banknotes to wish list', '/badges/diamond.png', true),

-- Add Banknotes Category (1, 30, 90, 150, 300+)
('Collector Bronze', 'Added 1-29 banknotes to collection', 'add_banknotes', 'bronze', 1, 'Add 1-29 banknotes to your collection', '/badges/bronze.png', true),
('Collector Silver', 'Added 30-89 banknotes to collection', 'add_banknotes', 'silver', 30, 'Add 30-89 banknotes to your collection', '/badges/silver.png', true),
('Collector Gold', 'Added 90-149 banknotes to collection', 'add_banknotes', 'gold', 90, 'Add 90-149 banknotes to your collection', '/badges/gold.png', true),
('Collector Platinum', 'Added 150-299 banknotes to collection', 'add_banknotes', 'platinum', 150, 'Add 150-299 banknotes to your collection', '/badges/platinum.png', true),
('Collector Diamond', 'Added 300+ banknotes to collection', 'add_banknotes', 'diamond', 300, 'Add 300+ banknotes to your collection', '/badges/diamond.png', true),

-- Forum Posts Category (1, 5, 20, 60, 200+)  
('Forum Bronze', 'Created 1-5 forum posts', 'forum_posts', 'bronze', 1, 'Create 1-5 forum posts', '/badges/bronze.png', true),
('Forum Silver', 'Created 5-20 forum posts', 'forum_posts', 'silver', 5, 'Create 5-20 forum posts', '/badges/silver.png', true),
('Forum Gold', 'Created 20-60 forum posts', 'forum_posts', 'gold', 20, 'Create 20-60 forum posts', '/badges/gold.png', true),
('Forum Platinum', 'Created 60-200 forum posts', 'forum_posts', 'platinum', 60, 'Create 60-200 forum posts', '/badges/platinum.png', true),
('Forum Diamond', 'Created 200+ forum posts', 'forum_posts', 'diamond', 200, 'Create 200+ forum posts', '/badges/diamond.png', true),

-- Social Engagement Category (5, 15, 50, 100, 200+)
('Social Bronze', 'Gained 5 followers', 'social_engagement', 'bronze', 5, 'Gain 5 followers', '/badges/bronze.png', true),
('Social Silver', 'Gained 15 followers', 'social_engagement', 'silver', 15, 'Gain 15 followers', '/badges/silver.png', true),
('Social Gold', 'Gained 50 followers', 'social_engagement', 'gold', 50, 'Gain 50 followers', '/badges/gold.png', true),
('Social Platinum', 'Gained 100 followers', 'social_engagement', 'platinum', 100, 'Gain 100 followers', '/badges/platinum.png', true),
('Social Diamond', 'Gained 200+ followers', 'social_engagement', 'diamond', 200, 'Gain 200+ followers', '/badges/diamond.png', true);

-- Create function to get user badge stats for progress tracking
CREATE OR REPLACE FUNCTION get_user_badge_stats(user_id_param uuid)
RETURNS TABLE(
  category text,
  current_value integer
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'rare_banknotes'::text,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM collection_items ci
      LEFT JOIN detailed_banknotes db ON ci.banknote_id = db.id
      WHERE ci.user_id = user_id_param 
      AND db.rarity IS NOT NULL 
      AND db.rarity != ''
    ), 0)
    
  UNION ALL
  
  SELECT 
    'add_banknotes'::text,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM collection_items
      WHERE user_id = user_id_param
    ), 0)
    
  UNION ALL
  
  SELECT 
    'forum_posts'::text,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM forum_posts
      WHERE author_id = user_id_param
    ), 0)
    
  UNION ALL
  
  SELECT 
    'social_engagement'::text,
    COALESCE((
      SELECT get_followers_count(user_id_param)
    ), 0);
END;
$$;

-- Create simplified function to get user's highest badge
CREATE OR REPLACE FUNCTION get_user_highest_badges(user_id_param uuid)
RETURNS TABLE(
  id text,
  name text,
  stage text,
  category text,
  icon_url text,
  threshold_value integer
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (b.category)
    b.id::text,
    b.name,
    b.stage,
    b.category,
    b.icon_url,
    b.threshold_value
  FROM user_badges ub
  JOIN badges b ON ub.badge_id = b.id
  WHERE ub.user_id = user_id_param
  ORDER BY b.category, b.threshold_value DESC;
END;
$$;
