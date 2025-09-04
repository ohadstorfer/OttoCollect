CREATE OR REPLACE view public.enhanced_banknotes_with_translations as
select
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
  COALESCE(
    bt.banknote_description_ar,
    db.banknote_description
  ) as banknote_description_ar,
  COALESCE(
    bt.banknote_description_tr,
    db.banknote_description
  ) as banknote_description_tr,
  COALESCE(
    bt.historical_description_ar,
    db.historical_description
  ) as historical_description_ar,
  COALESCE(
    bt.historical_description_tr,
    db.historical_description
  ) as historical_description_tr,
  COALESCE(bt.dimensions_ar, db.dimensions) as dimensions_ar,
  COALESCE(bt.dimensions_tr, db.dimensions) as dimensions_tr,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.country_ar, db.country)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.country_tr, db.country)
    else db.country
  end as country_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.face_value_ar, db.face_value)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.face_value_tr, db.face_value)
    else db.face_value
  end as face_value_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.islamic_year_ar, db.islamic_year)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.islamic_year_tr, db.islamic_year)
    else db.islamic_year
  end as islamic_year_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.signatures_front_ar, db.signatures_front)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.signatures_front_tr, db.signatures_front)
    else db.signatures_front
  end as signatures_front_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.signatures_back_ar, db.signatures_back)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.signatures_back_tr, db.signatures_back)
    else db.signatures_back
  end as signatures_back_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.seal_names_ar, db.seal_names)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.seal_names_tr, db.seal_names)
    else db.seal_names
  end as seal_names_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.sultan_name_ar, db.sultan_name)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.sultan_name_tr, db.sultan_name)
    else db.sultan_name
  end as sultan_name_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.printer_ar, db.printer)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.printer_tr, db.printer)
    else db.printer
  end as printer_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.type_ar, db.type)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.type_tr, db.type)
    else db.type
  end as type_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.category_ar, db.category)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.category_tr, db.category)
    else db.category
  end as category_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.security_element_ar, db.security_element)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.security_element_tr, db.security_element)
    else db.security_element
  end as security_element_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.colors_ar, db.colors)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.colors_tr, db.colors)
    else db.colors
  end as colors_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(
      bt.banknote_description_ar,
      db.banknote_description
    )
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(
      bt.banknote_description_tr,
      db.banknote_description
    )
    else db.banknote_description
  end as banknote_description_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(
      bt.historical_description_ar,
      db.historical_description
    )
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(
      bt.historical_description_tr,
      db.historical_description
    )
    else db.historical_description
  end as historical_description_translated,
  case
    when current_setting('app.language'::text, true) = 'ar'::text then COALESCE(bt.dimensions_ar, db.dimensions)
    when current_setting('app.language'::text, true) = 'tr'::text then COALESCE(bt.dimensions_tr, db.dimensions)
    else db.dimensions
  end as dimensions_translated,

  db.signatures_front_urls   AS raw_signatures_front_urls,
  db.signatures_back_urls    AS raw_signatures_back_urls,
  db.seal_picture_urls       AS raw_seal_picture_urls,
  db.watermark_picture_url   AS raw_watermark_picture_url,
  db.tughra_picture_url      AS raw_tughra_picture_url
  
from
  enhanced_detailed_banknotes db
  left join banknotes_translation bt on db.id = bt.banknote_id
  and bt.is_unlisted = false;