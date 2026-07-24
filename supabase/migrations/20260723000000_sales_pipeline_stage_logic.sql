-- ============================================================
-- IWIB CRM — Sales Pipeline Stages & Details Schema
-- Migration File: supabase/migrations/20260723000000_sales_pipeline_stage_logic.sql
-- ============================================================

-- 1. Create Lead Details
CREATE TABLE IF NOT EXISTS public.lead_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_person text,
  phone text,
  email text,
  meeting_date timestamptz,
  requirements text,
  estimated_premium numeric,
  source text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Create Prospect Details
CREATE TABLE IF NOT EXISTS public.prospect_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  proposal_versions jsonb DEFAULT '[]'::jsonb, -- Store pricing/offer variants
  final_premium numeric,
  insurance_company text,
  commission numeric,
  decision_maker text,
  competitors text[],
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Create Deal Outcomes
CREATE TABLE IF NOT EXISTS public.deal_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE UNIQUE,
  outcome text CHECK (outcome IN ('won', 'lost')) NOT NULL,
  reason text, -- Price, Network, Competitor, Other
  details text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.lead_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_outcomes ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Enable all access for authenticated users on lead_details" ON public.lead_details;
CREATE POLICY "Enable all access for authenticated users on lead_details" 
  ON public.lead_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users on prospect_details" ON public.prospect_details;
CREATE POLICY "Enable all access for authenticated users on prospect_details" 
  ON public.prospect_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users on deal_outcomes" ON public.deal_outcomes;
CREATE POLICY "Enable all access for authenticated users on deal_outcomes" 
  ON public.deal_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_lead_details_lead ON public.lead_details(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_details_company ON public.lead_details(company_id);
CREATE INDEX IF NOT EXISTS idx_prospect_details_prospect ON public.prospect_details(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_details_company ON public.prospect_details(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_prospect ON public.deal_outcomes(prospect_id);

-- 7. Safe Data Migration for Existing Records
DO $$
BEGIN
  -- Migrate existing Leads
  INSERT INTO public.lead_details (lead_id, contact_person, phone, email, estimated_premium, source)
  SELECT id, contact_name, phone, email, estimated_premium, lead_source
  FROM public.leads
  ON CONFLICT (lead_id) DO NOTHING;

  -- Migrate existing Prospects
  INSERT INTO public.prospect_details (prospect_id, company_id, final_premium, insurance_company, commission, notes)
  SELECT id, company_id, estimated_value, current_insurer, 0, notes
  FROM public.prospects
  ON CONFLICT (prospect_id) DO NOTHING;
END $$;
