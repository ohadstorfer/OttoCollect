-- Add translation fields to collection_items table
ALTER TABLE collection_items 
ADD COLUMN public_note_ar text,
ADD COLUMN public_note_tr text,
ADD COLUMN private_note_ar text,
ADD COLUMN private_note_tr text,
ADD COLUMN location_ar text,
ADD COLUMN location_tr text,
ADD COLUMN type_ar text,
ADD COLUMN type_tr text;