-- Add missing UI fields to census_members table to fix schema cache errors and prevent data loss

ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS insurance_company_code TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS insurance_line TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS member_code TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS member_tpa_code TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS head_family_code TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS salary NUMERIC;
