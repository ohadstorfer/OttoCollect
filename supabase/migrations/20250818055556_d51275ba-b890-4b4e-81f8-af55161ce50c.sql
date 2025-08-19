-- Fix the enhanced_detailed_banknotes view to properly resolve authority_name from sultan field
DROP VIEW IF EXISTS public.enhanced_detailed_banknotes;

CREATE VIEW public.enhanced_detailed_banknotes AS
SELECT 
  db.*,
  -- Fix authority_name to get the sultan name from banknote_sort_options instead of country name
  COALESCE(
    (SELECT bso.name 
     FROM banknote_sort_options bso 
     JOIN countries c ON c.id = bso.country_id 
     WHERE c.name = db.country 
     AND bso.field_name = 'sultan' 
     LIMIT 1),
    db.sultan_name
  ) as authority_name,
  -- Keep all existing array transformations unchanged
  CASE 
    WHEN db.signatures_front IS NOT NULL THEN
      ARRAY(
        SELECT CASE 
          WHEN elem ~ '^https?://' THEN elem
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || elem
        END
        FROM unnest(db.signatures_front) AS elem
      )
    ELSE NULL
  END as signatures_front_urls,
  CASE 
    WHEN db.signatures_back IS NOT NULL THEN
      ARRAY(
        SELECT CASE 
          WHEN elem ~ '^https?://' THEN elem
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || elem
        END
        FROM unnest(db.signatures_back) AS elem
      )
    ELSE NULL
  END as signatures_back_urls,
  CASE 
    WHEN db.seal_pictures IS NOT NULL THEN
      ARRAY(
        SELECT CASE 
          WHEN elem ~ '^https?://' THEN elem
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || elem
        END
        FROM unnest(db.seal_pictures) AS elem
      )
    ELSE NULL
  END as seal_picture_urls,
  CASE 
    WHEN db.tughra_picture IS NOT NULL AND db.tughra_picture != '' THEN
      CASE 
        WHEN db.tughra_picture ~ '^https?://' THEN db.tughra_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || db.tughra_picture
      END
    ELSE NULL
  END as tughra_picture_url,
  CASE 
    WHEN db.watermark_picture IS NOT NULL AND db.watermark_picture != '' THEN
      CASE 
        WHEN db.watermark_picture ~ '^https?://' THEN db.watermark_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || db.watermark_picture
      END
    ELSE NULL
  END as watermark_picture_url
FROM detailed_banknotes db;