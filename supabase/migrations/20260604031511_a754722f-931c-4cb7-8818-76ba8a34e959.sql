
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.limitless_lifelogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lifelog_id text NOT NULL,
  title text,
  summary text,
  transcript text,
  speakers jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lifelog_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.limitless_lifelogs TO authenticated;
GRANT ALL ON public.limitless_lifelogs TO service_role;

ALTER TABLE public.limitless_lifelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own lifelogs" ON public.limitless_lifelogs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own lifelogs" ON public.limitless_lifelogs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own lifelogs" ON public.limitless_lifelogs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own lifelogs" ON public.limitless_lifelogs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX limitless_lifelogs_user_started_idx
  ON public.limitless_lifelogs (user_id, started_at DESC);

CREATE TRIGGER set_limitless_lifelogs_updated_at
  BEFORE UPDATE ON public.limitless_lifelogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.limitless_sync_state (
  user_id uuid PRIMARY KEY,
  last_cursor text,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  lifelog_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.limitless_sync_state TO authenticated;
GRANT ALL ON public.limitless_sync_state TO service_role;

ALTER TABLE public.limitless_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own sync state" ON public.limitless_sync_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own sync state" ON public.limitless_sync_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own sync state" ON public.limitless_sync_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_limitless_sync_state_updated_at
  BEFORE UPDATE ON public.limitless_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
