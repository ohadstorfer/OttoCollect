-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.enhanced_detailed_banknotes;

-- Recreate the enhanced_detailed_banknotes view with all required fields
CREATE OR REPLACE VIEW public.enhanced_detailed_banknotes AS
SELECT 
  db.*,  -- Include all fields from detailed_banknotes
  
  -- Resolve signatures_front URLs
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
  END AS signatures_front_urls,
  
  -- Resolve signatures_back URLs
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
  END AS signatures_back_urls,
  
  -- Resolve seal picture URLs
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
  END AS seal_picture_urls,
  
  -- Resolve watermark picture URL
  CASE 
    WHEN db.watermark_picture IS NOT NULL THEN
      (
        SELECT wp.image_url 
        FROM watermark_pictures wp 
        JOIN countries c ON wp.country_id = c.id 
        WHERE c.name = db.country 
        AND wp.name = db.watermark_picture
        LIMIT 1
      )
    ELSE NULL
  END AS watermark_picture_url,
  
  -- Resolve tughra picture URL
  CASE 
    WHEN db.tughra_picture IS NOT NULL THEN
      (
        SELECT tp.image_url 
        FROM tughra_pictures tp 
        JOIN countries c ON tp.country_id = c.id 
        WHERE c.name = db.country 
        AND tp.name = db.tughra_picture
        LIMIT 1
      )
    ELSE NULL
  END AS tughra_picture_url,
  
  -- Get authority name from country
  c.name as authority_name
FROM detailed_banknotes db
LEFT JOIN countries c ON c.name = db.country; 