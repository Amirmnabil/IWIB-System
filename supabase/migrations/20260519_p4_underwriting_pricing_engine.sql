-- ============================================================
-- PHASE 4: PRODUCTION-GRADE MEDICAL UNDERWRITING ENGINE MIGRATION
-- ============================================================

-- SECTION 1: CREATE CORE TABLES IF NOT EXISTS
-- ------------------------------------------------------------

-- Table for SME Offers (Quotation Requests & Revisions)
CREATE TABLE IF NOT EXISTS public.sme_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  offer_name TEXT NOT NULL,
  selected_plans JSONB NOT NULL, -- Contains planIds, members, snapshots, policyStartDate, cashbackAmount
  comparison_data JSONB,
  total_premium NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT DEFAULT 'issued', -- issued, approved, draft
  pdf_url TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Ensure sme_plans exists and matches the schema
CREATE TABLE IF NOT EXISTS public.sme_plans (
  id TEXT PRIMARY KEY,
  "Plan ID" TEXT,
  "Company Name" TEXT NOT NULL,
  "Plan Name" TEXT NOT NULL,
  "Life Insurance" TEXT,
  "Annual Coverage Limits" TEXT,
  "TPA" TEXT,
  "Network" TEXT,
  "Accommodation" TEXT,
  "Inpatient" TEXT,
  "Consultations" TEXT,
  "Radiology & laboratory" TEXT,
  "Medications" TEXT,
  "Dental" TEXT,
  "Optical" TEXT,
  "Maternity" TEXT,
  "Chronic & Pre-existing" TEXT,
  "COVID-19" TEXT,
  "Out-of-Network Reimbursement" TEXT,
  "Minimum Member Count" NUMERIC,
  "Maximum members count" NUMERIC,
  "Payment terms" TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Ensure sme_premiums exists
CREATE TABLE IF NOT EXISTS public.sme_premiums (
  id TEXT PRIMARY KEY,           -- formatted as {planId}_{age}
  plan_id TEXT REFERENCES public.sme_plans(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  emp NUMERIC NOT NULL,
  spouse NUMERIC NOT NULL,
  child NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- SECTION 2: SECURITY & ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------

ALTER TABLE public.sme_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_premiums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow select for auth" ON public.sme_offers;
DROP POLICY IF EXISTS "Allow insert for auth" ON public.sme_offers;
DROP POLICY IF EXISTS "Allow update for auth" ON public.sme_offers;
DROP POLICY IF EXISTS "Allow delete for auth" ON public.sme_offers;

DROP POLICY IF EXISTS "Allow select for auth" ON public.sme_plans;
DROP POLICY IF EXISTS "Allow select for auth" ON public.sme_premiums;

-- Create Permissive Policies
CREATE POLICY "Allow select for auth" ON public.sme_offers FOR SELECT USING (true);
CREATE POLICY "Allow insert for auth" ON public.sme_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for auth" ON public.sme_offers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for auth" ON public.sme_offers FOR DELETE USING (true);

CREATE POLICY "Allow select for auth" ON public.sme_plans FOR SELECT USING (true);
CREATE POLICY "Allow select for auth" ON public.sme_premiums FOR SELECT USING (true);
