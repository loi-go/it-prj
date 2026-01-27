-- ============================================
-- Update RLS Policies to Allow Viewing All Interviews
-- ============================================
-- Run this in your Supabase SQL Editor

-- Update profiles policy to allow viewing all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update interviews policy to allow viewing all interviews
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can view all interviews" ON public.interviews;

CREATE POLICY "Users can view all interviews"
  ON public.interviews
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'interviews')
ORDER BY tablename, policyname;

