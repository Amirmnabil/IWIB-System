-- Add missing taxes_percent column to policies table
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS taxes_percent NUMERIC DEFAULT 0;
