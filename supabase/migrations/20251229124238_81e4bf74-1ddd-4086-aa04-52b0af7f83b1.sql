-- Add projects_completed to user_stats
ALTER TABLE public.user_stats 
ADD COLUMN projects_completed integer NOT NULL DEFAULT 0;

-- Create trigger function for project completion
CREATE OR REPLACE FUNCTION public.update_stats_on_project_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.user_stats
    SET projects_completed = projects_completed + 1,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger
CREATE TRIGGER on_project_complete
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_stats_on_project_complete();