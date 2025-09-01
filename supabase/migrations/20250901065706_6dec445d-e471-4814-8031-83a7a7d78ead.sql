-- Remove public_note translation fields from collection_items
ALTER TABLE collection_items 
DROP COLUMN IF EXISTS public_note_ar,
DROP COLUMN IF EXISTS public_note_tr;