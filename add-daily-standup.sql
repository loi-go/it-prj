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

-- Create policies
CREATE POLICY "Users can view all standups"
  ON public.daily_standups
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

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
CREATE TRIGGER on_standup_updated
  BEFORE UPDATE ON public.daily_standups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();