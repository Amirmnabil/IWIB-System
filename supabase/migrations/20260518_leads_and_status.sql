-- Migration: Add company status/priority fields & create leads table with unique constraints

-- 1. Ensure company status and priority columns exist in the companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text DEFAULT 'interested';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- 2. Create leads table if not exists with standard fields
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id uuid,
    company_name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    status text DEFAULT 'new',
    priority text DEFAULT 'medium',
    last_activity text,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    
    -- 4. Enforce strict database integrity: No duplicate leads per company
    CONSTRAINT unique_lead_per_company UNIQUE (company_id)
);

-- 3. Indexes to boost query performance on key filters
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_priority ON public.companies(priority);
