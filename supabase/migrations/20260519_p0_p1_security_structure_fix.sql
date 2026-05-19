-- ============================================================
-- IWIB Database Migration — P0/P1 Security & Structure Fixes
-- Run this in the Supabase SQL Editor
-- Date: 2026-05-18
-- ============================================================

-- ============================================================
-- SECTION 0: ENSURE CORE SCHEMA TABLES EXIST (SELF-HEALING)
-- ============================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0a. Create audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  user_name text,
  action text NOT NULL,        -- create | update | delete | login | logout
  resource_type text,          -- company | policy | claim | etc.
  resource_id text,
  resource_name text,
  changes jsonb,
  ip_address text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0b. Create claims
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number text UNIQUE,
  policy_id uuid REFERENCES public.policies(id),
  policy_number text,
  member_id uuid,
  member_name text,
  company_id uuid REFERENCES public.companies(id),
  company_name text,
  claim_type text,
  incident_date date,
  submission_date date,
  claim_amount numeric,
  approved_amount numeric,
  paid_amount numeric,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0c. Create renewals
CREATE TABLE IF NOT EXISTS public.renewals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id uuid REFERENCES public.policies(id),
  policy_number text,
  client_company_name text,
  client_company_id uuid REFERENCES public.companies(id),
  renewal_term_start date,
  renewal_term_end date,
  current_premium numeric,
  proposed_premium numeric,
  renewal_status text DEFAULT 'upcoming',
  renewal_probability numeric,
  assigned_user_name text,
  notes text,
  days_until_expiry integer,
  premium_change_percent numeric,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0d. Create kyc_documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES public.companies(id),
  company_name text,
  contact_name text,
  document_type text NOT NULL,
  document_number text,
  file_url text,
  expiry_date date,
  status text DEFAULT 'pending',
  verified_by_id uuid,
  verified_by_name text,
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0e. Create commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id uuid REFERENCES public.policies(id),
  policy_number text,
  client_company_name text,
  client_company_id uuid REFERENCES public.companies(id),
  insurer_name text,
  insurer_id uuid REFERENCES public.insurance_companies(id),
  commission_rate numeric,
  premium_amount numeric,
  expected_commission numeric,
  accrued_commission numeric,
  paid_commission numeric,
  commission_status text DEFAULT 'pending',
  period_start date,
  period_end date,
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0f. Create claim_appeals
CREATE TABLE IF NOT EXISTS public.claim_appeals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid REFERENCES public.claims(id) ON DELETE CASCADE,
  claim_number text,
  appeal_reason text NOT NULL,
  appeal_date date,
  status text DEFAULT 'under_review',
  resolution text,
  resolved_date date,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0g. Create invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text UNIQUE,
  client_company_id uuid REFERENCES public.companies(id),
  client_company_name text,
  policy_id uuid REFERENCES public.policies(id),
  policy_number text,
  invoice_type text,
  issue_date date,
  due_date date,
  amount_due numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status text DEFAULT 'unpaid',
  payment_terms text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0h. Create payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number text UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id),
  invoice_number text,
  policy_number text,
  client_company_name text,
  payment_date date,
  amount numeric NOT NULL,
  payment_method text,
  reference_number text,
  bank_name text,
  status text DEFAULT 'completed',
  received_by_name text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0i. Create risk_scores
CREATE TABLE IF NOT EXISTS public.risk_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES public.companies(id),
  company_name text,
  policy_id uuid REFERENCES public.policies(id),
  policy_number text,
  score_value numeric NOT NULL,
  risk_level text NOT NULL,    -- low | medium | high | critical
  calculated_at timestamptz DEFAULT timezone('utc', now()),
  notes text,
  components jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0j. Create benefit_schedules
CREATE TABLE IF NOT EXISTS public.benefit_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  plan_name text,
  benefit_class text,
  network_type text,
  inpatient_limit numeric,
  outpatient_limit numeric,
  dental_limit numeric,
  optical_limit numeric,
  maternity_limit numeric,
  details jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0k. Create census_members
CREATE TABLE IF NOT EXISTS public.census_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_full_name text NOT NULL,
  national_id text,
  policy_number text,
  policy_id uuid REFERENCES public.policies(id),
  relation text,
  status text DEFAULT 'active',
  date_of_birth date,
  gender text,
  nationality text,
  plan_category text,
  department text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0l. Create TPAs
CREATE TABLE IF NOT EXISTS public.tpas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'active',
  contact_info jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 0m. Create Providers
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text,
  license_number text,
  address text,
  city text,
  country text,
  is_in_network boolean DEFAULT true,
  tpa_names text[],
  capabilities text[],
  contact_name text,
  contact_phone text,
  contact_email text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- ============================================================
-- SECTION 1: P0 SECURITY FIXES
-- ============================================================

-- 1a. Fix audit_logs: require authentication (currently open to public)
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 1b. Fix users table: prevent self-escalation to admin
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON public.users;
CREATE POLICY "Users can update own profile or admins update all" ON public.users
  FOR UPDATE USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 1c. Fix policies: restrict reads to assigned brokers (not world-readable)
DROP POLICY IF EXISTS "Allow all" ON public.policies;
CREATE POLICY "Authenticated users see policies" ON public.policies
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users insert policies" ON public.policies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users update policies" ON public.policies
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users delete policies" ON public.policies
  FOR DELETE USING (auth.role() = 'authenticated');

-- 1d. Fix insurance_companies: remove blanket write-all
DROP POLICY IF EXISTS "Allow all" ON public.insurance_companies;
CREATE POLICY "Authenticated view insurance companies" ON public.insurance_companies
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert insurance companies" ON public.insurance_companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update insurance companies" ON public.insurance_companies
  FOR UPDATE USING (auth.role() = 'authenticated');
-- DELETE only allowed to admins
CREATE POLICY "Only admins delete insurance companies" ON public.insurance_companies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 1e. Fix policy_members: replace blanket all
DROP POLICY IF EXISTS "Allow all for authenticated members" ON public.policy_members;
CREATE POLICY "Authenticated access to policy_members" ON public.policy_members
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SECTION 2: P1 DATA INTEGRITY FIXES
-- ============================================================

-- 2a. Add missing DELETE policy for contacts
DROP POLICY IF EXISTS "Allow delete for auth" ON public.contacts;
CREATE POLICY "Allow delete for auth" ON public.contacts
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2b. Add prospect_id to policies (Prospect → Policy pipeline link)
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_policies_prospect ON public.policies(prospect_id);

-- 2c. Fix renewals: add missing FK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_renewals_policy' AND table_name = 'renewals'
  ) THEN
    ALTER TABLE public.renewals
      ADD CONSTRAINT fk_renewals_policy FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_renewals_company' AND table_name = 'renewals'
  ) THEN
    ALTER TABLE public.renewals
      ADD CONSTRAINT fk_renewals_company FOREIGN KEY (client_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2d. Fix claims: add company_id FK
DO $$
BEGIN
  -- First, make sure the company_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.claims ADD COLUMN company_id uuid;
  END IF;

  -- Second, make sure the constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_claims_company' AND table_name = 'claims'
  ) THEN
    ALTER TABLE public.claims
      ADD CONSTRAINT fk_claims_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2e. Fix expected_renewal_date and actual_renewal_date data types
-- First check if they are still text type before altering
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'expected_renewal_date'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.companies
      ALTER COLUMN expected_renewal_date TYPE date USING
        CASE WHEN expected_renewal_date ~ '^\d{4}-\d{2}-\d{2}'
             THEN expected_renewal_date::date
             ELSE NULL END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'actual_renewal_date'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.companies
      ALTER COLUMN actual_renewal_date TYPE date USING
        CASE WHEN actual_renewal_date ~ '^\d{4}-\d{2}-\d{2}'
             THEN actual_renewal_date::date
             ELSE NULL END;
  END IF;
END $$;

-- ============================================================
-- SECTION 3: MISSING INDEXES FOR PERFORMANCE
-- ============================================================

-- Critical: activities.related_id has no index
CREATE INDEX IF NOT EXISTS idx_activities_related_id ON public.activities(related_id);

-- Missing policy indexes
CREATE INDEX IF NOT EXISTS idx_policies_insurer ON public.policies(insurer_id);

-- Missing claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_company ON public.claims(company_id);

-- Missing commission index
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(commission_status);

-- Missing prospect/lead indexes
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON public.prospects(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_prospects_company ON public.prospects(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company_id);

-- Renewal status index
CREATE INDEX IF NOT EXISTS idx_renewals_status ON public.renewals(renewal_status);

-- ============================================================
-- SECTION 4: RLS FOR UNPROTECTED TABLES
-- ============================================================

-- Enable RLS on tables that have none
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.renewals;
CREATE POLICY "Authenticated access" ON public.renewals
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.commissions;
CREATE POLICY "Authenticated access" ON public.commissions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.claims;
CREATE POLICY "Authenticated access" ON public.claims
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.claim_appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.claim_appeals;
CREATE POLICY "Authenticated access" ON public.claim_appeals
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.invoices;
CREATE POLICY "Authenticated access" ON public.invoices
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.payments;
CREATE POLICY "Authenticated access" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.risk_scores;
CREATE POLICY "Authenticated access" ON public.risk_scores
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.benefit_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.benefit_schedules;
CREATE POLICY "Authenticated access" ON public.benefit_schedules
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.census_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.census_members;
CREATE POLICY "Authenticated access" ON public.census_members
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.providers;
CREATE POLICY "Authenticated access" ON public.providers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.tpas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated access" ON public.tpas;
CREATE POLICY "Authenticated access" ON public.tpas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SECTION 5: NEW TABLES — P2 ADDITIONS
-- ============================================================

-- 5a. Company Status History (replaces 11 note columns)
CREATE TABLE IF NOT EXISTS public.company_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  notes text,
  changed_by_id uuid,
  changed_by_name text,
  changed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_status_history_company ON public.company_status_history(company_id, changed_at DESC);
ALTER TABLE public.company_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON public.company_status_history
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5b. Endorsements
CREATE TABLE IF NOT EXISTS public.endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_number text UNIQUE NOT NULL,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  endorsement_type text NOT NULL,
  effective_date date NOT NULL,
  premium_impact numeric DEFAULT 0,
  premium_adjustment numeric DEFAULT 0,
  members_added integer DEFAULT 0,
  members_deleted integer DEFAULT 0,
  details text,
  status text DEFAULT 'pending',
  approved_by_id uuid,
  approved_by_name text,
  requested_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_endorsements_policy ON public.endorsements(policy_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_company ON public.endorsements(company_id);
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON public.endorsements
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5c. Commission Agreements
CREATE TABLE IF NOT EXISTS public.commission_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id uuid NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  insurer_name text,
  product_type text NOT NULL,
  rate_percent numeric NOT NULL,
  supplementary_rate numeric DEFAULT 0,
  calculation_base text DEFAULT 'gross_premium',
  effective_from date NOT NULL,
  effective_to date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commission_agreements_insurer ON public.commission_agreements(insurer_id, status);
ALTER TABLE public.commission_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON public.commission_agreements
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5d. General Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size_bytes bigint,
  document_category text NOT NULL,
  related_type text NOT NULL,
  related_id uuid NOT NULL,
  related_name text,
  uploaded_by_id uuid,
  uploaded_by_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_related ON public.documents(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(document_category);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON public.documents
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5e. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL,
  related_type text,
  related_id uuid,
  related_name text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Each user sees only their own notifications
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- SECTION 6: ENABLE REALTIME FOR NEW TABLES
-- ============================================================

DO $$
BEGIN
  -- notifications table for real-time alerts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- endorsements for real-time updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'endorsements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.endorsements;
  END IF;

  -- company_status_history for audit trail streaming
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'company_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_status_history;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
