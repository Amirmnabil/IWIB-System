-- ============================================================
-- IWIB CRM — Add Missing company_id Columns to Details Tables
-- Migration File: supabase/migrations/20260723000001_add_missing_company_id_columns.sql
-- ============================================================

-- 1. Alter lead_details to add company_id if it doesn't exist
ALTER TABLE public.lead_details 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Alter prospect_details to add company_id if it doesn't exist
ALTER TABLE public.prospect_details 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Backfill company_id in lead_details from the leads table
UPDATE public.lead_details ld
SET company_id = l.company_id
FROM public.leads l
WHERE ld.lead_id = l.id AND ld.company_id IS NULL;

-- 4. Backfill company_id in prospect_details from the prospects table
UPDATE public.prospect_details pd
SET company_id = p.company_id
FROM public.prospects p
WHERE pd.prospect_id = p.id AND pd.company_id IS NULL;

-- 5. Force schema cache reload in PostgREST by sending a notify signal to pgrst channel
NOTIFY pgrst, 'reload schema';
