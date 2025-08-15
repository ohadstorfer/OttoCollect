-- Force update the handle_old_image_cleanup function to fix the front_picture error
-- This migration will completely replace the problematic function

-- First, drop the old function completely
DROP FUNCTION IF EXISTS public.handle_old_image_cleanup() CASCADE;

-- Now create the fixed version
CREATE OR REPLACE FUNCTION public.handle_old_image_cleanup()
RETURNS TRIGGER AS $$
DECLARE
  -- Define field mappings for each table
  collection_items_fields text[] := ARRAY[
    'obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 
    'obverse_image_thumbnail', 'reverse_image_thumbnail'
  ];
  
  detailed_banknotes_fields text[] := ARRAY[
    'front_picture', 'back_picture', 'front_picture_watermarked', 'back_picture_watermarked',
    'front_picture_thumbnail', 'back_picture_thumbnail', 'watermark_picture', 'tughra_picture'
  ];
  
  profiles_fields text[] := ARRAY['avatar_url'];
  
  countries_fields text[] := ARRAY['image_url'];
  
  forum_fields text[] := ARRAY['image_url'];
  
  blog_fields text[] := ARRAY['image_url'];
  
  image_suggestions_fields text[] := ARRAY['image_url'];
  
  -- Common array fields that exist in multiple tables
  array_fields text[] := ARRAY['signature_pictures', 'seal_pictures', 'other_element_pictures', 'image_urls'];
  
  field_name text;
  old_value text;
  new_value text;
  old_array text[];
  new_array text[];
  removed_url text;
  current_fields text[];
BEGIN
  -- Only process UPDATE operations
  IF TG_OP != 'UPDATE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Select the appropriate fields based on the table being updated
  CASE TG_TABLE_NAME
    WHEN 'collection_items' THEN
      current_fields := collection_items_fields;
    WHEN 'detailed_banknotes' THEN
      current_fields := detailed_banknotes_fields;
    WHEN 'profiles' THEN
      current_fields := profiles_fields;
    WHEN 'countries' THEN
      current_fields := countries_fields;
    WHEN 'forum_posts', 'forum_announcements' THEN
      current_fields := forum_fields;
    WHEN 'blog_posts' THEN
      current_fields := blog_fields;
    WHEN 'image_suggestions' THEN
      current_fields := image_suggestions_fields;
    ELSE
      -- For unknown tables, use an empty array to avoid errors
      current_fields := ARRAY[]::text[];
  END CASE;

  -- Check single image fields that exist in the current table
  FOREACH field_name IN ARRAY current_fields
  LOOP
    -- Get old and new values using dynamic SQL
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING OLD INTO old_value;
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING NEW INTO new_value;
    
    -- Queue for deletion if old image exists and is different from new
    IF old_value IS NOT NULL AND old_value != '' AND old_value != new_value THEN
      -- Insert into cleanup queue
      INSERT INTO public.image_cleanup_queue (
        table_name, 
        record_id, 
        image_url, 
        banknote_id,
        created_at
      ) VALUES (
        TG_TABLE_NAME, 
        NEW.id::text, 
        old_value,
        CASE 
          WHEN TG_TABLE_NAME = 'collection_items' THEN NEW.banknote_id::text
          WHEN TG_TABLE_NAME = 'detailed_banknotes' THEN NEW.id::text
          ELSE NULL
        END,
        now()
      );
    END IF;
  END LOOP;

  -- Check array fields for removed images (only if they exist in the table)
  FOREACH field_name IN ARRAY array_fields
  LOOP
    -- Check if the field exists in the current table before trying to access it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = TG_TABLE_NAME 
      AND column_name = field_name
    ) THEN
      EXECUTE format('SELECT COALESCE($1.%I, ARRAY[]::text[])', field_name) USING OLD INTO old_array;
      EXECUTE format('SELECT COALESCE($1.%I, ARRAY[]::text[])', field_name) USING NEW INTO new_array;
      
      -- Find URLs that were removed
      IF old_array IS NOT NULL THEN
        FOREACH removed_url IN ARRAY old_array
        LOOP
          IF removed_url IS NOT NULL AND removed_url != '' AND NOT (removed_url = ANY(new_array)) THEN
            INSERT INTO public.image_cleanup_queue (
              table_name, 
              record_id, 
              image_url, 
              banknote_id,
              created_at
            ) VALUES (
              TG_TABLE_NAME, 
              NEW.id::text, 
              removed_url,
              CASE 
                WHEN TG_TABLE_NAME = 'collection_items' THEN NEW.banknote_id::text
                WHEN TG_TABLE_NAME = 'detailed_banknotes' THEN NEW.id::text
                ELSE NULL
              END,
              now()
            );
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_old_image_cleanup() TO authenticated;

-- Verify the function was updated
DO $$
BEGIN
  RAISE NOTICE '=== FUNCTION UPDATE VERIFICATION ===';
  RAISE NOTICE 'Function handle_old_image_cleanup has been updated successfully';
  
  -- Check if the function exists and has the correct signature
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'handle_old_image_cleanup'
  ) THEN
    RAISE NOTICE 'Function exists and is accessible';
  ELSE
    RAISE NOTICE 'WARNING: Function does not exist!';
  END IF;
END $$; 