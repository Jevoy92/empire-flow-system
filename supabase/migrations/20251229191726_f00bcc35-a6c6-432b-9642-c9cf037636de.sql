-- Update default visible_template_tabs to remove business
ALTER TABLE public.user_settings 
ALTER COLUMN visible_template_tabs SET DEFAULT '["personal","projects"]'::jsonb;

-- Update default type for user_ventures to 'project' instead of 'business'
ALTER TABLE public.user_ventures 
ALTER COLUMN type SET DEFAULT 'project'::text;

-- Clean existing user_settings that still have 'business' in visible_template_tabs
UPDATE public.user_settings 
SET visible_template_tabs = '["personal","projects"]'::jsonb
WHERE visible_template_tabs::text LIKE '%business%';

-- Convert any existing 'business' type ventures to 'project'
UPDATE public.user_ventures 
SET type = 'project' 
WHERE type = 'business';