-- Create function to handle automatic image deletion
CREATE OR REPLACE FUNCTION public.handle_image_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_urls text[];
  new_urls text[];
  old_url text;
  payload jsonb;
BEGIN
  -- Handle different table structures
  CASE TG_TABLE_NAME
    WHEN 'collection_items' THEN
      -- Collection items have individual image columns
      old_urls := ARRAY[
        OLD.obverse_image,
        OLD.reverse_image,
        OLD.obverse_image_watermarked,
        OLD.reverse_image_watermarked,
        OLD.obverse_image_thumbnail,
        OLD.reverse_image_thumbnail
      ];
      new_urls := ARRAY[
        NEW.obverse_image,
        NEW.reverse_image,
        NEW.obverse_image_watermarked,
        NEW.reverse_image_watermarked,
        NEW.obverse_image_thumbnail,
        NEW.reverse_image_thumbnail
      ];
    
    WHEN 'detailed_banknotes' THEN
      -- Detailed banknotes have individual columns and arrays
      old_urls := ARRAY[
        OLD.front_picture,
        OLD.back_picture,
        OLD.front_picture_watermarked,
        OLD.back_picture_watermarked,
        OLD.front_picture_thumbnail,
        OLD.back_picture_thumbnail,
        OLD.watermark_picture,
        OLD.tughra_picture
      ] || COALESCE(OLD.signature_pictures, ARRAY[]::text[]) 
        || COALESCE(OLD.seal_pictures, ARRAY[]::text[]) 
        || COALESCE(OLD.other_element_pictures, ARRAY[]::text[]);
      
      new_urls := ARRAY[
        NEW.front_picture,
        NEW.back_picture,
        NEW.front_picture_watermarked,
        NEW.back_picture_watermarked,
        NEW.front_picture_thumbnail,
        NEW.back_picture_thumbnail,
        NEW.watermark_picture,
        NEW.tughra_picture
      ] || COALESCE(NEW.signature_pictures, ARRAY[]::text[]) 
        || COALESCE(NEW.seal_pictures, ARRAY[]::text[]) 
        || COALESCE(NEW.other_element_pictures, ARRAY[]::text[]);
    
    WHEN 'forum_announcements' THEN
      old_urls := COALESCE(OLD.image_urls, ARRAY[]::text[]);
      new_urls := COALESCE(NEW.image_urls, ARRAY[]::text[]);
    
    WHEN 'forum_posts' THEN
      old_urls := COALESCE(OLD.image_urls, ARRAY[]::text[]);
      new_urls := COALESCE(NEW.image_urls, ARRAY[]::text[]);
    
    WHEN 'image_suggestions' THEN
      old_urls := ARRAY[
        OLD.obverse_image,
        OLD.reverse_image,
        OLD.obverse_image_watermarked,
        OLD.reverse_image_watermarked,
        OLD.obverse_image_thumbnail,
        OLD.reverse_image_thumbnail
      ];
      new_urls := ARRAY[
        NEW.obverse_image,
        NEW.reverse_image,
        NEW.obverse_image_watermarked,
        NEW.reverse_image_watermarked,
        NEW.obverse_image_thumbnail,
        NEW.reverse_image_thumbnail
      ];
    
    WHEN 'profiles' THEN
      old_urls := ARRAY[OLD.avatar_url];
      new_urls := ARRAY[NEW.avatar_url];
    
    ELSE
      -- Skip unknown tables
      RETURN NEW;
  END CASE;

  -- Find URLs that were removed (in old but not in new)
  FOR old_url IN SELECT unnest(old_urls)
  LOOP
    IF old_url IS NOT NULL AND old_url != '' AND NOT (old_url = ANY(new_urls)) THEN
      -- Prepare payload for edge function
      payload := jsonb_build_object(
        'imageUrl', old_url,
        'tableName', TG_TABLE_NAME,
        'recordId', NEW.id::text
      );
      
      -- Add banknote_id for collection_items
      IF TG_TABLE_NAME = 'collection_items' THEN
        payload := payload || jsonb_build_object('banknoteId', NEW.banknote_id::text);
      END IF;
      
      -- Call edge function to delete the image
      PERFORM net.http_post(
        url := format('%s/functions/v1/delete-old-image', current_setting('app.supabase_url')),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', format('Bearer %s', current_setting('app.supabase_anon_key'))
        ),
        body := payload
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers for all tables with image columns
CREATE TRIGGER trigger_collection_items_image_deletion
  AFTER UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();

CREATE TRIGGER trigger_detailed_banknotes_image_deletion
  AFTER UPDATE ON detailed_banknotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();

CREATE TRIGGER trigger_forum_announcements_image_deletion
  AFTER UPDATE ON forum_announcements
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();

CREATE TRIGGER trigger_forum_posts_image_deletion
  AFTER UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();

CREATE TRIGGER trigger_image_suggestions_image_deletion
  AFTER UPDATE ON image_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();

CREATE TRIGGER trigger_profiles_image_deletion
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_image_deletion();