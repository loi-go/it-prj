-- ============================================
-- Add Interview AI Analysis Support
-- ============================================
-- Run this in your Supabase SQL Editor

ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS ai_analysis TEXT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'interviews'
AND column_name = 'ai_analysis';
