
-- Create banknote_images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('banknote_images', 'banknote_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for banknote_images bucket
CREATE POLICY "Allow public read access on banknote_images" ON storage.objects
FOR SELECT USING (bucket_id = 'banknote_images');

CREATE POLICY "Allow authenticated users to upload banknote_images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'banknote_images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own banknote_images" ON storage.objects
FOR UPDATE USING (bucket_id = 'banknote_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own banknote_images" ON storage.objects
FOR DELETE USING (bucket_id = 'banknote_images' AND auth.uid()::text = (storage.foldername(name))[1]);
