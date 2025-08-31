-- Update RLS policies for banknotes_translation to be permissive
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only authenticated users can read translations" ON public.banknotes_translation;
DROP POLICY IF EXISTS "Only super/country admins can manage translations" ON public.banknotes_translation;

-- Create permissive policies that allow everyone to perform all operations
CREATE POLICY "Everyone can read banknote translations" 
ON public.banknotes_translation 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert banknote translations" 
ON public.banknotes_translation 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update banknote translations" 
ON public.banknotes_translation 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete banknote translations" 
ON public.banknotes_translation 
FOR DELETE 
USING (true);