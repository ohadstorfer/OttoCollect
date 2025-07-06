

-- Add display_order column to countries table
ALTER TABLE countries ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set initial display_order values alphabetically
UPDATE countries SET display_order = row_number() OVER (ORDER BY name);

