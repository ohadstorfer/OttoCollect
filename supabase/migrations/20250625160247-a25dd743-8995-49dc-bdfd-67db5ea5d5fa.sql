
-- Create the followers table for following relationships
CREATE TABLE public.followers (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Create indexes for performance
CREATE INDEX idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX idx_followers_following_id ON public.followers(following_id);

-- Enable Row Level Security
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all follow relationships" 
  ON public.followers 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own follow relationships" 
  ON public.followers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follow relationships" 
  ON public.followers 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create helper functions for getting follower counts
CREATE OR REPLACE FUNCTION get_followers_count(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM followers
  WHERE following_id = user_id;
$$;

CREATE OR REPLACE FUNCTION get_following_count(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM followers
  WHERE follower_id = user_id;
$$;

CREATE OR REPLACE FUNCTION is_following(follower_user_id uuid, following_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM followers
    WHERE follower_id = follower_user_id AND following_id = following_user_id
  );
$$;
