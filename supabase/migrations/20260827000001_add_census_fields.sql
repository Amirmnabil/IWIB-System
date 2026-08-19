-- Migration to add new census fields to policy_members and census_members tables

-- 1. policy_members table
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS full_name_arabic TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS principle_id TEXT;

-- 2. census_members table
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS full_name_arabic TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS principle_id TEXT;
