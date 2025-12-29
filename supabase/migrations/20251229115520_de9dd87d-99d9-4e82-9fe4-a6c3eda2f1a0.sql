-- Enable realtime for user_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;

-- Seed existing user stats from historical data
INSERT INTO public.user_stats (id, total_sessions_completed, total_tasks_completed, total_minutes_worked, templates_created, notes_sent)
SELECT 
  u.id,
  COALESCE((SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.status = 'completed'), 0)::INTEGER,
  COALESCE((
    SELECT SUM(
      (SELECT COUNT(*) FROM jsonb_array_elements(s.tasks) AS t WHERE (t->>'completed')::boolean = true)
    ) FROM sessions s WHERE s.user_id = u.id
  ), 0)::INTEGER,
  COALESCE((SELECT SUM(duration_minutes) FROM sessions s WHERE s.user_id = u.id AND s.status = 'completed'), 0)::INTEGER,
  COALESCE((SELECT COUNT(*) FROM templates t WHERE t.user_id = u.id), 0)::INTEGER,
  COALESCE((SELECT COUNT(*) FROM future_notes fn WHERE fn.user_id = u.id), 0)::INTEGER
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_stats us WHERE us.id = u.id);