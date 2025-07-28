-- Create RLS policies for unlisted_banknotes table

-- Allow users to view all unlisted banknotes (same as detailed_banknotes)
CREATE POLICY "Users can view unlisted banknotes"
ON public.unlisted_banknotes
FOR SELECT
USING (true);

-- Allow users to create their own unlisted banknotes
CREATE POLICY "Users can create their own unlisted banknotes"
ON public.unlisted_banknotes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own unlisted banknotes
CREATE POLICY "Users can update their own unlisted banknotes"
ON public.unlisted_banknotes
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own unlisted banknotes
CREATE POLICY "Users can delete their own unlisted banknotes"
ON public.unlisted_banknotes
FOR DELETE
USING (auth.uid() = user_id);

-- Allow super/country admins to manage all unlisted banknotes
CREATE POLICY "Allow super/country admin all actions on unlisted banknotes"
ON public.unlisted_banknotes
FOR ALL
USING (is_super_or_country_admin() OR (user_id = auth.uid()));