
-- First, update all existing badge descriptions to use "more than X" format
UPDATE badges SET description = 
  CASE 
    -- Rare Banknotes Category
    WHEN name = 'Rare Collector Bronze' THEN 'Collected more than 1 rare banknote'
    WHEN name = 'Rare Collector Silver' THEN 'Collected more than 3 rare banknotes'
    WHEN name = 'Rare Collector Gold' THEN 'Collected more than 10 rare banknotes'
    WHEN name = 'Rare Collector Platinum' THEN 'Collected more than 25 rare banknotes'
    WHEN name = 'Rare Collector Diamond' THEN 'Collected more than 50 rare banknotes'
    
    -- Wish List Category
    WHEN name = 'Wishful Bronze' THEN 'Added more than 1 banknote to wish list'
    WHEN name = 'Wishful Silver' THEN 'Added more than 4 banknotes to wish list'
    WHEN name = 'Wishful Gold' THEN 'Added more than 20 banknotes to wish list'
    WHEN name = 'Wishful Platinum' THEN 'Added more than 50 banknotes to wish list'
    WHEN name = 'Wishful Diamond' THEN 'Added more than 150 banknotes to wish list'
    
    -- Add Banknotes Category
    WHEN name = 'Collector Bronze' THEN 'Added more than 1 banknote to collection'
    WHEN name = 'Collector Silver' THEN 'Added more than 30 banknotes to collection'
    WHEN name = 'Collector Gold' THEN 'Added more than 90 banknotes to collection'
    WHEN name = 'Collector Platinum' THEN 'Added more than 150 banknotes to collection'
    WHEN name = 'Collector Diamond' THEN 'Added more than 300 banknotes to collection'
    
    -- Forum Posts Category
    WHEN name = 'Forum Bronze' THEN 'Created more than 1 forum post'
    WHEN name = 'Forum Silver' THEN 'Created more than 5 forum posts'
    WHEN name = 'Forum Gold' THEN 'Created more than 20 forum posts'
    WHEN name = 'Forum Platinum' THEN 'Created more than 60 forum posts'
    WHEN name = 'Forum Diamond' THEN 'Created more than 200 forum posts'
    
    -- Social Engagement Category
    WHEN name = 'Social Bronze' THEN 'Gained more than 5 followers'
    WHEN name = 'Social Silver' THEN 'Gained more than 15 followers'
    WHEN name = 'Social Gold' THEN 'Gained more than 50 followers'
    WHEN name = 'Social Platinum' THEN 'Gained more than 100 followers'
    WHEN name = 'Social Diamond' THEN 'Gained more than 200 followers'
    
    ELSE description -- Keep original description if no match
  END;

-- Create a function to generate badge descriptions with "more than X" format
CREATE OR REPLACE FUNCTION generate_badge_description(
  category_name text,
  stage_name text,
  threshold_val integer
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE category_name
    WHEN 'rare_banknotes' THEN 
      CASE 
        WHEN threshold_val = 1 THEN 'Collected more than 1 rare banknote'
        ELSE 'Collected more than ' || threshold_val || ' rare banknotes'
      END
    WHEN 'wish_list' THEN 
      CASE 
        WHEN threshold_val = 1 THEN 'Added more than 1 banknote to wish list'
        ELSE 'Added more than ' || threshold_val || ' banknotes to wish list'
      END
    WHEN 'add_banknotes' THEN 
      CASE 
        WHEN threshold_val = 1 THEN 'Added more than 1 banknote to collection'
        ELSE 'Added more than ' || threshold_val || ' banknotes to collection'
      END
    WHEN 'forum_posts' THEN 
      CASE 
        WHEN threshold_val = 1 THEN 'Created more than 1 forum post'
        ELSE 'Created more than ' || threshold_val || ' forum posts'
      END
    WHEN 'social_engagement' THEN 
      CASE 
        WHEN threshold_val = 1 THEN 'Gained more than 1 follower'
        ELSE 'Gained more than ' || threshold_val || ' followers'
      END
    ELSE 'Achievement unlocked'
  END;
END;
$$;

-- Create a trigger function to automatically set descriptions when badges are inserted or updated
CREATE OR REPLACE FUNCTION set_badge_description()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-generate description if it's not explicitly provided or if it's being updated
  IF NEW.description IS NULL OR NEW.description = '' OR TG_OP = 'UPDATE' THEN
    NEW.description := generate_badge_description(NEW.category, NEW.stage, NEW.threshold_value);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for the badges table
DROP TRIGGER IF EXISTS trigger_set_badge_description ON badges;
CREATE TRIGGER trigger_set_badge_description
  BEFORE INSERT OR UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION set_badge_description();
