-- Drop and recreate the backfill function with correct return type
DROP FUNCTION IF EXISTS backfill_user_filter_preferences();

CREATE OR REPLACE FUNCTION backfill_user_filter_preferences()
RETURNS TABLE(users_processed INTEGER, preferences_upserted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  country_record RECORD;
  users_count INTEGER := 0;
  upserts_count INTEGER := 0;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT id FROM profiles
  LOOP
    users_count := users_count + 1;
    
    -- Loop through all countries
    FOR country_record IN SELECT id FROM countries ORDER BY display_order
    LOOP
      -- Always call helper to upsert full preferences (covers missing rows and missing options)
      PERFORM create_complete_user_filter_preferences(user_record.id, country_record.id);
      upserts_count := upserts_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT users_count, upserts_count;
END;
$$;

-- Run the backfill now so existing users are covered immediately
DO $$
BEGIN
  PERFORM backfill_user_filter_preferences();
END;
$$;