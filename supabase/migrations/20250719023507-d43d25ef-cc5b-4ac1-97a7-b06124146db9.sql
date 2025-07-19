-- Add foreign key constraint to forum_announcements table
ALTER TABLE public.forum_announcements 
ADD CONSTRAINT forum_announcements_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;