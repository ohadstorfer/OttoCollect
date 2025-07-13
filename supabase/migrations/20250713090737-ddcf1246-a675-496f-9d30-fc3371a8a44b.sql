
-- Create a function to delete image suggestions for a specific user and country
CREATE OR REPLACE FUNCTION delete_user_image_suggestions_by_country(
    p_user_id UUID,
    p_country_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete image suggestions for the specified user where the banknote belongs to the specified country
    DELETE FROM public.image_suggestions 
    WHERE user_id = p_user_id 
    AND banknote_id IN (
        SELECT id 
        FROM public.detailed_banknotes 
        WHERE country = p_country_name
    );
    
    -- Get the count of deleted rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % image suggestions for user % and country %', deleted_count, p_user_id, p_country_name;
    
    RETURN deleted_count;
END;
$$;

-- Execute the function to delete image suggestions for the specified user and Ottoman Empire
SELECT delete_user_image_suggestions_by_country(
    'e0ceafe0-0a02-42a9-a72f-6232af4b2579'::UUID,
    'Ottoman Empire'
);

-- Clean up the function after use
DROP FUNCTION IF EXISTS delete_user_image_suggestions_by_country(UUID, TEXT);
