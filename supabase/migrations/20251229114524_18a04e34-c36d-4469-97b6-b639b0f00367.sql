-- Create future_notes table for "Notes to Future Me" system
CREATE TABLE public.future_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  work_type TEXT,
  note TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.future_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notes"
ON public.future_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
ON public.future_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.future_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.future_notes
FOR DELETE
USING (auth.uid() = user_id);