-- Migration: Update Table of Benefits and Medical Networks Schema & Reference Data
-- Date: 2026-09-07

-- 1. Add auto-code column to medical_networks if not existing
ALTER TABLE public.medical_networks 
ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Update existing Benefit Definitions names for standard naming conventions
UPDATE public.benefit_definitions
SET name_en = 'Consultations', name_ar = 'الكشف'
WHERE LOWER(name_en) IN ('medical examinations', 'medical examination', 'consultations');

UPDATE public.benefit_definitions
SET name_en = 'Laboratory', name_ar = 'التحاليل'
WHERE LOWER(name_en) IN ('medical tests', 'medical test', 'laboratory', 'lab tests');

UPDATE public.benefit_definitions
SET name_en = 'Radiology', name_ar = 'الأشعة'
WHERE LOWER(name_en) IN ('x-rays and diagnostic procedures', 'radiology & diagnostic', 'radiology');

UPDATE public.benefit_definitions
SET name_en = 'Optical', name_ar = 'البصريات والنظارات'
WHERE LOWER(name_en) IN ('eyeglasses', 'optical & vision', 'optical');

-- 3. Deactivate or delete Additional Services category if present
UPDATE public.benefit_categories
SET is_active = false
WHERE LOWER(name_en) IN ('additional services', 'additional service');

-- 4. Ensure Pregnancy & Childbirth Follow Up sub-benefits exist under Maternity category
DO $$
DECLARE
  mat_cat_id UUID;
BEGIN
  SELECT id INTO mat_cat_id FROM public.benefit_categories WHERE LOWER(name_en) LIKE '%maternity%' OR LOWER(name_ar) LIKE '%حمل%' LIMIT 1;
  IF mat_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) LIKE '%anc%' OR LOWER(name_en) LIKE '%antenatal%' AND category_id = mat_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (mat_cat_id, 'ANC (Antenatal Care)', 'متابعة الحمل ANC', 1, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) LIKE '%natural delivery%' AND category_id = mat_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (mat_cat_id, 'Natural Delivery', 'ولادة طبيعية', 2, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) LIKE '%cesarean%' AND category_id = mat_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (mat_cat_id, 'Cesarean Section', 'ولادة قيصرية', 3, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) LIKE '%legal abortion%' AND category_id = mat_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (mat_cat_id, 'Legal Abortion', 'الإجهاض الشرعي', 4, true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) LIKE '%newborn%' AND category_id = mat_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (mat_cat_id, 'Newborn Cover', 'تغطية حديثي الولادة', 5, true);
    END IF;
  END IF;
END $$;

-- 5. Update/Ensure Chronic Conditions under Special Conditions is divided into Chronic Procedures & Chronic Medications
UPDATE public.benefit_definitions
SET name_en = 'Chronic Procedures', name_ar = 'الإجراءات المزمنة'
WHERE LOWER(name_en) IN ('chronic conditions', 'chronic condition', 'chronic cases')
  AND category_id IN (SELECT id FROM public.benefit_categories WHERE LOWER(name_en) LIKE '%special%');

DO $$
DECLARE
  special_cat_id UUID;
BEGIN
  SELECT id INTO special_cat_id FROM public.benefit_categories WHERE LOWER(name_en) LIKE '%special%' LIMIT 1;
  IF special_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) = 'chronic medications' AND category_id = special_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (special_cat_id, 'Chronic Medications', 'الأدوية المزمنة', 95, true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE LOWER(name_en) = 'chronic procedures' AND category_id = special_cat_id) THEN
      INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
      VALUES (special_cat_id, 'Chronic Procedures', 'الإجراءات المزمنة', 94, true);
    END IF;
  END IF;
END $$;

-- 6. Deactivate standalone Chronic Conditions category and non-Special Chronic definitions
UPDATE public.benefit_categories
SET is_active = false
WHERE LOWER(name_en) IN ('chronic conditions', 'chronic condition', 'حالات مزمنة', 'الحالات المزمنة')
  OR id = '00000000-0000-0000-0000-000000000005';

UPDATE public.benefit_definitions
SET is_active = false
WHERE category_id = '00000000-0000-0000-0000-000000000005'
   OR (LOWER(name_en) IN ('chronic conditions', 'chronic condition') AND category_id NOT IN (SELECT id FROM public.benefit_categories WHERE LOWER(name_en) LIKE '%special%'));

-- 7. Restore Dental Care & Optical Care categories and definitions
DO $$
DECLARE
  dental_cat_id UUID;
  optical_cat_id UUID;
BEGIN
  -- Dental Category
  SELECT id INTO dental_cat_id FROM public.benefit_categories 
  WHERE LOWER(name_en) LIKE '%dental%' OR LOWER(name_ar) LIKE '%أسنان%' LIMIT 1;

  IF dental_cat_id IS NULL THEN
    INSERT INTO public.benefit_categories (id, name_en, name_ar, sort_order, is_active)
    VALUES ('00000000-0000-0000-0000-000000000008', 'Dental Care', 'علاج الأسنان', 7, true)
    RETURNING id INTO dental_cat_id;
  ELSE
    UPDATE public.benefit_categories SET name_en = 'Dental Care', name_ar = 'علاج الأسنان', is_active = true WHERE id = dental_cat_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE category_id = dental_cat_id) THEN
    INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
    VALUES (dental_cat_id, 'Dental Treatment', 'علاج الأسنان', 1, true);
  ELSE
    UPDATE public.benefit_definitions SET is_active = true, category_id = dental_cat_id WHERE category_id = dental_cat_id OR LOWER(name_en) LIKE '%dental%';
  END IF;

  -- Optical Category
  SELECT id INTO optical_cat_id FROM public.benefit_categories 
  WHERE LOWER(name_en) LIKE '%optical%' OR LOWER(name_ar) LIKE '%بصريات%' OR LOWER(name_ar) LIKE '%نظارات%' LIMIT 1;

  IF optical_cat_id IS NULL THEN
    INSERT INTO public.benefit_categories (id, name_en, name_ar, sort_order, is_active)
    VALUES ('00000000-0000-0000-0000-000000000009', 'Optical Care', 'البصريات والنظارات', 8, true)
    RETURNING id INTO optical_cat_id;
  ELSE
    UPDATE public.benefit_categories SET name_en = 'Optical Care', name_ar = 'البصريات والنظارات', is_active = true WHERE id = optical_cat_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.benefit_definitions WHERE category_id = optical_cat_id) THEN
    INSERT INTO public.benefit_definitions (category_id, name_en, name_ar, sort_order, is_active)
    VALUES (optical_cat_id, 'Optical', 'البصريات والنظارات', 1, true);
  ELSE
    UPDATE public.benefit_definitions SET is_active = true, category_id = optical_cat_id WHERE category_id = optical_cat_id OR LOWER(name_en) LIKE '%optical%';
  END IF;

END $$;

-- 8. Open RLS policies for Plan Tiers, Benefits, and Pools
DROP POLICY IF EXISTS "Select policy for plan_tiers" ON public.plan_tiers;
CREATE POLICY "Select policy for plan_tiers" ON public.plan_tiers FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Write policy for plan_tiers" ON public.plan_tiers;
CREATE POLICY "Write policy for plan_tiers" ON public.plan_tiers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Select policy for benefit_categories" ON public.benefit_categories;
CREATE POLICY "Select policy for benefit_categories" ON public.benefit_categories FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Write policy for benefit_categories" ON public.benefit_categories;
CREATE POLICY "Write policy for benefit_categories" ON public.benefit_categories FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Select policy for benefit_definitions" ON public.benefit_definitions;
CREATE POLICY "Select policy for benefit_definitions" ON public.benefit_definitions FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Write policy for benefit_definitions" ON public.benefit_definitions;
CREATE POLICY "Write policy for benefit_definitions" ON public.benefit_definitions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Select policy for plan_benefit_config" ON public.plan_benefit_config;
CREATE POLICY "Select policy for plan_benefit_config" ON public.plan_benefit_config FOR SELECT TO authenticated, anon USING (true);

-- 9. Update check constraint for coverage_scope_type to support specific_number and percentage
DO $$
BEGIN
  ALTER TABLE public.plan_benefit_config
  DROP CONSTRAINT IF EXISTS plan_benefit_config_coverage_scope_type_check;

  ALTER TABLE public.plan_benefit_config
  ADD CONSTRAINT plan_benefit_config_coverage_scope_type_check
  CHECK (coverage_scope_type IN ('all', 'specific_number', 'specific_count', 'percentage', 'specific_percentage', 'count'));

  ALTER TABLE public.plan_benefit_config
  DROP CONSTRAINT IF EXISTS plan_benefit_config_accommodation_category_check;

  ALTER TABLE public.plan_benefit_config
  ADD CONSTRAINT plan_benefit_config_accommodation_category_check
  CHECK (accommodation_category IS NULL OR accommodation_category IN ('suite', 'first_class_single', 'regular_double', 'standard_private', 'semi_private', 'vip', 'royal_suite'));

  ALTER TABLE public.plan_benefit_config
  DROP CONSTRAINT IF EXISTS plan_benefit_config_coverage_status_check;

  ALTER TABLE public.plan_benefit_config
  ADD CONSTRAINT plan_benefit_config_coverage_status_check
  CHECK (coverage_status IN ('covered', 'not_covered', 'partially_covered', 'conditional'));

  ALTER TABLE public.plan_benefit_config
  DROP CONSTRAINT IF EXISTS plan_benefit_config_limit_type_check;

  ALTER TABLE public.plan_benefit_config
  ADD CONSTRAINT plan_benefit_config_limit_type_check
  CHECK (limit_type IN ('included_in_aal', 'sub_limit', 'unlimited', 'per_case', 'full_cover'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 9. Add policy_id link to plan_tiers for policy-level shared combined pool binding
ALTER TABLE public.plan_tiers
ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL;

-- 10. Add Doctor on Site (DOS) visits per week & number of locations columns
ALTER TABLE public.doctor_on_site_config
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visits_per_week INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS number_of_locations INT DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctor_on_site_config_tier_id_key'
  ) THEN
    ALTER TABLE public.doctor_on_site_config ADD CONSTRAINT doctor_on_site_config_tier_id_key UNIQUE (tier_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Select policy for doctor_on_site_config" ON public.doctor_on_site_config;
CREATE POLICY "Select policy for doctor_on_site_config" ON public.doctor_on_site_config FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Write policy for doctor_on_site_config" ON public.doctor_on_site_config;
CREATE POLICY "Write policy for doctor_on_site_config" ON public.doctor_on_site_config FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);






