-- Add collection_item_id to image_suggestions table to link suggestions to specific collection items
ALTER TABLE public.image_suggestions 
ADD COLUMN collection_item_id UUID REFERENCES public.collection_items(id) ON DELETE CASCADE;

-- Update RLS policies to include collection_item_id access
DROP POLICY IF EXISTS "Users can read their own image suggestions" ON public.image_suggestions;
CREATE POLICY "Users can read their own image suggestions"
  ON public.image_suggestions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT ci.user_id FROM collection_items ci WHERE ci.id = collection_item_id
  ));

-- Update the existing admin policies to handle collection_item_id
DROP POLICY IF EXISTS "Country admins can manage their country's image suggestions" ON public.image_suggestions;
CREATE POLICY "Country admins can manage their country's image suggestions"
  ON public.image_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      JOIN countries c ON r.name = (c.name || ' Admin')
      WHERE p.id = auth.uid() 
      AND (
        image_suggestions.banknote_id IN (
          SELECT detailed_banknotes.id
          FROM detailed_banknotes
          WHERE detailed_banknotes.country = c.name
        )
        OR
        image_suggestions.collection_item_id IN (
          SELECT ci.id 
          FROM collection_items ci
          JOIN detailed_banknotes db ON ci.banknote_id = db.id
          WHERE db.country = c.name
        )
      )
    )
  );