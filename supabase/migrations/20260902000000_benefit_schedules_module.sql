-- Migration: Benefit Schedules and Plan Linkages
-- Date: 2026-09-02

-- 1. Alter policies to link with benefit schedules
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS benefit_schedule_id UUID REFERENCES public.benefit_schedules(id) ON DELETE SET NULL;

-- 2. Alter benefit_schedules to add annual_limit, insurer_id, and insurer_name
ALTER TABLE public.benefit_schedules ADD COLUMN IF NOT EXISTS annual_limit numeric;
ALTER TABLE public.benefit_schedules ADD COLUMN IF NOT EXISTS insurer_id UUID REFERENCES public.insurance_companies(id) ON DELETE SET NULL;
ALTER TABLE public.benefit_schedules ADD COLUMN IF NOT EXISTS insurer_name TEXT;

-- 2. Create Lookup Tables for Benefit Master Data
CREATE TABLE IF NOT EXISTS public.master_benefit_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT
);

CREATE TABLE IF NOT EXISTS public.master_coverage_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT
);

CREATE TABLE IF NOT EXISTS public.master_eligibility_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT
);

CREATE TABLE IF NOT EXISTS public.master_rule_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT
);

-- 3. Seed Lookup Data
INSERT INTO public.master_benefit_categories (code, name, name_ar) VALUES
  ('INPATIENT', 'Inpatient', 'علاج داخلي'),
  ('OUTPATIENT', 'Outpatient', 'علاج خارجي'),
  ('CHRONIC', 'Chronic Conditions', 'أمراض مزمنة'),
  ('PRE_EXISTING', 'Pre-existing Conditions', 'حالات سابقة على التعاقد'),
  ('MATERNITY', 'Maternity', 'حمل وولادة'),
  ('DENTAL', 'Dental', 'أسنان'),
  ('OPTICAL', 'Optical', 'نظارات'),
  ('EMERGENCY', 'Emergency', 'طوارئ'),
  ('ADDITIONAL_SERVICES', 'Additional Services', 'خدمات إضافية')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar;

INSERT INTO public.master_coverage_types (code, name, name_ar) VALUES
  ('FULL', 'Full Coverage', 'تغطية كاملة'),
  ('PERCENTAGE', 'Percentage', 'نسبة مئوية'),
  ('LIMIT', 'Limit Value', 'حد أقصى')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar;

INSERT INTO public.master_eligibility_types (code, name, name_ar) VALUES
  ('ALL', 'All Employees', 'كل الموظفين'),
  ('PERCENTAGE', 'Percentage of Employees', 'نسبة مئوية من الموظفين'),
  ('FIXED_COUNT', 'Fixed Count of Employees', 'عدد محدد من الموظفين')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar;

INSERT INTO public.master_rule_types (code, name, name_ar) VALUES
  ('PRE_APPROVAL', 'Requires Pre-approval', 'يتطلب موافقة مسبقة'),
  ('WAITING_PERIOD', 'Waiting Period', 'فترة انتظار'),
  ('MAX_USAGE', 'Maximum Usage Limits', 'الحد الأقصى للاستخدام')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar;

-- 4. Enable RLS and setup authenticated policies
ALTER TABLE public.master_benefit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_coverage_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_eligibility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_rule_types ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'master_benefit_categories',
    'master_coverage_types',
    'master_eligibility_types',
    'master_rule_types'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS "Authenticated users can select" ON public.%I', tbl);
    EXECUTE FORMAT('CREATE POLICY "Authenticated users can select" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')', tbl);
    
    EXECUTE FORMAT('DROP POLICY IF EXISTS "Authenticated users can insert" ON public.%I', tbl);
    EXECUTE FORMAT('CREATE POLICY "Authenticated users can insert" ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', tbl);
    
    EXECUTE FORMAT('DROP POLICY IF EXISTS "Authenticated users can update" ON public.%I', tbl);
    EXECUTE FORMAT('CREATE POLICY "Authenticated users can update" ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'')', tbl);
    
    EXECUTE FORMAT('DROP POLICY IF EXISTS "Authenticated users can delete" ON public.%I', tbl);
    EXECUTE FORMAT('CREATE POLICY "Authenticated users can delete" ON public.%I FOR DELETE USING (auth.role() = ''authenticated'')', tbl);
  END LOOP;
END $$;
