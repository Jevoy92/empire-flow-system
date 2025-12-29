-- Create table for storing all AI conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature TEXT NOT NULL, -- 'command_center', 'session_assistant', 'onboarding', 'smart_suggestions'
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- context like session_id, project_id, actions taken
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for storing learned user insights and preferences
CREATE TABLE public.ai_user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}', -- {"preferred_work_time": "morning", "task_style": "short"}
  patterns JSONB DEFAULT '{}', -- {"most_productive_day": "Tuesday", "avg_session_length": 45}
  recent_context JSONB DEFAULT '{}', -- last project worked on, pending follow-ups
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast retrieval
CREATE INDEX ai_conversations_user_created ON public.ai_conversations(user_id, created_at DESC);
CREATE INDEX ai_conversations_feature ON public.ai_conversations(user_id, feature, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_conversations
CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.ai_conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for ai_user_insights
CREATE POLICY "Users can view their own insights"
ON public.ai_user_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
ON public.ai_user_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
ON public.ai_user_insights FOR UPDATE
USING (auth.uid() = user_id);