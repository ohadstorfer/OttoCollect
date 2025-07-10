
-- Create a function to recalculate all users' points and ranks based on historical actions
CREATE OR REPLACE FUNCTION public.recalculate_all_user_points_and_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    total_points INTEGER;
    collection_points INTEGER;
    image_upload_points INTEGER;
    image_suggestion_points INTEGER;
    accepted_suggestion_points INTEGER;
    forum_post_points INTEGER;
    forum_comment_points INTEGER;
    admin_promotion_points INTEGER;
    new_rank TEXT;
    banknote_rarity TEXT;
BEGIN
    -- Loop through all users
    FOR user_record IN
        SELECT id, role FROM profiles
    LOOP
        total_points := 0;
        
        -- 1. Points for adding banknotes to collection (1 point each)
        SELECT COUNT(*) INTO collection_points
        FROM collection_items
        WHERE user_id = user_record.id;
        
        total_points := total_points + collection_points;
        
        -- 2. Points for uploading images to collection items (10 points each, 50 for rare)
        image_upload_points := 0;
        
        -- Count obverse images
        FOR banknote_rarity IN
            SELECT COALESCE(db.rarity, '') as rarity
            FROM collection_items ci
            LEFT JOIN detailed_banknotes db ON ci.banknote_id = db.id
            WHERE ci.user_id = user_record.id 
            AND ci.obverse_image IS NOT NULL
        LOOP
            IF banknote_rarity IS NOT NULL AND banknote_rarity != '' THEN
                image_upload_points := image_upload_points + 50;
            ELSE
                image_upload_points := image_upload_points + 10;
            END IF;
        END LOOP;
        
        -- Count reverse images
        FOR banknote_rarity IN
            SELECT COALESCE(db.rarity, '') as rarity
            FROM collection_items ci
            LEFT JOIN detailed_banknotes db ON ci.banknote_id = db.id
            WHERE ci.user_id = user_record.id 
            AND ci.reverse_image IS NOT NULL
        LOOP
            IF banknote_rarity IS NOT NULL AND banknote_rarity != '' THEN
                image_upload_points := image_upload_points + 50;
            ELSE
                image_upload_points := image_upload_points + 10;
            END IF;
        END LOOP;
        
        total_points := total_points + image_upload_points;
        
        -- 3. Points for suggesting images (1 point each)
        SELECT COUNT(*) INTO image_suggestion_points
        FROM image_suggestions
        WHERE user_id = user_record.id;
        
        total_points := total_points + image_suggestion_points;
        
        -- 4. Points for accepted image suggestions (50 points each, 100 for rare)
        accepted_suggestion_points := 0;
        
        FOR banknote_rarity IN
            SELECT COALESCE(db.rarity, '') as rarity
            FROM image_suggestions ims
            JOIN detailed_banknotes db ON ims.banknote_id = db.id
            WHERE ims.user_id = user_record.id 
            AND ims.status = 'approved'
        LOOP
            IF banknote_rarity IS NOT NULL AND banknote_rarity != '' THEN
                accepted_suggestion_points := accepted_suggestion_points + 100;
            ELSE
                accepted_suggestion_points := accepted_suggestion_points + 50;
            END IF;
        END LOOP;
        
        total_points := total_points + accepted_suggestion_points;
        
        -- 5. Points for forum posts (5 points each)
        SELECT COUNT(*) * 5 INTO forum_post_points
        FROM forum_posts
        WHERE author_id = user_record.id;
        
        total_points := total_points + forum_post_points;
        
        -- 6. Points for forum comments (1 point each)
        SELECT COUNT(*) INTO forum_comment_points
        FROM forum_comments
        WHERE author_id = user_record.id;
        
        total_points := total_points + forum_comment_points;
        
        -- 7. Points for being admin (500 points, one time)
        admin_promotion_points := 0;
        IF user_record.role LIKE '%Admin%' THEN
            admin_promotion_points := 500;
        END IF;
        
        total_points := total_points + admin_promotion_points;
        
        -- Calculate new rank
        new_rank := calculate_user_rank(total_points, user_record.role);
        
        -- Update user's points and rank
        UPDATE profiles 
        SET points = total_points, rank = new_rank
        WHERE id = user_record.id;
        
        -- Log progress (optional)
        RAISE NOTICE 'Updated user %: % points, rank: %', user_record.id, total_points, new_rank;
        
    END LOOP;
    
    RAISE NOTICE 'Completed recalculating points and ranks for all users';
END;
$$;

-- Execute the function to recalculate all users' points and ranks
SELECT recalculate_all_user_points_and_ranks();
