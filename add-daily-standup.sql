-- Create daily_standups table
CREATE TABLE IF NOT EXISTS public.daily_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  standup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]', -- Array of {title, subtitle, content}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, standup_date) -- One standup per user per day
);

-- Enable Row Level Security
ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;

-- Policies (drop first so this script is safe to re-run)
DROP POLICY IF EXISTS "Users can view standups from signup" ON public.daily_standups;
DROP POLICY IF EXISTS "Users can insert own standups" ON public.daily_standups;
DROP POLICY IF EXISTS "Users can update own standups" ON public.daily_standups;
DROP POLICY IF EXISTS "Users can delete own standups" ON public.daily_standups;

CREATE POLICY "Users can view standups from signup"
  ON public.daily_standups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles me
          WHERE me.id = auth.uid() AND me.is_admin = true
        )
      )
      OR (
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

CREATE POLICY "Users can insert own standups"
  ON public.daily_standups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own standups"
  ON public.daily_standups
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own standups"
  ON public.daily_standups
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_standup_updated ON public.daily_standups;
CREATE TRIGGER on_standup_updated
  BEFORE UPDATE ON public.daily_standups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();