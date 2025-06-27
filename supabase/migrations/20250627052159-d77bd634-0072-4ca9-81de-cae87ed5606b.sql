
-- First, clean up orphaned records in all related tables
-- Remove marketplace items that reference non-existent banknotes
DELETE FROM marketplace_items 
WHERE banknote_id NOT IN (SELECT id FROM detailed_banknotes);

-- Remove wishlist items that reference non-existent banknotes
DELETE FROM wishlist_items 
WHERE banknote_id NOT IN (SELECT id FROM detailed_banknotes);

-- Remove image suggestions that reference non-existent banknotes
DELETE FROM image_suggestions 
WHERE banknote_id NOT IN (SELECT id FROM detailed_banknotes);

-- Remove collection items that reference non-existent banknotes
DELETE FROM collection_items 
WHERE banknote_id IS NOT NULL 
AND banknote_id NOT IN (SELECT id FROM detailed_banknotes);

-- Now add cascade delete constraints
-- Add cascade delete for wishlist_items
ALTER TABLE wishlist_items 
DROP CONSTRAINT IF EXISTS wishlist_items_banknote_id_fkey;

ALTER TABLE wishlist_items 
ADD CONSTRAINT wishlist_items_banknote_id_fkey 
FOREIGN KEY (banknote_id) 
REFERENCES detailed_banknotes(id) 
ON DELETE CASCADE;

-- Add cascade delete for marketplace_items
ALTER TABLE marketplace_items 
DROP CONSTRAINT IF EXISTS marketplace_items_banknote_id_fkey;

ALTER TABLE marketplace_items 
ADD CONSTRAINT marketplace_items_banknote_id_fkey 
FOREIGN KEY (banknote_id) 
REFERENCES detailed_banknotes(id) 
ON DELETE CASCADE;

-- Add cascade delete for image_suggestions
ALTER TABLE image_suggestions 
DROP CONSTRAINT IF EXISTS image_suggestions_banknote_id_fkey;

ALTER TABLE image_suggestions 
ADD CONSTRAINT image_suggestions_banknote_id_fkey 
FOREIGN KEY (banknote_id) 
REFERENCES detailed_banknotes(id) 
ON DELETE CASCADE;
