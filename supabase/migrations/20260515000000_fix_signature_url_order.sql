-- Fix: preserve array order when resolving signature/seal image URLs.
-- Previously the view used `WHERE sf.name = ANY(db.signatures_front)`, which
-- returns rows in physical (PK) order rather than the order of the source array.
-- This made the front signature thumbnails on the catalog render in the wrong
-- order whenever the array order differed from the signatures_front table's
-- internal order. We now use `unnest(...) WITH ORDINALITY` + ORDER BY to
-- preserve the original array order on signatures_front_urls, signatures_back_urls,
-- and seal_picture_urls. All other columns are unchanged from the previous
-- definition in 20260330_add_turk_catalog_label_to_countries.sql.

DROP VIEW IF EXISTS public.enhanced_banknotes_with_translations;
DROP VIEW IF EXISTS public.enhanced_detailed_banknotes;

CREATE VIEW public.enhanced_detailed_banknotes AS
SELECT
  db.*,
  COALESCE(
    (SELECT bso.name
     FROM banknote_sort_options bso
     JOIN countries c ON c.id = bso.country_id
     WHERE c.name = db.country
     AND bso.field_name = 'sultan'
     LIMIT 1),
    db.sultan_name
  ) as authority_name,

  COALESCE((
    SELECT bso.name_ar
    FROM banknote_sort_options bso
    JOIN countries c ON c.id = bso.country_id
    WHERE c.name = db.country
      AND bso.field_name = 'sultan'
    LIMIT 1
  ), '') AS authority_name_ar,

  COALESCE((
    SELECT bso.name_tr
    FROM banknote_sort_options bso
    JOIN countries c ON c.id = bso.country_id
    WHERE c.name = db.country
      AND bso.field_name = 'sultan'
    LIMIT 1
  ), '') AS authority_name_tr,

  (SELECT c.turk_catalog_label FROM countries c WHERE c.name = db.country LIMIT 1) as turk_catalog_label,
  (SELECT c.turk_catalog_label_ar FROM countries c WHERE c.name = db.country LIMIT 1) as turk_catalog_label_ar,
  (SELECT c.turk_catalog_label_tr FROM countries c WHERE c.name = db.country LIMIT 1) as turk_catalog_label_tr,

  -- Resolve signatures_front URLs preserving array order
  CASE
    WHEN db.signatures_front IS NOT NULL AND array_length(db.signatures_front, 1) > 0 THEN
      ARRAY(
        SELECT sf.image_url
        FROM unnest(db.signatures_front) WITH ORDINALITY AS sig(name, ord)
        JOIN signatures_front sf ON sf.name = sig.name
        JOIN countries c ON c.id = sf.country_id AND c.name = db.country
        ORDER BY sig.ord
      )
    ELSE NULL
  END as signatures_front_urls,

  -- Resolve signatures_back URLs preserving array order
  CASE
    WHEN db.signatures_back IS NOT NULL AND array_length(db.signatures_back, 1) > 0 THEN
      ARRAY(
        SELECT sb.image_url
        FROM unnest(db.signatures_back) WITH ORDINALITY AS sig(name, ord)
        JOIN signatures_back sb ON sb.name = sig.name
        JOIN countries c ON c.id = sb.country_id AND c.name = db.country
        ORDER BY sig.ord
      )
    ELSE NULL
  END as signatures_back_urls,

  -- Resolve seal picture URLs preserving array order
  CASE
    WHEN db.seal_pictures IS NOT NULL AND array_length(db.seal_pictures, 1) > 0 THEN
      ARRAY(
        SELECT sp.image_url
        FROM unnest(db.seal_pictures) WITH ORDINALITY AS s(name, ord)
        JOIN seal_pictures sp ON sp.name = s.name
        JOIN countries c ON c.id = sp.country_id AND c.name = db.country
        ORDER BY s.ord
      )
    ELSE NULL
  END as seal_picture_urls,

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

CREATE VIEW public.enhanced_banknotes_with_translations AS
SELECT
  db.id,
  db.country,
  db.extended_pick_number,
  db.pick_number,
  db.turk_catalog_number,
  db.face_value,
  db.islamic_year,
  db.gregorian_year,
  db.signatures_front,
  db.signatures_back,
  db.signature_pictures,
  db.seal_names,
  db.seal_pictures,
  db.watermark_picture,
  db.other_element_pictures,
  db.front_picture,
  db.back_picture,
  db.front_picture_watermarked,
  db.back_picture_watermarked,
  db.front_picture_thumbnail,
  db.back_picture_thumbnail,
  db.sultan_name,
  db.tughra_picture,
  db.printer,
  db.type,
  db.category,
  db.rarity,
  db.security_element,
  db.colors,
  db.serial_numbering,
  db.banknote_description,
  db.historical_description,
  db.dimensions,
  db.is_approved,
  db.is_pending,
  db.created_at,
  db.updated_at,
  db.authority_name,
  db.authority_name_ar,
  db.authority_name_tr,

  db.turk_catalog_label,
  db.turk_catalog_label_ar,
  db.turk_catalog_label_tr,

  db.signatures_front_urls,
  db.signatures_back_urls,
  db.seal_picture_urls,
  db.watermark_picture_url,
  db.tughra_picture_url,

  bt.country_ar,
  bt.country_tr,
  bt.face_value_ar,
  bt.face_value_tr,
  bt.islamic_year_ar,
  bt.islamic_year_tr,
  bt.signatures_front_ar,
  bt.signatures_front_tr,
  bt.signatures_back_ar,
  bt.signatures_back_tr,
  bt.seal_names_ar,
  bt.seal_names_tr,
  bt.sultan_name_ar,
  bt.sultan_name_tr,
  bt.printer_ar,
  bt.printer_tr,
  bt.type_ar,
  bt.type_tr,
  bt.category_ar,
  bt.category_tr,
  bt.security_element_ar,
  bt.security_element_tr,
  bt.colors_ar,
  bt.colors_tr,
  bt.banknote_description_ar,
  bt.banknote_description_tr,
  bt.historical_description_ar,
  bt.historical_description_tr,
  bt.dimensions_ar,
  bt.dimensions_tr,

  COALESCE(bt.country_ar, db.country) as country_translated,
  COALESCE(bt.face_value_ar, db.face_value) as face_value_translated,
  COALESCE(bt.islamic_year_ar, db.islamic_year) as islamic_year_translated,
  COALESCE(bt.signatures_front_ar, db.signatures_front) as signatures_front_translated,
  COALESCE(bt.signatures_back_ar, db.signatures_back) as signatures_back_translated,
  COALESCE(bt.seal_names_ar, db.seal_names) as seal_names_translated,
  COALESCE(bt.sultan_name_ar, db.sultan_name) as sultan_name_translated,
  COALESCE(bt.printer_ar, db.printer) as printer_translated,
  COALESCE(bt.type_ar, db.type) as type_translated,
  COALESCE(bt.category_ar, db.category) as category_translated,
  COALESCE(bt.security_element_ar, db.security_element) as security_element_translated,
  COALESCE(bt.colors_ar, db.colors) as colors_translated,
  COALESCE(bt.banknote_description_ar, db.banknote_description) as banknote_description_translated,
  COALESCE(bt.historical_description_ar, db.historical_description) as historical_description_translated,
  COALESCE(bt.dimensions_ar, db.dimensions) as dimensions_translated

FROM public.enhanced_detailed_banknotes db
LEFT JOIN public.banknotes_translation bt ON db.id = bt.banknote_id AND bt.is_unlisted = false;
