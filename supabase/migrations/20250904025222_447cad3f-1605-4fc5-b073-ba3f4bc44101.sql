-- Add authority name translations to enhanced_detailed_banknotes view
CREATE OR REPLACE VIEW public.enhanced_detailed_banknotes AS
SELECT
  db.*,
  
  -- Add the authority name translations only
  COALESCE((
    SELECT bso.name_ar
    FROM banknote_sort_options bso
    JOIN countries c ON c.id = bso.country_id
    WHERE c.name = db.country
      AND bso.field_name = 'sultan'::text
    LIMIT 1
  ), '') AS authority_name_ar,

  COALESCE((
    SELECT bso.name_tr
    FROM banknote_sort_options bso
    JOIN countries c ON c.id = bso.country_id
    WHERE c.name = db.country
      AND bso.field_name = 'sultan'::text
    LIMIT 1
  ), '') AS authority_name_tr,

  -- Keep existing fields
  COALESCE((
    SELECT bso.name
    FROM banknote_sort_options bso
    JOIN countries c ON c.id = bso.country_id
    WHERE c.name = db.country
      AND bso.field_name = 'sultan'::text
    LIMIT 1
  ), db.sultan_name) AS authority_name,

  (
    SELECT CASE
      WHEN COUNT(sf.image_url) FILTER (
        WHERE sf.image_url IS NOT NULL AND sf.image_url <> ''::text
      ) = 0 THEN NULL::text[]
      ELSE ARRAY_AGG(COALESCE(sf.image_url, ''::text) ORDER BY sig_name.pos)
    END
    FROM unnest(db.signatures_front) WITH ORDINALITY sig_name (name, pos)
    LEFT JOIN signatures_front sf ON sf.name = sig_name.name
    LEFT JOIN countries c ON sf.country_id = c.id AND c.name = db.country
  ) AS signatures_front_urls,

  (
    SELECT CASE
      WHEN COUNT(sb.image_url) FILTER (
        WHERE sb.image_url IS NOT NULL AND sb.image_url <> ''::text
      ) = 0 THEN NULL::text[]
      ELSE ARRAY_AGG(COALESCE(sb.image_url, ''::text) ORDER BY sig_name.pos)
    END
    FROM unnest(db.signatures_back) WITH ORDINALITY sig_name (name, pos)
    LEFT JOIN signatures_back sb ON sb.name = sig_name.name
    LEFT JOIN countries c ON sb.country_id = c.id AND c.name = db.country
  ) AS signatures_back_urls,

  (
    SELECT CASE
      WHEN COUNT(sp.image_url) FILTER (
        WHERE sp.image_url IS NOT NULL AND sp.image_url <> ''::text
      ) = 0 THEN NULL::text[]
      ELSE ARRAY_AGG(COALESCE(sp.image_url, ''::text) ORDER BY seal_name.pos)
    END
    FROM unnest(db.seal_pictures) WITH ORDINALITY seal_name (name, pos)
    LEFT JOIN seal_pictures sp ON sp.name = seal_name.name
    LEFT JOIN countries c ON sp.country_id = c.id AND c.name = db.country
  ) AS seal_picture_urls,

  CASE
    WHEN db.tughra_picture IS NOT NULL AND db.tughra_picture <> ''::text THEN (
      SELECT tp.image_url
      FROM tughra_pictures tp
      JOIN countries c ON tp.country_id = c.id
      WHERE c.name = db.country
        AND tp.name = db.tughra_picture
      LIMIT 1
    )
    ELSE NULL::text
  END AS tughra_picture_url,

  CASE
    WHEN db.watermark_picture IS NOT NULL AND db.watermark_picture <> ''::text THEN (
      SELECT wp.image_url
      FROM watermark_pictures wp
      JOIN countries c ON wp.country_id = c.id
      WHERE c.name = db.country
        AND wp.name = db.watermark_picture
      LIMIT 1
    )
    ELSE NULL::text
  END AS watermark_picture_url

FROM detailed_banknotes db;