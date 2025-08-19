-- Fix the enhanced_detailed_banknotes view to properly resolve image URLs from lookup tables
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
  
  -- Resolve signatures_front URLs from signatures_front table
  CASE 
    WHEN db.signatures_front IS NOT NULL AND array_length(db.signatures_front, 1) > 0 THEN
      ARRAY(
        SELECT sf.image_url 
        FROM signatures_front sf 
        JOIN countries c ON sf.country_id = c.id 
        WHERE c.name = db.country 
        AND sf.name = ANY(db.signatures_front)
      )
    ELSE NULL
  END as signatures_front_urls,
  
  -- Resolve signatures_back URLs from signatures_back table
  CASE 
    WHEN db.signatures_back IS NOT NULL AND array_length(db.signatures_back, 1) > 0 THEN
      ARRAY(
        SELECT sb.image_url 
        FROM signatures_back sb 
        JOIN countries c ON sb.country_id = c.id 
        WHERE c.name = db.country 
        AND sb.name = ANY(db.signatures_back)
      )
    ELSE NULL
  END as signatures_back_urls,
  
  -- Resolve seal picture URLs from seal_pictures table
  CASE 
    WHEN db.seal_pictures IS NOT NULL AND array_length(db.seal_pictures, 1) > 0 THEN
      ARRAY(
        SELECT sp.image_url 
        FROM seal_pictures sp 
        JOIN countries c ON sp.country_id = c.id 
        WHERE c.name = db.country 
        AND sp.name = ANY(db.seal_pictures)
      )
    ELSE NULL
  END as seal_picture_urls,
  
  -- Resolve tughra picture URL from tughra_pictures table
  CASE 
    WHEN db.tughra_picture IS NOT NULL AND db.tughra_picture != '' THEN
      (
        SELECT tp.image_url 
        FROM tughra_pictures tp 
        JOIN countries c ON tp.country_id = c.id 
        WHERE c.name = db.country 
        AND tp.name = db.tughra_picture
        LIMIT 1
      )
    ELSE NULL
  END as tughra_picture_url,
  
  -- Resolve watermark picture URL from watermark_pictures table
  CASE 
    WHEN db.watermark_picture IS NOT NULL AND db.watermark_picture != '' THEN
      (
        SELECT wp.image_url 
        FROM watermark_pictures wp 
        JOIN countries c ON wp.country_id = c.id 
        WHERE c.name = db.country 
        AND wp.name = db.watermark_picture
        LIMIT 1
      )
    ELSE NULL
  END as watermark_picture_url
FROM detailed_banknotes db; 