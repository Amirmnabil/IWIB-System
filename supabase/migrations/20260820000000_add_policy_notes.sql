-- Add missing notes column to policies table
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS notes TEXT;
