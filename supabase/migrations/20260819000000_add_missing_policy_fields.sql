-- Add all missing policy enhancement columns to policies table
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS insurer_policy_number TEXT;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS policy_value NUMERIC DEFAULT 0;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 0;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'percentage';
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS tpa_fee NUMERIC DEFAULT 0;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS tpa_fee_type TEXT DEFAULT 'fixed';
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS medical_brackets JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS tax_override NUMERIC DEFAULT 1;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'Annual';
