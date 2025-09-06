-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

-- Create a security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'Super Admin'
  );
$$;

-- Create the corrected policy using the security definer function
CREATE POLICY "Super admins can view all profiles"
ON profiles
FOR SELECT
USING (public.is_super_admin());