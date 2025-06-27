
-- Add the foreign key constraint modification to enable cascade delete
ALTER TABLE collection_items 
DROP CONSTRAINT IF EXISTS collection_items_banknote_id_fkey;

ALTER TABLE collection_items 
ADD CONSTRAINT collection_items_banknote_id_fkey 
FOREIGN KEY (banknote_id) 
REFERENCES detailed_banknotes(id) 
ON DELETE CASCADE;
