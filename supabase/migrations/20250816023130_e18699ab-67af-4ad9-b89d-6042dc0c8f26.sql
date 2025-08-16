-- Function to create complete user filter preferences for a user and country
CREATE OR REPLACE FUNCTION create_complete_user_filter_preferences(
  user_id_param UUID,
  country_id_param UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  all_categories UUID[];
  all_types UUID[];
  all_sort_options UUID[];
BEGIN
  -- Get all category IDs for this country
  SELECT array_agg(id) INTO all_categories
  FROM banknote_category_definitions
  WHERE country_id = country_id_param;
  
  -- Get all type IDs for this country
  SELECT array_agg(id) INTO all_types
  FROM banknote_type_definitions
  WHERE country_id = country_id_param;
  
  -- Get all sort option IDs for this country
  SELECT array_agg(id) INTO all_sort_options
  FROM banknote_sort_options
  WHERE country_id = country_id_param;
  
  -- Insert or update user filter preferences with all options selected
  INSERT INTO user_filter_preferences (
    user_id,
    country_id,
    selected_categories,
    selected_types,
    selected_sort_options,
    group_mode,
    view_mode
  ) VALUES (
    user_id_param,
    country_id_param,
    COALESCE(all_categories, ARRAY[]::UUID[]),
    COALESCE(all_types, ARRAY[]::UUID[]),
    COALESCE(all_sort_options, ARRAY[]::UUID[]),
    true,
    'grid'
  )
  ON CONFLICT (user_id, country_id) 
  DO UPDATE SET
    selected_categories = COALESCE(all_categories, ARRAY[]::UUID[]),
    selected_types = COALESCE(all_types, ARRAY[]::UUID[]),
    selected_sort_options = COALESCE(all_sort_options, ARRAY[]::UUID[]),
    updated_at = now();
END;
$$;

-- Function to create filter preferences for all countries for a specific user
CREATE OR REPLACE FUNCTION create_user_filter_preferences_for_all_countries(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  country_record RECORD;
BEGIN
  -- Loop through all countries and create preferences
  FOR country_record IN SELECT id FROM countries ORDER BY display_order
  LOOP
    PERFORM create_complete_user_filter_preferences(user_id_param, country_record.id);
  END LOOP;
END;
$$;

-- Function to backfill missing user filter preferences for all existing users
CREATE OR REPLACE FUNCTION backfill_user_filter_preferences()
RETURNS TABLE(users_processed INTEGER, preferences_created INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  country_record RECORD;
  users_count INTEGER := 0;
  prefs_count INTEGER := 0;
  existing_prefs INTEGER;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT id FROM profiles
  LOOP
    users_count := users_count + 1;
    
    -- Loop through all countries
    FOR country_record IN SELECT id FROM countries ORDER BY display_order
    LOOP
      -- Check if user already has preferences for this country
      SELECT COUNT(*) INTO existing_prefs
      FROM user_filter_preferences
      WHERE user_id = user_record.id AND country_id = country_record.id;
      
      -- If no preferences exist, create them
      IF existing_prefs = 0 THEN
        PERFORM create_complete_user_filter_preferences(user_record.id, country_record.id);
        prefs_count := prefs_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT users_count, prefs_count;
END;
$$;

-- Trigger function to create filter preferences when a new user is created
CREATE OR REPLACE FUNCTION handle_new_user_filter_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create filter preferences for all countries for the new user
  PERFORM create_user_filter_preferences_for_all_countries(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_user_created_filter_preferences ON profiles;
CREATE TRIGGER on_user_created_filter_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_filter_preferences();

-- Trigger function to create filter preferences when a new country is added
CREATE OR REPLACE FUNCTION handle_new_country_filter_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Create filter preferences for all users for the new country
  FOR user_record IN SELECT id FROM profiles
  LOOP
    PERFORM create_complete_user_filter_preferences(user_record.id, NEW.id);
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create trigger for new country creation
DROP TRIGGER IF EXISTS on_country_created_filter_preferences ON countries;
CREATE TRIGGER on_country_created_filter_preferences
  AFTER INSERT ON countries
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_country_filter_preferences();