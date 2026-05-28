-- Adds new_extended_pick_number: a derived, readable format of the extended pick.
-- Rule: 'p' + base(pick_number) + ('.' + variant) ; Unlisted/empty base -> 'p.' + extended.
-- Mirrors src/utils/pickNumber.ts (buildNewExtendedPickNumber).

-- 1) New column on both base tables
alter table detailed_banknotes add column if not exists new_extended_pick_number text;
alter table unlisted_banknotes add column if not exists new_extended_pick_number text;

-- 2) Backfill existing rows
update detailed_banknotes set new_extended_pick_number = case
  when coalesce(pick_number,'') = '' or lower(pick_number) = 'unlisted'
    then 'p.' || extended_pick_number
  when position(pick_number in extended_pick_number) = 1 then
    case when extended_pick_number = pick_number then 'p' || pick_number
         else 'p' || pick_number || '.' || substr(extended_pick_number, length(pick_number)+1) end
  else 'p' || extended_pick_number
end
where extended_pick_number is not null;

update unlisted_banknotes set new_extended_pick_number = case
  when coalesce(pick_number,'') = '' or lower(pick_number) = 'unlisted'
    then 'p.' || extended_pick_number
  when position(pick_number in extended_pick_number) = 1 then
    case when extended_pick_number = pick_number then 'p' || pick_number
         else 'p' || pick_number || '.' || substr(extended_pick_number, length(pick_number)+1) end
  else 'p' || extended_pick_number
end
where extended_pick_number is not null;

-- 3) Propagate the column into the read views.
--    NOTE: CREATE OR REPLACE VIEW only allows ADDING columns at the END, so the
--    new column is appended last in each view (existing column order preserved).

create or replace view enhanced_detailed_banknotes as
 SELECT db.id,
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
    db.is_approved,
    db.is_pending,
    db.created_at,
    db.updated_at,
    db.front_picture_watermarked,
    db.back_picture_watermarked,
    db.front_picture_thumbnail,
    db.back_picture_thumbnail,
    db.dimensions,
    COALESCE(( SELECT bso.name
           FROM (banknote_sort_options bso
             JOIN countries c ON ((c.id = bso.country_id)))
          WHERE ((c.name = db.country) AND (bso.field_name = 'sultan'::text))
         LIMIT 1), db.sultan_name) AS authority_name,
    COALESCE(( SELECT bso.name_ar
           FROM (banknote_sort_options bso
             JOIN countries c ON ((c.id = bso.country_id)))
          WHERE ((c.name = db.country) AND (bso.field_name = 'sultan'::text))
         LIMIT 1), ''::text) AS authority_name_ar,
    COALESCE(( SELECT bso.name_tr
           FROM (banknote_sort_options bso
             JOIN countries c ON ((c.id = bso.country_id)))
          WHERE ((c.name = db.country) AND (bso.field_name = 'sultan'::text))
         LIMIT 1), ''::text) AS authority_name_tr,
    ( SELECT c.turk_catalog_label
           FROM countries c
          WHERE (c.name = db.country)
         LIMIT 1) AS turk_catalog_label,
    ( SELECT c.turk_catalog_label_ar
           FROM countries c
          WHERE (c.name = db.country)
         LIMIT 1) AS turk_catalog_label_ar,
    ( SELECT c.turk_catalog_label_tr
           FROM countries c
          WHERE (c.name = db.country)
         LIMIT 1) AS turk_catalog_label_tr,
        CASE
            WHEN ((db.signatures_front IS NOT NULL) AND (array_length(db.signatures_front, 1) > 0)) THEN ARRAY( SELECT sf.image_url
               FROM ((unnest(db.signatures_front) WITH ORDINALITY sig(name, ord)
                 JOIN signatures_front sf ON ((sf.name = sig.name)))
                 JOIN countries c ON (((c.id = sf.country_id) AND (c.name = db.country))))
              ORDER BY sig.ord)
            ELSE NULL::text[]
        END AS signatures_front_urls,
        CASE
            WHEN ((db.signatures_back IS NOT NULL) AND (array_length(db.signatures_back, 1) > 0)) THEN ARRAY( SELECT sb.image_url
               FROM ((unnest(db.signatures_back) WITH ORDINALITY sig(name, ord)
                 JOIN signatures_back sb ON ((sb.name = sig.name)))
                 JOIN countries c ON (((c.id = sb.country_id) AND (c.name = db.country))))
              ORDER BY sig.ord)
            ELSE NULL::text[]
        END AS signatures_back_urls,
        CASE
            WHEN ((db.seal_pictures IS NOT NULL) AND (array_length(db.seal_pictures, 1) > 0)) THEN ARRAY( SELECT sp.image_url
               FROM ((unnest(db.seal_pictures) WITH ORDINALITY s(name, ord)
                 JOIN seal_pictures sp ON ((sp.name = s.name)))
                 JOIN countries c ON (((c.id = sp.country_id) AND (c.name = db.country))))
              ORDER BY s.ord)
            ELSE NULL::text[]
        END AS seal_picture_urls,
        CASE
            WHEN ((db.tughra_picture IS NOT NULL) AND (db.tughra_picture <> ''::text)) THEN ( SELECT tp.image_url
               FROM (tughra_pictures tp
                 JOIN countries c ON ((tp.country_id = c.id)))
              WHERE ((c.name = db.country) AND (tp.name = db.tughra_picture))
             LIMIT 1)
            ELSE NULL::text
        END AS tughra_picture_url,
        CASE
            WHEN ((db.watermark_picture IS NOT NULL) AND (db.watermark_picture <> ''::text)) THEN ( SELECT wp.image_url
               FROM (watermark_pictures wp
                 JOIN countries c ON ((wp.country_id = c.id)))
              WHERE ((c.name = db.country) AND (wp.name = db.watermark_picture))
             LIMIT 1)
            ELSE NULL::text
        END AS watermark_picture_url,
    db.new_extended_pick_number
   FROM detailed_banknotes db;

create or replace view enhanced_banknotes_with_translations as
 SELECT db.id,
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
    COALESCE(bt.country_ar, db.country) AS country_translated,
    COALESCE(bt.face_value_ar, db.face_value) AS face_value_translated,
    COALESCE(bt.islamic_year_ar, db.islamic_year) AS islamic_year_translated,
    COALESCE(bt.signatures_front_ar, db.signatures_front) AS signatures_front_translated,
    COALESCE(bt.signatures_back_ar, db.signatures_back) AS signatures_back_translated,
    COALESCE(bt.seal_names_ar, db.seal_names) AS seal_names_translated,
    COALESCE(bt.sultan_name_ar, db.sultan_name) AS sultan_name_translated,
    COALESCE(bt.printer_ar, db.printer) AS printer_translated,
    COALESCE(bt.type_ar, db.type) AS type_translated,
    COALESCE(bt.category_ar, db.category) AS category_translated,
    COALESCE(bt.security_element_ar, db.security_element) AS security_element_translated,
    COALESCE(bt.colors_ar, db.colors) AS colors_translated,
    COALESCE(bt.banknote_description_ar, db.banknote_description) AS banknote_description_translated,
    COALESCE(bt.historical_description_ar, db.historical_description) AS historical_description_translated,
    COALESCE(bt.dimensions_ar, db.dimensions) AS dimensions_translated,
    db.new_extended_pick_number
   FROM (enhanced_detailed_banknotes db
     LEFT JOIN banknotes_translation bt ON (((db.id = bt.banknote_id) AND (bt.is_unlisted = false))));
