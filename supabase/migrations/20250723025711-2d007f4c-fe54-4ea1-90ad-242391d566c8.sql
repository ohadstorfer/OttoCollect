-- Update blog_posts RLS policies to allow super admins to delete and update any blog post

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete their own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update their own blog posts" ON blog_posts;

-- Create new policies that allow super admins
CREATE POLICY "Users can delete their own blog posts or super admins can delete any"
ON blog_posts 
FOR DELETE 
USING (auth.uid() = author_id OR is_super_admin());

CREATE POLICY "Users can update their own blog posts or super admins can update any"
ON blog_posts 
FOR UPDATE 
USING (auth.uid() = author_id OR is_super_admin());