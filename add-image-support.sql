-- ============================================
-- Add Image Support to Interviews
-- ============================================
-- Run this in your Supabase SQL Editor

-- Add image_url column to interviews table
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for interview images
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-images', 'interview-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for interview images
-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload interview images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all images
CREATE POLICY "Anyone can view interview images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'interview-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own interview images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name = 'image_url';
