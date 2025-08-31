-- Create a view that includes translated banknote fields
CREATE OR REPLACE VIEW public.banknotes_with_translations AS
SELECT 
  db.*,
  -- Translated fields for detailed banknotes
  CASE 
    WHEN bt.country_ar IS NOT NULL THEN bt.country_ar 
    ELSE db.country 
  END as country_translated,
  CASE 
    WHEN bt.face_value_ar IS NOT NULL THEN bt.face_value_ar 
    ELSE db.face_value 
  END as face_value_translated,
  CASE 
    WHEN bt.islamic_year_ar IS NOT NULL THEN bt.islamic_year_ar 
    ELSE db.islamic_year 
  END as islamic_year_translated,
  CASE 
    WHEN bt.signatures_front_ar IS NOT NULL THEN bt.signatures_front_ar 
    ELSE ARRAY[db.signatures_front]::text[]
  END as signatures_front_translated,
  CASE 
    WHEN bt.signatures_back_ar IS NOT NULL THEN bt.signatures_back_ar 
    ELSE ARRAY[db.signatures_back]::text[]
  END as signatures_back_translated,
  CASE 
    WHEN bt.seal_names_ar IS NOT NULL THEN bt.seal_names_ar 
    ELSE db.seal_names 
  END as seal_names_translated,
  CASE 
    WHEN bt.sultan_name_ar IS NOT NULL THEN bt.sultan_name_ar 
    ELSE db.sultan_name 
  END as sultan_name_translated,
  CASE 
    WHEN bt.printer_ar IS NOT NULL THEN bt.printer_ar 
    ELSE db.printer 
  END as printer_translated,
  CASE 
    WHEN bt.type_ar IS NOT NULL THEN bt.type_ar 
    ELSE db.type 
  END as type_translated,
  CASE 
    WHEN bt.category_ar IS NOT NULL THEN bt.category_ar 
    ELSE db.category 
  END as category_translated,
  CASE 
    WHEN bt.security_element_ar IS NOT NULL THEN bt.security_element_ar 
    ELSE db.security_element 
  END as security_element_translated,
  CASE 
    WHEN bt.colors_ar IS NOT NULL THEN bt.colors_ar 
    ELSE db.colors 
  END as colors_translated,
  CASE 
    WHEN bt.banknote_description_ar IS NOT NULL THEN bt.banknote_description_ar 
    ELSE db.banknote_description 
  END as banknote_description_translated,
  CASE 
    WHEN bt.historical_description_ar IS NOT NULL THEN bt.historical_description_ar 
    ELSE db.historical_description 
  END as historical_description_translated,
  CASE 
    WHEN bt.dimensions_ar IS NOT NULL THEN bt.dimensions_ar 
    ELSE db.dimensions 
  END as dimensions_translated,
  -- Turkish translations
  bt.country_tr,
  bt.face_value_tr,
  bt.islamic_year_tr,
  bt.signatures_front_tr,
  bt.signatures_back_tr,
  bt.seal_names_tr,
  bt.sultan_name_tr,
  bt.printer_tr,
  bt.type_tr,
  bt.category_tr,
  bt.security_element_tr,
  bt.colors_tr,
  bt.banknote_description_tr,
  bt.historical_description_tr,
  bt.dimensions_tr,
  -- Arabic translations
  bt.country_ar,
  bt.face_value_ar,
  bt.islamic_year_ar,
  bt.signatures_front_ar,
  bt.signatures_back_ar,
  bt.seal_names_ar,
  bt.sultan_name_ar,
  bt.printer_ar,
  bt.type_ar,
  bt.category_ar,
  bt.security_element_ar,
  bt.colors_ar,
  bt.banknote_description_ar,
  bt.historical_description_ar,
  bt.dimensions_ar
FROM public.detailed_banknotes db
LEFT JOIN public.banknotes_translation bt ON (
  db.id = bt.banknote_id AND bt.is_unlisted = false
);

-- Create enhanced view with translations
CREATE OR REPLACE VIEW public.enhanced_banknotes_with_translations AS
SELECT 
  db.*,
  -- Translated fields based on current language context
  CASE 
    WHEN bt.country_ar IS NOT NULL THEN bt.country_ar 
    ELSE db.country 
  END as country_translated,
  CASE 
    WHEN bt.face_value_ar IS NOT NULL THEN bt.face_value_ar 
    ELSE db.face_value 
  END as face_value_translated,
  CASE 
    WHEN bt.islamic_year_ar IS NOT NULL THEN bt.islamic_year_ar 
    ELSE db.islamic_year 
  END as islamic_year_translated,
  CASE 
    WHEN bt.signatures_front_ar IS NOT NULL THEN bt.signatures_front_ar 
    ELSE db.signatures_front
  END as signatures_front_translated,
  CASE 
    WHEN bt.signatures_back_ar IS NOT NULL THEN bt.signatures_back_ar 
    ELSE db.signatures_back
  END as signatures_back_translated,
  CASE 
    WHEN bt.seal_names_ar IS NOT NULL THEN bt.seal_names_ar 
    ELSE db.seal_names 
  END as seal_names_translated,
  CASE 
    WHEN bt.sultan_name_ar IS NOT NULL THEN bt.sultan_name_ar 
    ELSE db.sultan_name 
  END as sultan_name_translated,
  CASE 
    WHEN bt.printer_ar IS NOT NULL THEN bt.printer_ar 
    ELSE db.printer 
  END as printer_translated,
  CASE 
    WHEN bt.type_ar IS NOT NULL THEN bt.type_ar 
    ELSE db.type 
  END as type_translated,
  CASE 
    WHEN bt.category_ar IS NOT NULL THEN bt.category_ar 
    ELSE db.category 
  END as category_translated,
  CASE 
    WHEN bt.security_element_ar IS NOT NULL THEN bt.security_element_ar 
    ELSE db.security_element 
  END as security_element_translated,
  CASE 
    WHEN bt.colors_ar IS NOT NULL THEN bt.colors_ar 
    ELSE db.colors 
  END as colors_translated,
  CASE 
    WHEN bt.banknote_description_ar IS NOT NULL THEN bt.banknote_description_ar 
    ELSE db.banknote_description 
  END as banknote_description_translated,
  CASE 
    WHEN bt.historical_description_ar IS NOT NULL THEN bt.historical_description_ar 
    ELSE db.historical_description 
  END as historical_description_translated,
  CASE 
    WHEN bt.dimensions_ar IS NOT NULL THEN bt.dimensions_ar 
    ELSE db.dimensions 
  END as dimensions_translated,
  -- All translation fields
  bt.country_tr,
  bt.face_value_tr,
  bt.islamic_year_tr,
  bt.signatures_front_tr,
  bt.signatures_back_tr,
  bt.seal_names_tr,
  bt.sultan_name_tr,
  bt.printer_tr,
  bt.type_tr,
  bt.category_tr,
  bt.security_element_tr,
  bt.colors_tr,
  bt.banknote_description_tr,
  bt.historical_description_tr,
  bt.dimensions_tr,
  bt.country_ar,
  bt.face_value_ar,
  bt.islamic_year_ar,
  bt.signatures_front_ar,
  bt.signatures_back_ar,
  bt.seal_names_ar,
  bt.sultan_name_ar,
  bt.printer_ar,
  bt.type_ar,
  bt.category_ar,
  bt.security_element_ar,
  bt.colors_ar,
  bt.banknote_description_ar,
  bt.historical_description_ar,
  bt.dimensions_ar
FROM public.enhanced_detailed_banknotes db
LEFT JOIN public.banknotes_translation bt ON (
  db.id = bt.banknote_id AND bt.is_unlisted = false
);

-- Create view for unlisted banknotes with translations
CREATE OR REPLACE VIEW public.unlisted_banknotes_with_translations AS
SELECT 
  ub.*,
  -- Translated fields for unlisted banknotes
  CASE 
    WHEN bt.name_ar IS NOT NULL THEN bt.name_ar 
    ELSE ub.name 
  END as name_translated,
  CASE 
    WHEN bt.country_ar IS NOT NULL THEN bt.country_ar 
    ELSE ub.country 
  END as country_translated,
  CASE 
    WHEN bt.face_value_ar IS NOT NULL THEN bt.face_value_ar 
    ELSE ub.face_value 
  END as face_value_translated,
  CASE 
    WHEN bt.banknote_description_ar IS NOT NULL THEN bt.banknote_description_ar 
    ELSE ub.description 
  END as description_translated,
  -- All translation fields
  bt.name_tr,
  bt.country_tr,
  bt.face_value_tr,
  bt.banknote_description_tr,
  bt.name_ar,
  bt.country_ar,
  bt.face_value_ar,
  bt.banknote_description_ar
FROM public.unlisted_banknotes ub
LEFT JOIN public.banknotes_translation bt ON (
  ub.id = bt.banknote_id AND bt.is_unlisted = true
);

-- Enable RLS on views
ALTER VIEW public.banknotes_with_translations SET (security_invoker = true);
ALTER VIEW public.enhanced_banknotes_with_translations SET (security_invoker = true);
ALTER VIEW public.unlisted_banknotes_with_translations SET (security_invoker = true);