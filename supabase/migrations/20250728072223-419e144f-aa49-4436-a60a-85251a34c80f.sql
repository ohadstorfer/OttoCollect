-- Add missing columns from detailed_banknotes to unlisted_banknotes
-- Missing columns: signatures_front (should be ARRAY), signatures_back (should be ARRAY), dimensions

-- Convert signatures_front from text to text[] array
ALTER TABLE unlisted_banknotes 
ALTER COLUMN signatures_front TYPE text[] USING string_to_array(signatures_front, ',');

-- Convert signatures_back from text to text[] array  
ALTER TABLE unlisted_banknotes 
ALTER COLUMN signatures_back TYPE text[] USING string_to_array(signatures_back, ',');

-- Add dimensions column
ALTER TABLE unlisted_banknotes 
ADD COLUMN IF NOT EXISTS dimensions text;

-- Make sure extended_pick_number and pick_number have same nullability as detailed_banknotes
-- In detailed_banknotes: extended_pick_number is NOT NULL, pick_number is NOT NULL
-- In unlisted_banknotes: both are nullable, so we need to make them consistent

-- Since unlisted banknotes might not always have pick numbers, we'll leave them as nullable
-- but ensure they have proper defaults when needed