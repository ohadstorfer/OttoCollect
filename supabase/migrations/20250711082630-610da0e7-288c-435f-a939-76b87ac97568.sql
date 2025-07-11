
-- Update existing badges stages and names
UPDATE badges SET 
  stage = CASE stage
    WHEN 'bronze' THEN 'Stage 1'
    WHEN 'silver' THEN 'Stage 2'  
    WHEN 'gold' THEN 'Stage 3'
    WHEN 'platinum' THEN 'Stage 4'
    WHEN 'diamond' THEN 'Stage 5'
    ELSE stage
  END,
  name = CASE name
    -- Rare Banknotes Category
    WHEN 'Rare Collector Bronze' THEN 'Rare Collector Stage 1'
    WHEN 'Rare Collector Silver' THEN 'Rare Collector Stage 2'
    WHEN 'Rare Collector Gold' THEN 'Rare Collector Stage 3'
    WHEN 'Rare Collector Platinum' THEN 'Rare Collector Stage 4'
    WHEN 'Rare Collector Diamond' THEN 'Rare Collector Stage 5'
    
    -- Wish List Category
    WHEN 'Wishful Bronze' THEN 'Wishful Stage 1'
    WHEN 'Wishful Silver' THEN 'Wishful Stage 2'
    WHEN 'Wishful Gold' THEN 'Wishful Stage 3'
    WHEN 'Wishful Platinum' THEN 'Wishful Stage 4'
    WHEN 'Wishful Diamond' THEN 'Wishful Stage 5'
    
    -- Add Banknotes Category
    WHEN 'Collector Bronze' THEN 'Collector Stage 1'
    WHEN 'Collector Silver' THEN 'Collector Stage 2'
    WHEN 'Collector Gold' THEN 'Collector Stage 3'
    WHEN 'Collector Platinum' THEN 'Collector Stage 4'
    WHEN 'Collector Diamond' THEN 'Collector Stage 5'
    
    -- Forum Posts Category
    WHEN 'Forum Bronze' THEN 'Forum Stage 1'
    WHEN 'Forum Silver' THEN 'Forum Stage 2'
    WHEN 'Forum Gold' THEN 'Forum Stage 3'
    WHEN 'Forum Platinum' THEN 'Forum Stage 4'
    WHEN 'Forum Diamond' THEN 'Forum Stage 5'
    
    -- Social Engagement Category
    WHEN 'Social Bronze' THEN 'Social Stage 1'
    WHEN 'Social Silver' THEN 'Social Stage 2'
    WHEN 'Social Gold' THEN 'Social Stage 3'
    WHEN 'Social Platinum' THEN 'Social Stage 4'
    WHEN 'Social Diamond' THEN 'Social Stage 5'
    
    ELSE name
  END;

-- Update the badge creation migration to use new stage names
-- First, clear existing badge data and recreate with new naming
DELETE FROM user_badges;
DELETE FROM badges;

-- Insert comprehensive badge definitions with new stage naming
INSERT INTO badges (name, description, category, stage, threshold_value, criteria, icon_url, is_automatic_award) VALUES

-- Rare Banknotes Category (1, 3, 10, 25, 50+)
('Rare Collector Stage 1', 'Collected more than 1 rare banknote', 'rare_banknotes', 'Stage 1', 1, 'Own 1-3 rare banknotes in collection', '/badges/stage1.png', true),
('Rare Collector Stage 2', 'Collected more than 3 rare banknotes', 'rare_banknotes', 'Stage 2', 3, 'Own 3-10 rare banknotes in collection', '/badges/stage2.png', true),  
('Rare Collector Stage 3', 'Collected more than 10 rare banknotes', 'rare_banknotes', 'Stage 3', 10, 'Own 10-25 rare banknotes in collection', '/badges/stage3.png', true),
('Rare Collector Stage 4', 'Collected more than 25 rare banknotes', 'rare_banknotes', 'Stage 4', 25, 'Own 25-50 rare banknotes in collection', '/badges/stage4.png', true),
('Rare Collector Stage 5', 'Collected more than 50 rare banknotes', 'rare_banknotes', 'Stage 5', 50, 'Own 50+ rare banknotes in collection', '/badges/stage5.png', true),

-- Wish List Category (1, 4, 20, 50, 150+)
('Wishful Stage 1', 'Added more than 1 banknote to wish list', 'wish_list', 'Stage 1', 1, 'Add 1-4 banknotes to wish list', '/badges/stage1.png', true),
('Wishful Stage 2', 'Added more than 4 banknotes to wish list', 'wish_list', 'Stage 2', 4, 'Add 4-20 banknotes to wish list', '/badges/stage2.png', true),
('Wishful Stage 3', 'Added more than 20 banknotes to wish list', 'wish_list', 'Stage 3', 20, 'Add 20-50 banknotes to wish list', '/badges/stage3.png', true),
('Wishful Stage 4', 'Added more than 50 banknotes to wish list', 'wish_list', 'Stage 4', 50, 'Add 50-150 banknotes to wish list', '/badges/stage4.png', true),
('Wishful Stage 5', 'Added more than 150 banknotes to wish list', 'wish_list', 'Stage 5', 150, 'Add 150+ banknotes to wish list', '/badges/stage5.png', true),

-- Add Banknotes Category (1, 30, 90, 150, 300+)
('Collector Stage 1', 'Added more than 1 banknote to collection', 'add_banknotes', 'Stage 1', 1, 'Add 1-29 banknotes to your collection', '/badges/stage1.png', true),
('Collector Stage 2', 'Added more than 30 banknotes to collection', 'add_banknotes', 'Stage 2', 30, 'Add 30-89 banknotes to your collection', '/badges/stage2.png', true),
('Collector Stage 3', 'Added more than 90 banknotes to collection', 'add_banknotes', 'Stage 3', 90, 'Add 90-149 banknotes to your collection', '/badges/stage3.png', true),
('Collector Stage 4', 'Added more than 150 banknotes to collection', 'add_banknotes', 'Stage 4', 150, 'Add 150-299 banknotes to your collection', '/badges/stage4.png', true),
('Collector Stage 5', 'Added more than 300 banknotes to collection', 'add_banknotes', 'Stage 5', 300, 'Add 300+ banknotes to your collection', '/badges/stage5.png', true),

-- Forum Posts Category (1, 5, 20, 60, 200+)  
('Forum Stage 1', 'Created more than 1 forum post', 'forum_posts', 'Stage 1', 1, 'Create 1-5 forum posts', '/badges/stage1.png', true),
('Forum Stage 2', 'Created more than 5 forum posts', 'forum_posts', 'Stage 2', 5, 'Create 5-20 forum posts', '/badges/stage2.png', true),
('Forum Stage 3', 'Created more than 20 forum posts', 'forum_posts', 'Stage 3', 20, 'Create 20-60 forum posts', '/badges/stage3.png', true),
('Forum Stage 4', 'Created more than 60 forum posts', 'forum_posts', 'Stage 4', 60, 'Create 60-200 forum posts', '/badges/stage4.png', true),
('Forum Stage 5', 'Created more than 200 forum posts', 'forum_posts', 'Stage 5', 200, 'Create 200+ forum posts', '/badges/stage5.png', true),

-- Social Engagement Category (5, 15, 50, 100, 200+)
('Social Stage 1', 'Gained more than 5 followers', 'social_engagement', 'Stage 1', 5, 'Gain 5 followers', '/badges/stage1.png', true),
('Social Stage 2', 'Gained more than 15 followers', 'social_engagement', 'Stage 2', 15, 'Gain 15 followers', '/badges/stage2.png', true),
('Social Stage 3', 'Gained more than 50 followers', 'social_engagement', 'Stage 3', 50, 'Gain 50 followers', '/badges/stage3.png', true),
('Social Stage 4', 'Gained more than 100 followers', 'social_engagement', 'Stage 4', 100, 'Gain 100 followers', '/badges/stage4.png', true),
('Social Stage 5', 'Gained more than 200 followers', 'social_engagement', 'Stage 5', 200, 'Gain 200+ followers', '/badges/stage5.png', true);
