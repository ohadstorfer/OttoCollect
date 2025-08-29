-- Update marketplace_items table to make banknote_id nullable for unlisted banknotes
ALTER TABLE marketplace_items ALTER COLUMN banknote_id DROP NOT NULL;