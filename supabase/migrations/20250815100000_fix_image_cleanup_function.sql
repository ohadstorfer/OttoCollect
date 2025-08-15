-- Fix the handle_old_image_cleanup function to use correct field names for each table
-- This will prevent the front_picture error while maintaining the image cleanup functionality

-- First, ensure the cleanup queue table exists
CREATE TABLE IF NOT EXISTS public.image_cleanup_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  banknote_id TEXT,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_image_cleanup_queue_processed ON public.image_cleanup_queue(processed);
CREATE INDEX IF NOT EXISTS idx_image_cleanup_queue_created_at ON public.image_cleanup_queue(created_at);

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

-- Create a function to process the cleanup queue
CREATE OR REPLACE FUNCTION public.process_image_cleanup_queue()
RETURNS void AS $$
DECLARE
  queue_item RECORD;
  is_used boolean;
BEGIN
  -- Process unprocessed items in the queue
  FOR queue_item IN 
    SELECT * FROM public.image_cleanup_queue 
    WHERE processed = FALSE 
    ORDER BY created_at ASC
    LIMIT 10  -- Process in batches
  LOOP
    BEGIN
      -- For collection items, check if the image is still used by the associated banknote
      IF queue_item.table_name = 'collection_items' AND queue_item.banknote_id IS NOT NULL THEN
        -- Check if the image is used by the banknote
        SELECT EXISTS(
          SELECT 1 FROM detailed_banknotes
          WHERE id = queue_item.banknote_id::uuid
          AND (
            front_picture = queue_item.image_url OR
            back_picture = queue_item.image_url OR
            front_picture_watermarked = queue_item.image_url OR
            back_picture_watermarked = queue_item.image_url OR
            front_picture_thumbnail = queue_item.image_url OR
            back_picture_thumbnail = queue_item.image_url OR
            watermark_picture = queue_item.image_url OR
            tughra_picture = queue_item.image_url OR
            queue_item.image_url = ANY(signature_pictures) OR
            queue_item.image_url = ANY(seal_pictures) OR
            queue_item.image_url = ANY(other_element_pictures)
          )
        ) INTO is_used;
        
        -- If image is still used, skip deletion
        IF is_used THEN
          UPDATE public.image_cleanup_queue 
          SET processed = TRUE, processed_at = now(), error_message = 'Image still in use by banknote'
          WHERE id = queue_item.id;
          CONTINUE;
        END IF;
      END IF;
      
      -- Mark as processed (actual deletion will be handled by client-side service)
      UPDATE public.image_cleanup_queue 
      SET processed = TRUE, processed_at = now()
      WHERE id = queue_item.id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log any errors
      UPDATE public.image_cleanup_queue 
      SET processed = TRUE, processed_at = now(), error_message = SQLERRM
      WHERE id = queue_item.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_old_image_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_image_cleanup_queue() TO authenticated;

-- Grant table permissions
GRANT ALL ON public.image_cleanup_queue TO authenticated; 