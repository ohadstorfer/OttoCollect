-- Add RLS policy to allow translation updates for blog posts
CREATE POLICY "Allow translation updates for blog posts" 
ON public.blog_posts 
FOR UPDATE 
USING (true)
WITH CHECK (
  -- Only allow updating translation fields, not core content
  OLD.title = NEW.title AND
  OLD.content = NEW.content AND 
  OLD.excerpt = NEW.excerpt AND
  OLD.author_id = NEW.author_id AND
  OLD.main_image_url = NEW.main_image_url AND
  OLD.created_at = NEW.created_at
);