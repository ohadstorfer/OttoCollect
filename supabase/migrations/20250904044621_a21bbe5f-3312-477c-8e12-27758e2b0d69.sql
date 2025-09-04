-- Update enhanced_banknotes_with_translations view to include authority name translations
DROP VIEW IF EXISTS enhanced_banknotes_with_translations;

CREATE VIEW enhanced_banknotes_with_translations AS
SELECT 
  db.id,
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
  db.front_picture_watermarked,
  db.back_picture_watermarked,
  db.front_picture_thumbnail,
  db.back_picture_thumbnail,
  db.is_approved,
  db.is_pending,
  db.created_at,
  db.updated_at,
  db.country,
  db.authority_name,
  db.authority_name_ar,
  db.authority_name_tr,
  -- Original fields with translations
  COALESCE(bt.country_ar, db.country) as country_ar,
  COALESCE(bt.country_tr, db.country) as country_tr,
  COALESCE(bt.face_value_ar, db.face_value) as face_value_ar,
  COALESCE(bt.face_value_tr, db.face_value) as face_value_tr,
  COALESCE(bt.islamic_year_ar, db.islamic_year) as islamic_year_ar,
  COALESCE(bt.islamic_year_tr, db.islamic_year) as islamic_year_tr,
  COALESCE(bt.signatures_front_ar, db.signatures_front) as signatures_front_ar,
  COALESCE(bt.signatures_front_tr, db.signatures_front) as signatures_front_tr,
  COALESCE(bt.signatures_back_ar, db.signatures_back) as signatures_back_ar,
  COALESCE(bt.signatures_back_tr, db.signatures_back) as signatures_back_tr,
  COALESCE(bt.seal_names_ar, db.seal_names) as seal_names_ar,
  COALESCE(bt.seal_names_tr, db.seal_names) as seal_names_tr,
  COALESCE(bt.sultan_name_ar, db.sultan_name) as sultan_name_ar,
  COALESCE(bt.sultan_name_tr, db.sultan_name) as sultan_name_tr,
  COALESCE(bt.printer_ar, db.printer) as printer_ar,
  COALESCE(bt.printer_tr, db.printer) as printer_tr,
  COALESCE(bt.type_ar, db.type) as type_ar,
  COALESCE(bt.type_tr, db.type) as type_tr,
  COALESCE(bt.category_ar, db.category) as category_ar,
  COALESCE(bt.category_tr, db.category) as category_tr,
  COALESCE(bt.security_element_ar, db.security_element) as security_element_ar,
  COALESCE(bt.security_element_tr, db.security_element) as security_element_tr,
  COALESCE(bt.colors_ar, db.colors) as colors_ar,
  COALESCE(bt.colors_tr, db.colors) as colors_tr,
  COALESCE(bt.banknote_description_ar, db.banknote_description) as banknote_description_ar,
  COALESCE(bt.banknote_description_tr, db.banknote_description) as banknote_description_tr,
  COALESCE(bt.historical_description_ar, db.historical_description) as historical_description_ar,
  COALESCE(bt.historical_description_tr, db.historical_description) as historical_description_tr,
  COALESCE(bt.dimensions_ar, db.dimensions) as dimensions_ar,
  COALESCE(bt.dimensions_tr, db.dimensions) as dimensions_tr,
  -- Computed translated fields for easier access
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.country_ar, db.country)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.country_tr, db.country)
    ELSE db.country
  END as country_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.face_value_ar, db.face_value)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.face_value_tr, db.face_value)
    ELSE db.face_value
  END as face_value_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.islamic_year_ar, db.islamic_year)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.islamic_year_tr, db.islamic_year)
    ELSE db.islamic_year
  END as islamic_year_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.signatures_front_ar, db.signatures_front)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.signatures_front_tr, db.signatures_front)
    ELSE db.signatures_front
  END as signatures_front_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.signatures_back_ar, db.signatures_back)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.signatures_back_tr, db.signatures_back)
    ELSE db.signatures_back
  END as signatures_back_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.seal_names_ar, db.seal_names)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.seal_names_tr, db.seal_names)
    ELSE db.seal_names
  END as seal_names_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.sultan_name_ar, db.sultan_name)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.sultan_name_tr, db.sultan_name)
    ELSE db.sultan_name
  END as sultan_name_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.printer_ar, db.printer)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.printer_tr, db.printer)
    ELSE db.printer
  END as printer_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.type_ar, db.type)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.type_tr, db.type)
    ELSE db.type
  END as type_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.category_ar, db.category)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.category_tr, db.category)
    ELSE db.category
  END as category_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.security_element_ar, db.security_element)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.security_element_tr, db.security_element)
    ELSE db.security_element
  END as security_element_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.colors_ar, db.colors)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.colors_tr, db.colors)
    ELSE db.colors
  END as colors_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.banknote_description_ar, db.banknote_description)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.banknote_description_tr, db.banknote_description)
    ELSE db.banknote_description
  END as banknote_description_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.historical_description_ar, db.historical_description)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.historical_description_tr, db.historical_description)
    ELSE db.historical_description
  END as historical_description_translated,
  CASE 
    WHEN current_setting('app.language', true) = 'ar' THEN COALESCE(bt.dimensions_ar, db.dimensions)
    WHEN current_setting('app.language', true) = 'tr' THEN COALESCE(bt.dimensions_tr, db.dimensions)
    ELSE db.dimensions
  END as dimensions_translated
FROM enhanced_detailed_banknotes db
LEFT JOIN banknotes_translation bt ON db.id = bt.banknote_id AND bt.is_unlisted = false;