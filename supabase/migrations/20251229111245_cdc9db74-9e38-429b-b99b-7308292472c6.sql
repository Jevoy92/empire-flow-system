-- Add visible_template_tabs column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN visible_template_tabs jsonb NOT NULL DEFAULT '["personal", "projects", "business"]'::jsonb;