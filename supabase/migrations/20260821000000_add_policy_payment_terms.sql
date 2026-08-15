-- Add missing payment_terms column to policies table
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'annual';
