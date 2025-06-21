
-- Enable RLS on currencies table
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Policy for reading currencies - everyone can read
CREATE POLICY "Everyone can read currencies"
  ON public.currencies
  FOR SELECT
  USING (true);

-- Policy for super admins to manage all currencies
CREATE POLICY "Super admins can manage all currencies"
  ON public.currencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Policy for country admins to manage currencies for their assigned country
CREATE POLICY "Country admins can manage their country currencies"
  ON public.currencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.is_country_admin = true
      AND country_id IN (
        SELECT c.id FROM public.countries c
        WHERE r.name = c.name || ' Admin'
      )
    )
  );
