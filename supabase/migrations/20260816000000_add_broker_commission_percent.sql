-- Add missing broker_commission_percent column to policies table
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS broker_commission_percent NUMERIC DEFAULT 0;
