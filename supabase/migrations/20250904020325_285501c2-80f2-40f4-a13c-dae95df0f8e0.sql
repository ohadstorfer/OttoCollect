-- Update banknotes_with_translations view to include authority name translations
CREATE OR REPLACE VIEW banknotes_with_translations AS 
SELECT 
  db.*,
  -- Authority name translations from banknote_sort_options (sultan)
  sultan_opts.name_ar as authority_name_ar,
  sultan_opts.name_tr as authority_name_tr,
  -- Translation fields from banknotes_translation table
  bt.name_ar,
  bt.name_tr,
  bt.dimensions_ar,
  bt.dimensions_tr,
  bt.historical_description_ar,
  bt.historical_description_tr,
  bt.banknote_description_ar,
  bt.banknote_description_tr,
  bt.colors_ar,
  bt.colors_tr,
  bt.security_element_ar,
  bt.security_element_tr,
  bt.category_ar,
  bt.category_tr,
  bt.type_ar,
  bt.type_tr,
  bt.printer_ar,
  bt.printer_tr,
  bt.sultan_name_ar,
  bt.sultan_name_tr,
  bt.seal_names_ar,
  bt.seal_names_tr,
  bt.signatures_front_ar,
  bt.signatures_front_tr,
  bt.signatures_back_ar,
  bt.signatures_back_tr,
  bt.islamic_year_ar,
  bt.islamic_year_tr,
  bt.face_value_ar,
  bt.face_value_tr,
  bt.country_ar,
  bt.country_tr,
  bt.other_element_pictures_ar,
  bt.other_element_pictures_tr,
  -- Computed translated fields based on current language context
  COALESCE(bt.country_ar, bt.country_tr, db.country) as country_translated,
  COALESCE(bt.face_value_ar, bt.face_value_tr, db.face_value) as face_value_translated,
  COALESCE(bt.islamic_year_ar, bt.islamic_year_tr, db.islamic_year) as islamic_year_translated,
  COALESCE(bt.signatures_front_ar, bt.signatures_front_tr, db.signatures_front) as signatures_front_translated,
  COALESCE(bt.signatures_back_ar, bt.signatures_back_tr, db.signatures_back) as signatures_back_translated,
  COALESCE(bt.seal_names_ar, bt.seal_names_tr, db.seal_names) as seal_names_translated,
  COALESCE(bt.sultan_name_ar, bt.sultan_name_tr, db.sultan_name) as sultan_name_translated,
  COALESCE(bt.printer_ar, bt.printer_tr, db.printer) as printer_translated,
  COALESCE(bt.type_ar, bt.type_tr, db.type) as type_translated,
  COALESCE(bt.category_ar, bt.category_tr, db.category) as category_translated,
  COALESCE(bt.security_element_ar, bt.security_element_tr, db.security_element) as security_element_translated,
  COALESCE(bt.colors_ar, bt.colors_tr, db.colors) as colors_translated,
  COALESCE(bt.banknote_description_ar, bt.banknote_description_tr, db.banknote_description) as banknote_description_translated,
  COALESCE(bt.historical_description_ar, bt.historical_description_tr, db.historical_description) as historical_description_translated,
  COALESCE(bt.dimensions_ar, bt.dimensions_tr, db.dimensions) as dimensions_translated
FROM detailed_banknotes db
LEFT JOIN banknotes_translation bt ON db.id = bt.banknote_id AND bt.is_unlisted = false
LEFT JOIN countries c ON c.name = db.country
LEFT JOIN banknote_sort_options sultan_opts ON sultan_opts.country_id = c.id 
  AND sultan_opts.field_name = 'sultan' 
  AND sultan_opts.name = db.sultan_name;

-- Update enhanced_detailed_banknotes view to include authority name translations  
CREATE OR REPLACE VIEW enhanced_detailed_banknotes AS
SELECT 
  db.*,
  -- Authority name translations
  sultan_opts.name_ar as authority_name_ar,
  sultan_opts.name_tr as authority_name_tr,
  -- Additional computed fields for enhanced view
  CASE 
    WHEN db.front_picture IS NOT NULL THEN 
      CASE 
        WHEN db.front_picture LIKE 'https://%' THEN db.front_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || db.front_picture
      END
    ELSE NULL
  END as authority_name,
  CASE 
    WHEN db.signatures_front IS NOT NULL AND array_length(db.signatures_front, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN sig LIKE 'https://%' THEN sig
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || sig
        END
        FROM unnest(db.signatures_front) as sig
      )
    ELSE NULL
  END as signatures_front_urls,
  CASE 
    WHEN db.signatures_back IS NOT NULL AND array_length(db.signatures_back, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN sig LIKE 'https://%' THEN sig
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || sig
        END
        FROM unnest(db.signatures_back) as sig
      )
    ELSE NULL
  END as signatures_back_urls,
  CASE 
    WHEN db.seal_pictures IS NOT NULL AND array_length(db.seal_pictures, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN pic LIKE 'https://%' THEN pic
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || pic
        END
        FROM unnest(db.seal_pictures) as pic
      )
    ELSE NULL
  END as seal_picture_urls,
  CASE 
    WHEN db.tughra_picture IS NOT NULL THEN 
      CASE 
        WHEN db.tughra_picture LIKE 'https://%' THEN db.tughra_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || db.tughra_picture
      END
    ELSE NULL
  END as tughra_picture_url,
  CASE 
    WHEN db.watermark_picture IS NOT NULL THEN 
      CASE 
        WHEN db.watermark_picture LIKE 'https://%' THEN db.watermark_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || db.watermark_picture
      END
    ELSE NULL
  END as watermark_picture_url
FROM detailed_banknotes db
LEFT JOIN countries c ON c.name = db.country
LEFT JOIN banknote_sort_options sultan_opts ON sultan_opts.country_id = c.id 
  AND sultan_opts.field_name = 'sultan' 
  AND sultan_opts.name = db.sultan_name;

-- Update enhanced_banknotes_with_translations view to include authority name translations
CREATE OR REPLACE VIEW enhanced_banknotes_with_translations AS
SELECT 
  bwt.*,
  -- Authority name translations from banknote_sort_options
  sultan_opts.name_ar as authority_name_ar,
  sultan_opts.name_tr as authority_name_tr,
  -- Enhanced URL fields
  CASE 
    WHEN bwt.front_picture IS NOT NULL THEN 
      CASE 
        WHEN bwt.front_picture LIKE 'https://%' THEN bwt.front_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || bwt.front_picture
      END
    ELSE NULL
  END as authority_name,
  CASE 
    WHEN bwt.signatures_front IS NOT NULL AND array_length(bwt.signatures_front, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN sig LIKE 'https://%' THEN sig
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || sig
        END
        FROM unnest(bwt.signatures_front) as sig
      )
    ELSE NULL
  END as signatures_front_urls,
  CASE 
    WHEN bwt.signatures_back IS NOT NULL AND array_length(bwt.signatures_back, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN sig LIKE 'https://%' THEN sig
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || sig
        END
        FROM unnest(bwt.signatures_back) as sig
      )
    ELSE NULL
  END as signatures_back_urls,
  CASE 
    WHEN bwt.seal_pictures IS NOT NULL AND array_length(bwt.seal_pictures, 1) > 0 THEN
      array(
        SELECT CASE 
          WHEN pic LIKE 'https://%' THEN pic
          ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || pic
        END
        FROM unnest(bwt.seal_pictures) as pic
      )
    ELSE NULL
  END as seal_picture_urls,
  CASE 
    WHEN bwt.tughra_picture IS NOT NULL THEN 
      CASE 
        WHEN bwt.tughra_picture LIKE 'https://%' THEN bwt.tughra_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || bwt.tughra_picture
      END
    ELSE NULL
  END as tughra_picture_url,
  CASE 
    WHEN bwt.watermark_picture IS NOT NULL THEN 
      CASE 
        WHEN bwt.watermark_picture LIKE 'https://%' THEN bwt.watermark_picture
        ELSE 'https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote-images/' || bwt.watermark_picture
      END
    ELSE NULL
  END as watermark_picture_url
FROM banknotes_with_translations bwt
LEFT JOIN countries c ON c.name = bwt.country
LEFT JOIN banknote_sort_options sultan_opts ON sultan_opts.country_id = c.id 
  AND sultan_opts.field_name = 'sultan' 
  AND sultan_opts.name = bwt.sultan_name;