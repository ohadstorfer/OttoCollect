
-- Update the calculate_user_rank function with new point thresholds
CREATE OR REPLACE FUNCTION public.calculate_user_rank(user_points integer, user_role text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    base_rank TEXT;
BEGIN
    -- Determine base rank from points with new thresholds
    IF user_points <= 19 THEN
        base_rank := 'Newbie Collector';
    ELSIF user_points <= 79 THEN
        base_rank := 'Beginner Collector';
    ELSIF user_points <= 399 THEN
        base_rank := 'Mid Collector';
    ELSIF user_points <= 999 THEN
        base_rank := 'Known Collector';
    ELSIF user_points <= 1999 THEN
        base_rank := 'Advance Collector';
    ELSE
        base_rank := 'Master Collector';
    END IF;
    
    RETURN base_rank;
END;
$$;

-- Update the award_points_for_collection_item function (remains 1 point)
CREATE OR REPLACE FUNCTION public.award_points_for_collection_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Award 1 point for adding banknote to collection
    PERFORM award_points_and_update_rank(NEW.user_id, 1);
    RETURN NEW;
END;
$$;

-- Update the award_points_for_image_upload function (now 10 points, or 50 for rare banknotes)
CREATE OR REPLACE FUNCTION public.award_points_for_image_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    banknote_rarity TEXT;
    points_to_award INTEGER := 10; -- Default points for image upload
BEGIN
    -- Check if images are being uploaded (obverse or reverse)
    IF (OLD.obverse_image IS NULL AND NEW.obverse_image IS NOT NULL) OR
       (OLD.reverse_image IS NULL AND NEW.reverse_image IS NOT NULL) THEN
        
        -- Check if the banknote is rare (only for listed banknotes)
        IF NEW.banknote_id IS NOT NULL THEN
            SELECT rarity INTO banknote_rarity
            FROM detailed_banknotes
            WHERE id = NEW.banknote_id;
            
            -- If banknote has a rarity value, award 50 points instead of 10
            IF banknote_rarity IS NOT NULL AND banknote_rarity != '' THEN
                points_to_award := 50;
            END IF;
        END IF;
        
        PERFORM award_points_and_update_rank(NEW.user_id, points_to_award);
    END IF;
    RETURN NEW;
END;
$$;

-- Update the award_points_for_forum_post function (now 5 points)
CREATE OR REPLACE FUNCTION public.award_points_for_forum_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Award 5 points for creating forum post
    PERFORM award_points_and_update_rank(NEW.author_id, 5);
    RETURN NEW;
END;
$$;

-- The award_points_for_forum_comment function already awards 1 point, so no change needed

-- Create new function for image suggestion points (1 point for suggesting)
CREATE OR REPLACE FUNCTION public.award_points_for_image_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Award 1 point for suggesting an image
    PERFORM award_points_and_update_rank(NEW.user_id, 1);
    RETURN NEW;
END;
$$;

-- Create trigger for image suggestions
DROP TRIGGER IF EXISTS award_points_for_image_suggestion_trigger ON image_suggestions;
CREATE TRIGGER award_points_for_image_suggestion_trigger
    AFTER INSERT ON image_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION award_points_for_image_suggestion();

-- Create function for when image suggestions are accepted (50 points, or 100 for rare banknotes)
CREATE OR REPLACE FUNCTION public.award_points_for_accepted_image_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    banknote_rarity TEXT;
    points_to_award INTEGER := 50; -- Default points for accepted suggestion
BEGIN
    -- Only award points when status changes to 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        -- Check if the banknote is rare
        SELECT rarity INTO banknote_rarity
        FROM detailed_banknotes
        WHERE id = NEW.banknote_id;
        
        -- If banknote has a rarity value, award 100 points instead of 50
        IF banknote_rarity IS NOT NULL AND banknote_rarity != '' THEN
            points_to_award := 100;
        END IF;
        
        PERFORM award_points_and_update_rank(NEW.user_id, points_to_award);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for accepted image suggestions
DROP TRIGGER IF EXISTS award_points_for_accepted_image_suggestion_trigger ON image_suggestions;
CREATE TRIGGER award_points_for_accepted_image_suggestion_trigger
    AFTER UPDATE ON image_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION award_points_for_accepted_image_suggestion();

-- Create function for admin role promotion (500 points, one time only)
CREATE OR REPLACE FUNCTION public.award_points_for_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Award 500 points when user becomes admin (role changes to include 'Admin')
    IF (OLD.role IS NULL OR OLD.role NOT LIKE '%Admin%') AND NEW.role LIKE '%Admin%' THEN
        PERFORM award_points_and_update_rank(NEW.id, 500);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for admin promotion
DROP TRIGGER IF EXISTS award_points_for_admin_promotion_trigger ON profiles;
CREATE TRIGGER award_points_for_admin_promotion_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION award_points_for_admin_promotion();
