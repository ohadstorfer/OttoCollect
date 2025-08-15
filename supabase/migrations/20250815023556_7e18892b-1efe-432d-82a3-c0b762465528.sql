-- Create a simple database function to handle image deletion without net extension
-- This function will be called by database triggers when images are updated

CREATE OR REPLACE FUNCTION public.handle_old_image_cleanup()
RETURNS TRIGGER AS $$
DECLARE
  image_fields text[] := ARRAY[
    'obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 
    'obverse_image_thumbnail', 'reverse_image_thumbnail', 'front_picture', 'back_picture',
    'front_picture_watermarked', 'back_picture_watermarked', 'front_picture_thumbnail', 
    'back_picture_thumbnail', 'watermark_picture', 'tughra_picture', 'avatar_url', 'image_url'
  ];
  array_fields text[] := ARRAY['signature_pictures', 'seal_pictures', 'other_element_pictures', 'image_urls'];
  field_name text;
  old_value text;
  new_value text;
  old_array text[];
  new_array text[];
  removed_url text;
BEGIN
  -- Only process UPDATE operations
  IF TG_OP != 'UPDATE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check single image fields
  FOREACH field_name IN ARRAY image_fields
  LOOP
    -- Get old and new values using dynamic SQL since we can't use record[field] syntax
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING OLD INTO old_value;
    EXECUTE format('SELECT COALESCE($1.%I, '''')', field_name) USING NEW INTO new_value;
    
    -- Queue for deletion if old image exists and is different from new
    IF old_value IS NOT NULL AND old_value != '' AND old_value != new_value THEN
      -- Insert into a cleanup queue table instead of trying to delete immediately
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
          ELSE NULL
        END,
        now()
      );
    END IF;
  END LOOP;

  -- Check array fields for removed images
  FOREACH field_name IN ARRAY array_fields
  LOOP
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
              ELSE NULL
            END,
            now()
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the cleanup queue table
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

-- Enable RLS on the cleanup queue table
ALTER TABLE public.image_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for the cleanup queue (only system can access)
CREATE POLICY "System only access" ON public.image_cleanup_queue
  FOR ALL USING (false);

-- Create triggers for all image tables
CREATE TRIGGER trigger_collection_items_image_cleanup
  BEFORE UPDATE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_detailed_banknotes_image_cleanup
  BEFORE UPDATE ON public.detailed_banknotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_profiles_image_cleanup
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_countries_image_cleanup
  BEFORE UPDATE ON public.countries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_forum_posts_image_cleanup
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_forum_announcements_image_cleanup
  BEFORE UPDATE ON public.forum_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_blog_posts_image_cleanup
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();

CREATE TRIGGER trigger_image_suggestions_image_cleanup
  BEFORE UPDATE ON public.image_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_old_image_cleanup();