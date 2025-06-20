
-- Step 1: Drop all dependent views first
DROP VIEW IF EXISTS public.enhanced_detailed_banknotes;
DROP VIEW IF EXISTS public.sorted_banknotes;

-- Step 2: Modify detailed_banknotes table - change signatures_front and signatures_back to arrays
ALTER TABLE public.detailed_banknotes 
ALTER COLUMN signatures_front TYPE text[] USING CASE 
  WHEN signatures_front IS NULL THEN NULL 
  ELSE ARRAY[signatures_front] 
END;

ALTER TABLE public.detailed_banknotes 
ALTER COLUMN signatures_back TYPE text[] USING CASE 
  WHEN signatures_back IS NULL THEN NULL 
  ELSE ARRAY[signatures_back] 
END;

-- Step 3: Add the front_picture_watermarked column
ALTER TABLE public.detailed_banknotes 
ADD COLUMN front_picture_watermarked text;

-- Step 4: Drop the signature_pictures table (this will also remove related constraints)
DROP TABLE IF EXISTS public.signature_pictures CASCADE;

-- Step 5: Create signatures_front table
CREATE TABLE public.signatures_front (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  country_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 6: Create signatures_back table
CREATE TABLE public.signatures_back (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  country_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 7: Recreate the enhanced_detailed_banknotes view with new signature URL fields
CREATE OR REPLACE VIEW public.enhanced_detailed_banknotes AS
SELECT 
  db.*,
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
  
  -- Get authority name from country
  c.name as authority_name
FROM detailed_banknotes db
LEFT JOIN countries c ON c.name = db.country;

-- Step 8: Recreate the sorted_banknotes view (updating signatures_front and signatures_back to arrays)
CREATE OR REPLACE VIEW public.sorted_banknotes AS
SELECT 
  db.*,
  (parse_extended_pick_number(db.extended_pick_number)).base_num,
  (parse_extended_pick_number(db.extended_pick_number)).letter_type,
  (parse_extended_pick_number(db.extended_pick_number)).letter_value,
  (parse_extended_pick_number(db.extended_pick_number)).suffix_num,
  (parse_extended_pick_number(db.extended_pick_number)).trailing_text
FROM detailed_banknotes db
WHERE db.is_approved = TRUE
ORDER BY 
  (parse_extended_pick_number(db.extended_pick_number)).base_num ASC,
  (parse_extended_pick_number(db.extended_pick_number)).letter_type ASC,
  (parse_extended_pick_number(db.extended_pick_number)).letter_value ASC,
  (parse_extended_pick_number(db.extended_pick_number)).suffix_num ASC,
  (parse_extended_pick_number(db.extended_pick_number)).trailing_text ASC;
