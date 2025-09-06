-- First, let's check current policies and drop the overly permissive one
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create a policy for users to view their own complete profile (including email)
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a policy for super admins to view all profiles (including emails)
CREATE POLICY "Super admins can view all profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'Super Admin'
  )
);

-- Create a public view that excludes sensitive information like email
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  role,
  rank,
  points,
  created_at,
  avatar_url,
  country,
  about,
  about_ar,
  about_tr,
  facebook_url,
  instagram_url,
  twitter_url,
  linkedin_url
FROM profiles;

-- Allow everyone to read from the public profiles view
CREATE POLICY "Anyone can view public profile data"
ON public_profiles
FOR SELECT
USING (true);