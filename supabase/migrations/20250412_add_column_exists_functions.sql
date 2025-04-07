
-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(
  p_table TEXT,
  p_column TEXT
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_column
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Function to add is_edited column to forum_comments if it doesn't exist
CREATE OR REPLACE FUNCTION public.add_is_edited_column()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'forum_comments'
      AND column_name = 'is_edited'
  ) THEN
    -- Add the column if it doesn't exist
    EXECUTE 'ALTER TABLE public.forum_comments ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false';
  END IF;
END;
$$;
