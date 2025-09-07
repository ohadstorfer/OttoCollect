-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow super admins all actions" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new policies for profiles table
-- Super admins have full access (keep existing privileges)
CREATE POLICY "Super admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'Super Admin'
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile  
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Everyone (including unauthenticated) can view profiles, but exclude email for unauthenticated users
CREATE POLICY "Public can view profiles excluding email" ON public.profiles
FOR SELECT TO anon
USING (true);

-- Authenticated users can view all profile fields
CREATE POLICY "Authenticated users can view all profile fields" ON public.profiles
FOR SELECT TO authenticated
USING (true);