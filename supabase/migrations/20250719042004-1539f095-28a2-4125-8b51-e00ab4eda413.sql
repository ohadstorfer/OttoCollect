-- Add foreign key constraint to forum_comments table
ALTER TABLE public.forum_comments 
ADD CONSTRAINT forum_comments_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;