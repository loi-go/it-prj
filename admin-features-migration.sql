-- Run in Supabase SQL Editor after initial setup.
-- Adds admin / disabled flags, admin profile updates, and standup visibility rules.

-- ---------------------------------------------------------------------------
-- Profiles: admin & account status
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false NOT NULL;

-- Admins may update any profile (verified, disabled, is_admin, name, etc.)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.is_admin = true
    )
  );

-- Bootstrap: grant admin to a user (replace UUID with your auth user id)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR-USER-UUID';

-- ---------------------------------------------------------------------------
-- Daily standups: non-admins cannot read other users' standups when owner is admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view standups from signup" ON public.daily_standups;

CREATE POLICY "Users can view standups from signup"
  ON public.daily_standups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Always see own rows
      user_id = auth.uid()
      OR (
        -- Admins see everyone's standups
        EXISTS (
          SELECT 1 FROM public.profiles me
          WHERE me.id = auth.uid() AND me.is_admin = true
        )
      )
      OR (
        -- Non-admins: other people's standups only if owner is not admin
        NOT EXISTS (
          SELECT 1 FROM public.profiles owner
          WHERE owner.id = daily_standups.user_id AND owner.is_admin = true
        )
        AND EXISTS (
          SELECT 1 FROM public.profiles viewer
          WHERE viewer.id = auth.uid()
            AND daily_standups.standup_date >= DATE(viewer.created_at)
        )
      )
    )
  );
