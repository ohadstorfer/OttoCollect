-- Create forum_announcements table with same structure as forum_posts
CREATE TABLE public.forum_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  image_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forum_announcements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies similar to forum_posts
CREATE POLICY "Enable read access for all users" 
ON public.forum_announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Allow super/country admin all actions" 
ON public.forum_announcements 
FOR ALL 
USING (is_super_or_country_admin() OR (author_id = auth.uid()));

CREATE POLICY "Users can create their own forum announcements" 
ON public.forum_announcements 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own forum announcements" 
ON public.forum_announcements 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own forum announcements" 
ON public.forum_announcements 
FOR DELETE 
USING (auth.uid() = author_id);