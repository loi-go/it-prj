-- ============================================
-- Supabase Database Setup for Authentication
-- ============================================
-- Run this in your Supabase SQL Editor
-- This creates a profiles table and automatic triggers

-- Create profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  verified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger: Create profile automatically when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

-- Trigger: Update updated_at on profile changes
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify everything is set up correctly

-- Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) AS profiles_table_exists;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table = 'profiles';

-- ============================================
-- Interviews Table
-- ============================================

-- Create interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile TEXT NOT NULL, -- Profile name (e.g., david, matthew)
  company TEXT NOT NULL,
  step TEXT NOT NULL, -- e.g., "Phone Screen", "Technical", "Final"
  interview_date DATE NOT NULL,
  note TEXT,
  state TEXT DEFAULT 'Ongoing' NOT NULL CHECK (state IN ('Ongoing', 'Rejected', 'Offer')),
  interview_type TEXT CHECK (interview_type IN ('Remote', 'Onsite', 'Hybrid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can insert own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can update own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interviews;

-- Create policies for interviews
CREATE POLICY "Users can view own interviews"
  ON public.interviews
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews"
  ON public.interviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews"
  ON public.interviews
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviews"
  ON public.interviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_interview_updated ON public.interviews;

CREATE TRIGGER on_interview_updated
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

