-- Create user_stats table for tracking achievements progress
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions_completed INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_minutes_worked INTEGER NOT NULL DEFAULT 0,
  unique_categories_used TEXT[] NOT NULL DEFAULT '{}',
  templates_created INTEGER NOT NULL DEFAULT 0,
  notes_sent INTEGER NOT NULL DEFAULT 0,
  notes_read INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_session_date DATE,
  achievements_unlocked TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize user stats when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_stats (id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Function to update stats when a session is completed
CREATE OR REPLACE FUNCTION public.update_stats_on_session_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  streak_count INTEGER;
  last_date DATE;
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get current stats
    SELECT current_streak, last_session_date INTO streak_count, last_date
    FROM public.user_stats WHERE id = NEW.user_id;
    
    -- Calculate new streak
    IF last_date IS NULL OR last_date = CURRENT_DATE - INTERVAL '1 day' THEN
      streak_count := COALESCE(streak_count, 0) + 1;
    ELSIF last_date != CURRENT_DATE THEN
      streak_count := 1;
    END IF;
    
    -- Update stats
    UPDATE public.user_stats
    SET 
      total_sessions_completed = total_sessions_completed + 1,
      total_minutes_worked = total_minutes_worked + COALESCE(NEW.duration_minutes, 0),
      unique_categories_used = CASE 
        WHEN NOT (NEW.venture = ANY(unique_categories_used)) 
        THEN array_append(unique_categories_used, NEW.venture)
        ELSE unique_categories_used
      END,
      current_streak = streak_count,
      longest_streak = GREATEST(longest_streak, streak_count),
      last_session_date = CURRENT_DATE,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for session completion
CREATE TRIGGER on_session_complete
AFTER UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_session_complete();

-- Function to update task count
CREATE OR REPLACE FUNCTION public.update_stats_on_tasks_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_completed INTEGER := 0;
  new_completed INTEGER := 0;
  task_record JSONB;
BEGIN
  -- Count completed tasks in old and new
  IF OLD.tasks IS NOT NULL THEN
    FOR task_record IN SELECT * FROM jsonb_array_elements(OLD.tasks)
    LOOP
      IF (task_record->>'completed')::boolean = true THEN
        old_completed := old_completed + 1;
      END IF;
    END LOOP;
  END IF;
  
  IF NEW.tasks IS NOT NULL THEN
    FOR task_record IN SELECT * FROM jsonb_array_elements(NEW.tasks)
    LOOP
      IF (task_record->>'completed')::boolean = true THEN
        new_completed := new_completed + 1;
      END IF;
    END LOOP;
  END IF;
  
  -- Update if more tasks completed
  IF new_completed > old_completed THEN
    UPDATE public.user_stats
    SET total_tasks_completed = total_tasks_completed + (new_completed - old_completed),
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for task changes
CREATE TRIGGER on_tasks_change
AFTER UPDATE OF tasks ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_tasks_change();

-- Function to update template count
CREATE OR REPLACE FUNCTION public.update_stats_on_template_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_stats
  SET templates_created = templates_created + 1,
      updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger for template creation
CREATE TRIGGER on_template_create
AFTER INSERT ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_template_create();

-- Function to update notes sent count
CREATE OR REPLACE FUNCTION public.update_stats_on_note_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_stats
  SET notes_sent = notes_sent + 1,
      updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger for note creation
CREATE TRIGGER on_note_create
AFTER INSERT ON public.future_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_note_create();

-- Function to update notes read count
CREATE OR REPLACE FUNCTION public.update_stats_on_note_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    UPDATE public.user_stats
    SET notes_read = notes_read + 1,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for note read
CREATE TRIGGER on_note_read
AFTER UPDATE OF is_read ON public.future_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_note_read();