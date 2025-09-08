
-- Create a new storage bucket for banknote images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banknote_images', 'banknote_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies to allow users to access banknote images
CREATE POLICY "Public Access to Banknote Images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'banknote_images');

-- Create policy to allow authenticated users to upload their own banknote images
CREATE POLICY "Users can upload their own banknote images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banknote_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to update their own banknote images
CREATE POLICY "Users can update their own banknote images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'banknote_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own banknote images
CREATE POLICY "Users can delete their own banknote images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'banknote_images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
