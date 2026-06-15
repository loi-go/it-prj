-- Add Caller role flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_caller BOOLEAN DEFAULT false NOT NULL;

-- Example: grant Caller role to a user
-- UPDATE public.profiles SET is_caller = true, is_admin = false WHERE id = 'YOUR-USER-UUID';
