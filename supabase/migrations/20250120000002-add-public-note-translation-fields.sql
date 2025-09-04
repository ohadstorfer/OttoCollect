-- Add public note translation fields to collection_items table
ALTER TABLE public.collection_items 
ADD COLUMN IF NOT EXISTS public_note_ar TEXT,
ADD COLUMN IF NOT EXISTS public_note_tr TEXT,
ADD COLUMN IF NOT EXISTS public_note_en TEXT,
ADD COLUMN IF NOT EXISTS public_note_original_language VARCHAR(2) DEFAULT 'en';
