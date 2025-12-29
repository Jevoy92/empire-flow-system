-- Create user_ventures table for personalized categories
CREATE TABLE public.user_ventures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  tagline text,
  type text NOT NULL DEFAULT 'business' CHECK (type IN ('business', 'personal', 'project')),
  color text,
  work_types text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.user_ventures ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own ventures"
ON public.user_ventures FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ventures"
ON public.user_ventures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ventures"
ON public.user_ventures FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ventures"
ON public.user_ventures FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_ventures_updated_at
BEFORE UPDATE ON public.user_ventures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();