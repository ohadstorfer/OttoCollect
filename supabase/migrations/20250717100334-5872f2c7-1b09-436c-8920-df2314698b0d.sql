-- Enable RLS on blog_posts table if not already enabled
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for blog_posts table
CREATE POLICY "Users can view all blog posts" 
ON blog_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own blog posts" 
ON blog_posts 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own blog posts" 
ON blog_posts 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own blog posts" 
ON blog_posts 
FOR DELETE 
USING (auth.uid() = author_id);