-- Migration: Table of Benefits Module Schema and Seed Data
-- Date: 2026-09-06

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.benefit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benefit_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.benefit_categories(id) ON DELETE RESTRICT,
  parent_benefit_id UUID REFERENCES public.benefit_definitions(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tier_name_ar TEXT NOT NULL,
  tier_name_en TEXT NOT NULL,
  annual_aggregate_limit_value NUMERIC,
  annual_aggregate_limit_currency TEXT NOT NULL DEFAULT 'EGP',
  regional_scope TEXT NOT NULL CHECK (regional_scope IN ('local', 'regional', 'worldwide_ex_us', 'worldwide_incl_us')),
  network_id UUID REFERENCES public.medical_networks(id) ON DELETE SET NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('electronic', 'physical', 'both')),
  policy_start_date DATE,
  policy_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.combined_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.plan_tiers(id) ON DELETE CASCADE,
  pool_name_ar TEXT NOT NULL,
  pool_name_en TEXT NOT NULL,
  pool_limit_value NUMERIC NOT NULL,
  pool_limit_currency TEXT NOT NULL DEFAULT 'EGP',
  pool_basis TEXT NOT NULL CHECK (pool_basis IN ('annual', 'per_case')),
  depletion_rule TEXT NOT NULL DEFAULT 'first_come_first_served',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_benefit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.plan_tiers(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES public.benefit_definitions(id) ON DELETE RESTRICT,
  coverage_status TEXT NOT NULL CHECK (coverage_status IN ('covered', 'not_covered', 'partially_covered')),
  limit_type TEXT NOT NULL CHECK (limit_type IN ('included_in_aal', 'sub_limit', 'unlimited', 'per_case')),
  limit_value NUMERIC,
  limit_currency TEXT DEFAULT 'EGP',
  limit_basis TEXT CHECK (limit_basis IN ('annual', 'per_case', 'lifetime', 'per_visit')),
  payment_mechanism TEXT NOT NULL CHECK (payment_mechanism IN ('direct_billing', 'reimbursement', 'both')),
  co_payment_percent NUMERIC DEFAULT 0,
  co_payment_cap NUMERIC,
  deductible_value NUMERIC,
  network_scope TEXT NOT NULL CHECK (network_scope IN ('in_network_only', 'in_and_out_network')),
  waiting_period_days INT DEFAULT 0,
  pre_existing_condition_covered TEXT CHECK (pre_existing_condition_covered IN ('yes', 'no', 'after_waiting_period')),
  requires_pre_authorization BOOLEAN DEFAULT false,
  exclusions_ar TEXT,
  exclusions_en TEXT,
  combined_pool_id UUID REFERENCES public.combined_pools(id) ON DELETE SET NULL,
  doctor_on_site BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tier_id, benefit_id)
);

CREATE TABLE IF NOT EXISTS public.oon_reimbursement_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_benefit_config_id UUID NOT NULL REFERENCES public.plan_benefit_config(id) ON DELETE CASCADE,
  reimbursement_basis TEXT NOT NULL CHECK (reimbursement_basis IN ('actual_invoice_percent', 'reference_tariff_percent')),
  reimbursement_percent NUMERIC NOT NULL,
  reimbursement_cap NUMERIC,
  required_documents_ar TEXT,
  required_documents_en TEXT,
  claim_submission_window_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_on_site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.plan_tiers(id) ON DELETE CASCADE,
  location_ar TEXT,
  location_en TEXT,
  schedule_ar TEXT,
  schedule_en TEXT,
  scope_of_service TEXT CHECK (scope_of_service IN ('general_consultation', 'consultation_plus_basic_meds', 'first_aid')),
  cost_model TEXT CHECK (cost_model IN ('fixed_retainer', 'per_visit')),
  linked_benefit_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Indexes for foreign keys to optimize joins and cascading deletes
CREATE INDEX IF NOT EXISTS idx_benefit_definitions_category ON public.benefit_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_benefit_definitions_parent ON public.benefit_definitions(parent_benefit_id);
CREATE INDEX IF NOT EXISTS idx_plan_tiers_client ON public.plan_tiers(client_id);
CREATE INDEX IF NOT EXISTS idx_plan_tiers_network ON public.plan_tiers(network_id);
CREATE INDEX IF NOT EXISTS idx_combined_pools_tier ON public.combined_pools(tier_id);
CREATE INDEX IF NOT EXISTS idx_plan_benefit_config_tier ON public.plan_benefit_config(tier_id);
CREATE INDEX IF NOT EXISTS idx_plan_benefit_config_benefit ON public.plan_benefit_config(benefit_id);
CREATE INDEX IF NOT EXISTS idx_plan_benefit_config_pool ON public.plan_benefit_config(combined_pool_id);
CREATE INDEX IF NOT EXISTS idx_oon_reimbursement_rules_config ON public.oon_reimbursement_rules(plan_benefit_config_id);
CREATE INDEX IF NOT EXISTS idx_doctor_on_site_tier ON public.doctor_on_site_config(tier_id);

-- 3. Setup Triggers for update times
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'benefit_categories', 'benefit_definitions', 'medical_networks',
    'plan_tiers', 'combined_pools', 'plan_benefit_config',
    'oon_reimbursement_rules', 'doctor_on_site_config'
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.benefit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combined_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_benefit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oon_reimbursement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_on_site_config ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies

-- Public / Authenticated READ access for lookup/configuration catalogs
CREATE POLICY "Select policy for benefit_categories" ON public.benefit_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write policy for benefit_categories" ON public.benefit_categories
  FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Select policy for benefit_definitions" ON public.benefit_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write policy for benefit_definitions" ON public.benefit_definitions
  FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Select policy for medical_networks" ON public.medical_networks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write policy for medical_networks" ON public.medical_networks
  FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

-- Tier Policies (Access based on Admin OR Client Company connection)
CREATE POLICY "Select policy for plan_tiers" ON public.plan_tiers FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_id = public.get_auth_user_company_id() OR client_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);
CREATE POLICY "Write policy for plan_tiers" ON public.plan_tiers FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR client_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
) WITH CHECK (
  public.is_admin_or_manager() OR client_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- Child tables policies based on tier_id visibility
CREATE POLICY "Select policy for combined_pools" ON public.combined_pools FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.plan_tiers WHERE id = tier_id));
CREATE POLICY "Write policy for combined_pools" ON public.combined_pools FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR EXISTS (
    SELECT 1 FROM public.plan_tiers WHERE id = tier_id AND client_id IN (
      SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "Select policy for plan_benefit_config" ON public.plan_benefit_config FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.plan_tiers WHERE id = tier_id));
CREATE POLICY "Write policy for plan_benefit_config" ON public.plan_benefit_config FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR EXISTS (
    SELECT 1 FROM public.plan_tiers WHERE id = tier_id AND client_id IN (
      SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "Select policy for oon_reimbursement_rules" ON public.oon_reimbursement_rules FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.plan_benefit_config WHERE id = plan_benefit_config_id));
CREATE POLICY "Write policy for oon_reimbursement_rules" ON public.oon_reimbursement_rules FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR EXISTS (
    SELECT 1 FROM public.plan_benefit_config pbc
    JOIN public.plan_tiers t ON pbc.tier_id = t.id
    WHERE pbc.id = plan_benefit_config_id AND t.client_id IN (
      SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "Select policy for doctor_on_site_config" ON public.doctor_on_site_config FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.plan_tiers WHERE id = tier_id));
CREATE POLICY "Write policy for doctor_on_site_config" ON public.doctor_on_site_config FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR EXISTS (
    SELECT 1 FROM public.plan_tiers WHERE id = tier_id AND client_id IN (
      SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
    )
  )
);

-- 6. Link policies table to plan_tiers (backward-compatible update for policy benefit schedule selection)
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_benefit_schedule_id_fkey;
ALTER TABLE public.policies ADD CONSTRAINT policies_benefit_schedule_id_fkey FOREIGN KEY (benefit_schedule_id) REFERENCES public.plan_tiers(id) ON DELETE SET NULL;

-- 7. Seed Initial Master/Reference Data
DO $$
DECLARE
  v_inpatient_id UUID;
  v_outpatient_id UUID;
  v_maternity_id UUID;
  v_dental_id UUID;
  v_optical_id UUID;
  
  v_surg_id UUID;
BEGIN
  -- Clear existing lookup seeds if they conflict (in new tables)
  DELETE FROM public.benefit_categories;
  DELETE FROM public.medical_networks;

  -- 1. Benefit Categories
  INSERT INTO public.benefit_categories (id, name_en, name_ar, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Inpatient Services', 'علاج داخلي بالمستشفى', 1),
    ('00000000-0000-0000-0000-000000000002', 'Outpatient Services', 'عيادات خارجية', 2),
    ('00000000-0000-0000-0000-000000000003', 'Maternity Care', 'حمل وولادة', 3),
    ('00000000-0000-0000-0000-000000000004', 'Dental Services', 'أسنان', 4),
    ('00000000-0000-0000-0000-000000000005', 'Optical Services', 'نظارات طبية', 5);

  -- 2. Benefit Definitions (Inpatient)
  INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Room Accommodation & Nursing', 'الإقامة بالمسشتفى والتمريض', 1),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ICU Stay & Intensive Care', 'الإقامة بالعناية المركزة', 2),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Surgical Procedures & Theater Fees', 'العمليات الجراحية وغرفة العمليات', 3);

  -- Sub-items under Surgical Procedures (Parent/Child relation)
  INSERT INTO public.benefit_definitions (id, category_id, parent_benefit_id, name_en, name_ar, sort_order) VALUES
    ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Operating Theater Charges', 'تكاليف غرفة العمليات', 1),
    ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Surgeon & Anesthesiologist Fees', 'أتعاب الجراح وطبيب التخدير', 2),
    ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Medications & Surgical Supplies', 'الأدوية والمستلزمات الطبية الجراحية', 3);

  -- Outpatient Definitions
  INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Physician Consultation', 'كشف الطبيب / الاستشارات', 1),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Prescribed Pharmaceuticals', 'الأدوية الموصوفة', 2),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Diagnostic Labs & Tests', 'التحاليل الطبية والمختبرات', 3),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Diagnostic Radiology & Scans (X-ray, MRI, CT)', 'الأشعة التشخيصية ورنين ومقطعية', 4);

  -- Maternity Care Definitions
  INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Normal Delivery Care', 'ولادة طبيعية', 1),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Caesarean Section Delivery', 'ولادة قيصرية', 2),
    ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Antenatal Consultations & Ultrasounds', 'متابعة الحمل والسونار', 3);

  -- Dental Services Definitions
  INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Routine Examination & Cleaning', 'تنظيف وفحص دوري للأسنان', 1),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Restorations, Fillings & Extractions', 'حشو وخلع الأسنان', 2);

  -- Optical Services Definitions
  INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'Medical Spectacle Frames & Lenses', 'شراء الإطارات والعدسات الطبية', 1);

  -- 3. Medical Networks Seeds
  INSERT INTO public.medical_networks (name_en, name_ar, is_active) VALUES
    ('Prime Network A', 'الشبكة الطبية المتميزة أ', true),
    ('Standard Network B', 'الشبكة الطبية العادية ب', true),
    ('Global Elite Worldwide', 'الشبكة العالمية النخبة', true);

END $$;
