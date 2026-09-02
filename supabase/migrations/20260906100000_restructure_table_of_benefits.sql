-- Migration: Restructure Table of Benefits
-- Date: 2026-09-06

-- 1. Alter plan_tiers Table
ALTER TABLE public.plan_tiers ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.plan_tiers ADD COLUMN IF NOT EXISTS referral_letter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.plan_tiers ADD COLUMN IF NOT EXISTS reimbursement_covered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.plan_tiers ADD COLUMN IF NOT EXISTS reimbursement_percent NUMERIC NOT NULL DEFAULT 80;
ALTER TABLE public.plan_tiers ADD COLUMN IF NOT EXISTS reimbursement_price_list_id UUID REFERENCES public.medical_networks(id) ON DELETE SET NULL;

-- 2. Alter plan_benefit_config Table
ALTER TABLE public.plan_benefit_config ADD COLUMN IF NOT EXISTS coverage_scope_type TEXT NOT NULL DEFAULT 'all' CHECK (coverage_scope_type IN ('all', 'count', 'percentage'));
ALTER TABLE public.plan_benefit_config ADD COLUMN IF NOT EXISTS coverage_scope_value NUMERIC;
ALTER TABLE public.plan_benefit_config ADD COLUMN IF NOT EXISTS accommodation_category TEXT CHECK (accommodation_category IN ('suite', 'first_class_single', 'regular_double'));
ALTER TABLE public.plan_benefit_config ADD COLUMN IF NOT EXISTS max_icu_days INT;
ALTER TABLE public.plan_benefit_config ADD COLUMN IF NOT EXISTS special_coverage_type TEXT CHECK (special_coverage_type IN ('full_coverage', 'separate_limit', 'shared_limit_another_benefit', 'uncovered', 'covered_separate_container', 'covered_shared_container'));

-- 3. Restore Policies Relationships (support both benefit_schedule_id (Plan) and plan_tier_id (Tier))
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_benefit_schedule_id_fkey;
ALTER TABLE public.policies ADD CONSTRAINT policies_benefit_schedule_id_fkey FOREIGN KEY (benefit_schedule_id) REFERENCES public.benefit_schedules(id) ON DELETE SET NULL;

ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS plan_tier_id UUID REFERENCES public.plan_tiers(id) ON DELETE SET NULL;

-- 4. Update Terminology (Antenatal Consultations & Ultrasounds -> ANC)
UPDATE public.benefit_definitions 
SET name_en = 'ANC' 
WHERE id = '30000000-0000-0000-0000-000000000003';

-- 5. Seed New Categories and Definitions
INSERT INTO public.benefit_categories (id, name_en, name_ar, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000006', 'Special Conditions', 'الحالات الخاصة', 6),
  ('00000000-0000-0000-0000-000000000007', 'Additional Services', 'منافع إضافية', 7)
ON CONFLICT (id) DO UPDATE SET 
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  sort_order = EXCLUDED.sort_order;

-- Insert New Definitions
INSERT INTO public.benefit_definitions (id, category_id, name_en, name_ar, sort_order) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'Porn Cover', 'تغطية علاج الإدمان الإباحي', 1),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'Chronic Cases', 'الحالات المزمنة', 1),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'Pre-existing Conditions', 'الحالات السابقة للتعاقد', 2),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'Critical Cases', 'الحالات الحرجة', 3)
ON CONFLICT (id) DO UPDATE SET 
  category_id = EXCLUDED.category_id,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  sort_order = EXCLUDED.sort_order;
