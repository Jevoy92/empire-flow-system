-- Add missing UPDATE policy for ai_conversations
CREATE POLICY "Users can update their own conversations"
ON public.ai_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for ai_user_insights (privacy compliance)
CREATE POLICY "Users can delete their own insights"
ON public.ai_user_insights FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for user_stats (privacy compliance - for account deletion)
CREATE POLICY "Users can delete their own stats"
ON public.user_stats FOR DELETE
USING (auth.uid() = id);

-- Add DELETE policy for profiles (account closure)
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = id);

-- Add DELETE policy for user_settings (privacy compliance)
CREATE POLICY "Users can delete their own settings"
ON public.user_settings FOR DELETE
USING (auth.uid() = id);