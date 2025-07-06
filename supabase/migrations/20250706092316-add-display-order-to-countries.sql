-- Add display_order column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'countries' 
                 AND column_name = 'display_order') THEN
    ALTER TABLE countries ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Update display_order for existing records if they are null or 0
WITH numbered_countries AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as new_order
  FROM countries
  WHERE display_order IS NULL OR display_order = 0
)
UPDATE countries c
SET display_order = nc.new_order
FROM numbered_countries nc
WHERE c.id = nc.id;

-- Add a unique constraint on display_order
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'countries_display_order_key'
  ) THEN
    ALTER TABLE countries ADD CONSTRAINT countries_display_order_key UNIQUE (display_order);
  END IF;
END $$; 