-- ========================================================================================
-- 20260524235959_master_architecture_rebuild.sql
-- Description: Complete Database Architecture Rebuild & Data Preservation
-- ========================================================================================

-- 1. CLEANUP & ANALYSIS (Safely Backup Existing Data)
CREATE SCHEMA IF NOT EXISTS backup_schema;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users', 'profiles', 'master_industries', 'master_pipeline_stages', 'master_product_types',
        'insurance_companies', 'tpas', 'providers', 'companies', 'contacts', 'contact_roles',
        'contact_role_links', 'leads', 'prospects', 'activities', 'policies', 'policy_members',
        'sme_plans', 'sme_premiums', 'sme_quotations', 'census_members', 'benefit_schedules',
        'claims', 'claim_appeals', 'invoices', 'payments', 'commissions', 'renewals',
        'kyc_documents', 'audit_logs', 'risk_scores'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'backup_schema' AND table_name = t) THEN
                EXECUTE format('ALTER TABLE backup_schema.%I RENAME TO %I;', t, t || '_old_' || to_char(now(), 'YYYYMMDDHH24MISS'));
            END IF;
            -- Create a flat copy to avoid index/constraint name collisions in backup_schema
            EXECUTE format('CREATE TABLE backup_schema.%I AS SELECT * FROM public.%I;', t, t);
            EXECUTE format('DROP TABLE public.%I CASCADE;', t);
        END IF;
    END LOOP;
END $$;

-- 2. FUNCTIONS & TRIGGERS
-- Automatic updated_at timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. SCHEMA CREATION (Core & Master Data)
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE,
  role text DEFAULT 'User',
  department text,
  level text,
  status text DEFAULT 'active',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.master_industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_en text,
  name_ar text,
  subcategory_en text,
  subcategory_ar text,
  category text,
  category_en text,
  category_ar text,
  code text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.master_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  "order" integer,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.master_product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name_en text NOT NULL,
  role_name_ar text NOT NULL,
  role_category text CHECK (role_category IN ('Client', 'Insurer', 'TPA', 'Provider')) NOT NULL,
  sub_role_en text,
  sub_role_ar text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyName" text NOT NULL,
  "companyCode" text,
  "companyType" text DEFAULT 'Investment',
  status text DEFAULT 'Active',
  logo_url text,
  contact_info jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.tpas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'active',
  contact_info jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- CRM Data
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  name_ar text,
  status text DEFAULT 'interested',
  industry text,
  employee_count integer,
  priority text DEFAULT 'medium',
  city text,
  address text,
  cr_number text,
  tax_card text,
  current_insurer text,
  insurance_type text DEFAULT 'Medical',
  medical_subtype text,
  checklist_status jsonb,
  checklist_completion text DEFAULT 'Pending',
  expected_renewal_date text,
  expected_offer_date text,
  actual_renewal_date text,
  actual_offer_date text,
  website text,
  linkedin_page text,
  landline text,
  assigned_user_id text,
  assigned_user_name text,
  source text,
  last_contact_date timestamptz,
  call_date timestamptz,
  follow_up_date timestamptz,
  renewal_month text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  job_title text,
  role_id uuid REFERENCES public.contact_roles(id) ON DELETE SET NULL,
  preferred_contact_method text DEFAULT 'Email',
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  status text DEFAULT 'new',
  lead_source text,
  priority text DEFAULT 'medium',
  estimated_premium numeric,
  next_follow_up timestamptz,
  assigned_user_name text,
  assigned_user_id uuid,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  pipeline_stage text DEFAULT 'qualification',
  probability numeric DEFAULT 50,
  estimated_value numeric DEFAULT 0,
  expected_close_date date,
  assigned_user_name text,
  assigned_user_id uuid,
  current_insurer text,
  current_tpa text,
  requested_products text[],
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  subject text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  due_date timestamptz,
  end_date timestamptz,
  related_type text,
  related_id uuid,
  related_name text,
  assigned_to_name text,
  assigned_to_id uuid,
  result text,
  duration_minutes integer,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Policies & Underwriting
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text UNIQUE,
  client_company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  client_company_name text,
  insurer_id uuid REFERENCES public.insurance_companies(id) ON DELETE RESTRICT,
  insurer_name text,
  tpa_id uuid REFERENCES public.tpas(id) ON DELETE RESTRICT,
  tpa_name text,
  policy_type text,
  start_date date,
  end_date date,
  premium_total numeric,
  premium_gross numeric,
  contract_net numeric,
  fee_percent numeric,
  insurer_account_managers jsonb,
  sales_person text,
  iwib_account_manager_id uuid,
  iwib_account_manager_name text,
  contract_document_url text,
  related_documents jsonb,
  policy_status text DEFAULT 'active',
  member_count integer,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.policy_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_code text,
  staff_code text,
  date_of_birth date,
  gender text,
  relation text,
  nationality text,
  national_id text,
  plan_category text,
  location text,
  department text,
  job_title text,
  premium numeric,
  addition_date date,
  deletion_date date,
  mobile_number text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.sme_plans (
  id text PRIMARY KEY,
  "Plan ID" text,
  "Company Name" text NOT NULL,
  "Plan Name" text NOT NULL,
  "Life Insurance" text,
  "Annual Coverage Limits" text,
  "TPA" text,
  "Network" text,
  "Accommodation" text,
  "Inpatient" text,
  "Consultations" text,
  "Radiology & laboratory" text,
  "Medications" text,
  "Dental" text,
  "Optical" text,
  "Maternity" text,
  "Chronic & Pre-existing" text,
  "COVID-19" text,
  "Out-of-Network Reimbursement" text,
  "Minimum Member Count" numeric,
  "Maximum members count" numeric,
  "Payment terms" text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.sme_premiums (
  id text PRIMARY KEY,
  plan_id text REFERENCES public.sme_plans(id) ON DELETE CASCADE,
  age integer NOT NULL,
  emp numeric NOT NULL,
  spouse numeric NOT NULL,
  child numeric NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.sme_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  selected_plan_ids text[],
  census_snapshot jsonb,
  total_premium numeric,
  status text DEFAULT 'draft',
  user_id uuid,
  user_name text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.census_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_full_name text NOT NULL,
  national_id text,
  policy_number text,
  policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL,
  relation text,
  status text DEFAULT 'active',
  date_of_birth date,
  gender text,
  nationality text,
  plan_category text,
  department text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.benefit_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE,
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number text,
  member_id uuid,
  member_name text,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  claim_type text,
  incident_date date,
  submission_date date,
  claim_amount numeric,
  approved_amount numeric,
  paid_amount numeric,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.claim_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES public.claims(id) ON DELETE CASCADE,
  claim_number text,
  appeal_reason text NOT NULL,
  appeal_date date,
  status text DEFAULT 'under_review',
  resolution text,
  resolved_date date,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  client_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_name text,
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number text,
  client_company_name text,
  client_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  insurer_name text,
  insurer_id uuid REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number text,
  client_company_name text,
  client_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  resource_name text,
  changes jsonb,
  ip_address text,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number text,
  score_value numeric NOT NULL,
  risk_level text NOT NULL,
  calculated_at timestamptz DEFAULT timezone('utc', now()),
  notes text,
  components jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Apply Updated At Triggers
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'profiles', 'master_industries', 'master_pipeline_stages', 'master_product_types',
    'contact_roles', 'insurance_companies', 'tpas', 'providers', 'companies', 'contacts',
    'leads', 'prospects', 'activities', 'policies', 'policy_members', 'sme_plans',
    'sme_premiums', 'sme_quotations', 'census_members', 'benefit_schedules', 'claims',
    'claim_appeals', 'invoices', 'payments', 'commissions', 'renewals', 'kyc_documents',
    'audit_logs', 'risk_scores'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_public_%I_updated_at ON public.%I;
      CREATE TRIGGER set_public_%I_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- 4. DATA MIGRATION (Restore from backup)
-- Helper function to safely cast legacy text values to UUID
CREATE OR REPLACE FUNCTION public.safe_cast_uuid(text_val text) RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(text_val, '')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safely copy data back if it existed in the backup schema using dynamic column intersection.
DO $$
DECLARE
    t text;
    cols text;
    select_cols text;
    where_clause text;
    tables text[] := ARRAY[
        'users', 'profiles', 'master_industries', 'master_pipeline_stages', 'master_product_types',
        'contact_roles', 'insurance_companies', 'tpas', 'providers', 'companies', 'contacts',
        'leads', 'prospects', 'activities', 'policies', 'policy_members', 'sme_plans',
        'sme_premiums', 'sme_quotations', 'census_members', 'benefit_schedules', 'claims',
        'claim_appeals', 'invoices', 'payments', 'commissions', 'renewals', 'kyc_documents',
        'audit_logs', 'risk_scores'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'backup_schema' AND table_name = t) THEN
            
            -- Insert columns mapping
            SELECT string_agg(quote_ident(column_name), ', ' ORDER BY column_name) INTO cols
            FROM information_schema.columns
            WHERE table_schema = 'backup_schema' AND table_name = t
              AND column_name IN (
                  SELECT column_name FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = t 
                    AND is_generated = 'NEVER'
              );

            -- Select columns mapping with safe type coercion
            SELECT string_agg(
                CASE 
                    WHEN c2.data_type = 'uuid' THEN 'public.safe_cast_uuid(' || quote_ident(c1.column_name) || '::text)'
                    ELSE quote_ident(c1.column_name)
                END, ', ' ORDER BY c1.column_name
            ) INTO select_cols
            FROM information_schema.columns c1
            JOIN information_schema.columns c2 ON c1.column_name = c2.column_name AND c2.table_schema = 'public' AND c2.table_name = t
            WHERE c1.table_schema = 'backup_schema' AND c1.table_name = t
              AND c2.is_generated = 'NEVER';

            IF cols IS NOT NULL AND cols != '' THEN
                where_clause := '';
                
                IF t IN ('master_industries', 'master_pipeline_stages', 'master_product_types', 'tpas', 'companies') THEN
                    where_clause := 'WHERE name IS NOT NULL';
                ELSIF t = 'insurance_companies' THEN
                    where_clause := 'WHERE "companyName" IS NOT NULL';
                ELSIF t = 'contact_roles' THEN
                    where_clause := 'WHERE role_name_en IS NOT NULL AND role_name_ar IS NOT NULL AND role_category IS NOT NULL';
                ELSIF t = 'contacts' THEN
                    where_clause := 'WHERE first_name IS NOT NULL AND last_name IS NOT NULL';
                ELSIF t = 'leads' THEN
                    where_clause := 'WHERE company_name IS NOT NULL';
                END IF;

                EXECUTE format('
                    INSERT INTO public.%I (%s)
                    SELECT %s FROM backup_schema.%I
                    %s
                    ON CONFLICT (id) DO NOTHING;
                ', t, cols, select_cols, t, where_clause);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. ROW LEVEL SECURITY (RLS) & POLICIES
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'profiles', 'master_industries', 'master_pipeline_stages', 'master_product_types',
    'contact_roles', 'insurance_companies', 'tpas', 'providers', 'companies', 'contacts',
    'leads', 'prospects', 'activities', 'policies', 'policy_members', 'sme_plans',
    'sme_premiums', 'sme_quotations', 'census_members', 'benefit_schedules', 'claims',
    'claim_appeals', 'invoices', 'payments', 'commissions', 'renewals', 'kyc_documents',
    'audit_logs', 'risk_scores'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.%I;', t);
    
    EXECUTE format('
      CREATE POLICY "Enable full access for authenticated users" 
      ON public.%I FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_assigned_user ON public.companies(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_policies_client ON public.policies(client_company_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(policy_status);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON public.policies(end_date);
CREATE INDEX IF NOT EXISTS idx_claims_policy ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON public.activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON public.activities(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_renewals_term_end ON public.renewals(renewal_term_end);
CREATE INDEX IF NOT EXISTS idx_commissions_policy ON public.commissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(client_company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_sme_premiums_plan ON public.sme_premiums(plan_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_company ON public.risk_scores(company_id);

-- 7. RESTORE ADMIN ACCESS
-- Forcefully grant is_admin true to any user explicitly marked as an admin
UPDATE public.users SET is_admin = true WHERE role ILIKE 'admin';

-- Explicitly grant Super Admin privileges to the system owner
UPDATE public.users SET is_admin = true, role = 'Admin' WHERE email ILIKE 'amir.nabil@iwib-eg.com';
