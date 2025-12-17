-- Create sessions table for tracking work sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venture TEXT NOT NULL,
  work_type TEXT NOT NULL,
  focus TEXT NOT NULL,
  completion_condition TEXT NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create templates table for saved session configurations
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  venture TEXT NOT NULL,
  work_type TEXT NOT NULL,
  default_focus TEXT,
  default_completion_condition TEXT,
  default_tasks JSONB DEFAULT '[]'::jsonb,
  use_ai_tasks BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables (public access for now since no auth)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (no auth required for this app)
CREATE POLICY "Allow public read access on sessions" 
ON public.sessions FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on sessions" 
ON public.sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on sessions" 
ON public.sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on sessions" 
ON public.sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on templates" 
ON public.templates FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on templates" 
ON public.templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on templates" 
ON public.templates FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on templates" 
ON public.templates FOR DELETE USING (true);