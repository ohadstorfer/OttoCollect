-- Fix the handle_old_image_cleanup function with better debugging
-- This will help us see exactly what's happening when the trigger fires

-- Drop and recreate the function with enhanced debugging
DROP FUNCTION IF EXISTS public.handle_old_image_cleanup() CASCADE;

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
  is_image_still_used boolean;
BEGIN
  -- Enhanced debugging - log that the function was called
  RAISE NOTICE '=== TRIGGER FIRED ===';
  RAISE NOTICE 'Table: %, Operation: %, Record ID: %', TG_TABLE_NAME, TG_OP, NEW.id;
  
  -- Only process UPDATE operations
  IF TG_OP != 'UPDATE' THEN
    RAISE NOTICE 'Not an UPDATE operation, skipping';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Select the appropriate fields based on the table being updated
  CASE TG_TABLE_NAME
    WHEN 'collection_items' THEN
      current_fields := collection_items_fields;
      RAISE NOTICE 'Processing collection_items with fields: %', current_fields;
    WHEN 'detailed_banknotes' THEN
      current_fields := detailed_banknotes_fields;
      RAISE NOTICE 'Processing detailed_banknotes with fields: %', current_fields;
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
      current_fields := ARRAY[]::text[];
      RAISE NOTICE 'Unknown table: %, using empty fields array', TG_TABLE_NAME;
  END CASE;

  -- Check single image fields that exist in the current table
  FOREACH field_name IN ARRAY current_fields
  LOOP
    -- Get old and new values using dynamic SQL
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING OLD INTO old_value;
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING NEW INTO new_value;
    
    RAISE NOTICE 'Field: %, Old: %, New: %', field_name, old_value, new_value;
    
    -- Queue for deletion if old image exists and is different from new
    IF old_value IS NOT NULL AND old_value != '' AND old_value != new_value THEN
      RAISE NOTICE '*** IMAGE CHANGE DETECTED ***: % -> % (field: %)', old_value, new_value, field_name;
      
      -- For collection_items, check if the image is still used by the associated banknote
      IF TG_TABLE_NAME = 'collection_items' AND NEW.banknote_id IS NOT NULL THEN
        RAISE NOTICE 'Checking if image is still used by banknote: %', NEW.banknote_id;
        
        -- Check if the old image is still used by the detailed_banknotes entry
        SELECT EXISTS(
          SELECT 1 FROM detailed_banknotes
          WHERE id = NEW.banknote_id
          AND (
            front_picture = old_value OR
            back_picture = old_value OR
            front_picture_watermarked = old_value OR
            back_picture_watermarked = old_value OR
            front_picture_thumbnail = old_value OR
            back_picture_thumbnail = old_value OR
            watermark_picture = old_value OR
            tughra_picture = old_value OR
            old_value = ANY(signature_pictures) OR
            old_value = ANY(seal_pictures) OR
            old_value = ANY(other_element_pictures)
          )
        ) INTO is_image_still_used;
        
        RAISE NOTICE 'Image still used by banknote: %', is_image_still_used;
        
        -- Only queue for deletion if the image is NOT still used by the banknote
        IF NOT is_image_still_used THEN
          RAISE NOTICE '*** QUEUEING COLLECTION ITEM IMAGE FOR DELETION ***: %', old_value;
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
            NEW.banknote_id::text,
            now()
          );
          RAISE NOTICE 'Successfully queued image for deletion';
        ELSE
          RAISE NOTICE 'Image still in use by banknote, skipping deletion: %', old_value;
        END IF;
      ELSE
        -- For all other tables, queue for deletion immediately
        RAISE NOTICE '*** QUEUEING IMAGE FOR DELETION ***: %', old_value;
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
            WHEN TG_TABLE_NAME = 'detailed_banknotes' THEN NEW.id::text
            ELSE NULL
          END,
          now()
        );
        RAISE NOTICE 'Successfully queued image for deletion';
      END IF;
    ELSE
      RAISE NOTICE 'No change detected for field: %', field_name;
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
      RAISE NOTICE 'Processing array field: %', field_name;
      
      EXECUTE format('SELECT COALESCE($1.%I, ARRAY[]::text[])', field_name) USING OLD INTO old_array;
      EXECUTE format('SELECT COALESCE($1.%I, ARRAY[]::text[])', field_name) USING NEW INTO new_array;
      
      RAISE NOTICE 'Array field: %, Old: %, New: %', field_name, old_array, new_array;
      
      -- Find URLs that were removed
      IF old_array IS NOT NULL THEN
        FOREACH removed_url IN ARRAY old_array
        LOOP
          IF removed_url IS NOT NULL AND removed_url != '' AND NOT (removed_url = ANY(new_array)) THEN
            RAISE NOTICE '*** ARRAY IMAGE REMOVED ***: %', removed_url;
            
            -- For collection_items, check if the image is still used by the associated banknote
            IF TG_TABLE_NAME = 'collection_items' AND NEW.banknote_id IS NOT NULL THEN
              -- Check if the old image is still used by the detailed_banknotes entry
              SELECT EXISTS(
                SELECT 1 FROM detailed_banknotes
                WHERE id = NEW.banknote_id
                AND (
                  front_picture = removed_url OR
                  back_picture = removed_url OR
                  front_picture_watermarked = removed_url OR
                  back_picture_watermarked = removed_url OR
                  front_picture_thumbnail = removed_url OR
                  back_picture_thumbnail = removed_url OR
                  watermark_picture = removed_url OR
                  tughra_picture = removed_url OR
                  removed_url = ANY(signature_pictures) OR
                  removed_url = ANY(seal_pictures) OR
                  removed_url = ANY(other_element_pictures)
                )
              ) INTO is_image_still_used;
              
              -- Only queue for deletion if the image is NOT still used by the banknote
              IF NOT is_image_still_used THEN
                RAISE NOTICE '*** QUEUEING ARRAY IMAGE FOR DELETION ***: %', removed_url;
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
                  NEW.banknote_id::text,
                  now()
                );
              ELSE
                RAISE NOTICE 'Array image still in use by banknote, skipping deletion: %', removed_url;
              END IF;
            ELSE
              -- For all other tables, queue for deletion immediately
              RAISE NOTICE '*** QUEUEING ARRAY IMAGE FOR DELETION ***: %', removed_url;
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
                  WHEN TG_TABLE_NAME = 'detailed_banknotes' THEN NEW.id::text
                  ELSE NULL
                END,
                now()
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    ELSE
      RAISE NOTICE 'Array field % does not exist in table %', field_name, TG_TABLE_NAME;
    END IF;
  END LOOP;

  RAISE NOTICE '=== TRIGGER COMPLETED ===';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_old_image_cleanup() TO authenticated;

-- Verify the function was updated
DO $$
BEGIN
  RAISE NOTICE '=== FUNCTION UPDATE VERIFICATION ===';
  RAISE NOTICE 'Function handle_old_image_cleanup has been updated with enhanced debugging';
END $$; 