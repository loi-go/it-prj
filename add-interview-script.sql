-- ============================================
-- Add Interview Script Support
-- ============================================
-- Run this in your Supabase SQL Editor

-- Add script column to interviews table
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS script TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name = 'script';
