-- Drop existing permissive SELECT policies and create strict ones

-- Templates: Update SELECT policy to be strict
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
CREATE POLICY "Users can view their own templates" 
ON public.templates 
FOR SELECT 
USING (auth.uid() = user_id);

-- Sessions: Update SELECT policy to be strict
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enable realtime for templates and sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;