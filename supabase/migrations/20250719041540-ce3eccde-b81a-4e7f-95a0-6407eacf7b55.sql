-- Add parent_comment_id to forum_comments for nested replies
ALTER TABLE public.forum_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.forum_comments(id) ON DELETE CASCADE;

-- Create index for better performance when fetching comment trees
CREATE INDEX idx_forum_comments_parent_id ON public.forum_comments(parent_comment_id);
CREATE INDEX idx_forum_comments_post_parent ON public.forum_comments(post_id, parent_comment_id);