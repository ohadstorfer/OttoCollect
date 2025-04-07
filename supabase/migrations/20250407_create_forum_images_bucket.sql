
-- Create a new storage bucket for forum images
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum_images', 'forum_images', true);

-- Create policies to allow users to access forum images
CREATE POLICY "Public Access to Forum Images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'forum_images');

-- Create policy to allow authenticated users to upload their own forum images
CREATE POLICY "Users can upload their own forum images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to update their own forum images
CREATE POLICY "Users can update their own forum images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'forum_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own forum images
CREATE POLICY "Users can delete their own forum images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'forum_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
