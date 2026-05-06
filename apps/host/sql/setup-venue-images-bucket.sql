-- Setup storage bucket and policies for venue images

-- Create storage bucket for venue images
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for venue images

-- Allow authenticated users to upload venue images
CREATE POLICY "Allow authenticated venue image uploads" 
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'venue-images');

-- Allow public read access to venue images
CREATE POLICY "Allow public read access to venue images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-images');

-- Allow users to delete their own venue images
CREATE POLICY "Allow users to delete their own venue images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own venue images
CREATE POLICY "Allow users to update their own venue images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
