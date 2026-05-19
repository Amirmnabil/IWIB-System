-- Migration: Add Level (Seniority) hierarchy field to public.users table and guarantee leads columns
-- Also forces a reload of the PostgREST Supabase API Schema cache.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level text DEFAULT NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_user_name text DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_user_id uuid DEFAULT NULL;

-- Force Supabase to reload its API schema cache immediately
NOTIFY pgrst, 'reload schema';
