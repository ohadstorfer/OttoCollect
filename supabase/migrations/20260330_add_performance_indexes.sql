-- Performance indexes for the enhanced_detailed_banknotes view.
-- The view runs 5 correlated subqueries per banknote row to resolve image URLs.
-- Without indexes, each subquery does a full table scan.

-- Index on detailed_banknotes country column (used in WHERE clause for all catalog queries)
CREATE INDEX IF NOT EXISTS idx_detailed_banknotes_country ON public.detailed_banknotes(country);

-- Indexes on lookup tables used in the view's correlated subqueries
CREATE INDEX IF NOT EXISTS idx_signatures_front_country_name ON public.signatures_front(country_id, name);
CREATE INDEX IF NOT EXISTS idx_signatures_back_country_name ON public.signatures_back(country_id, name);
CREATE INDEX IF NOT EXISTS idx_seal_pictures_country_name ON public.seal_pictures(country_id, name);
CREATE INDEX IF NOT EXISTS idx_tughra_pictures_country_name ON public.tughra_pictures(country_id, name);
CREATE INDEX IF NOT EXISTS idx_watermark_pictures_country_name ON public.watermark_pictures(country_id, name);

-- Index on banknotes_translation for the JOIN in enhanced_banknotes_with_translations view
CREATE INDEX IF NOT EXISTS idx_banknotes_translation_banknote_id ON public.banknotes_translation(banknote_id);

-- Index on banknote_sort_options for authority_name lookups
CREATE INDEX IF NOT EXISTS idx_banknote_sort_options_country_field ON public.banknote_sort_options(country_id, field_name);

-- Index on countries name (used in all JOIN ... WHERE c.name = db.country)
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);

-- Index on collection_items for user collection queries
CREATE INDEX IF NOT EXISTS idx_collection_items_user_id ON public.collection_items(user_id);
