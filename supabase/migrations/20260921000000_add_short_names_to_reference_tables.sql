-- Migration: Add short display names (short_name and short_name_ar) across all 31 reference tables
-- Description: Systematically store concise display labels without altering regulatory/legal full names.

-- 1. Add short_name and short_name_ar columns to all 31 reference tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'endorsement_types',
    'master_endorsement_types',
    'lines_of_business',
    'sub_lines_of_business',
    'policy_types',
    'policy_statuses',
    'stages',
    'company_statuses',
    'company_types',
    'industries',
    'governorates',
    'cities',
    'currencies',
    'payment_frequencies',
    'payment_methods',
    'document_types',
    'relationship_types',
    'member_types',
    'marital_statuses',
    'gender_types',
    'claim_types',
    'claim_statuses',
    'denial_reasons',
    'provider_types',
    'provider_categories',
    'tpas',
    'networks',
    'benefit_categories',
    'master_benefit_items',
    'commission_types',
    'activity_types'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS short_name VARCHAR(100);', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS short_name_ar VARCHAR(100);', t);
    END IF;
  END LOOP;
END $$;

-- 2. Seed explicit short names for endorsement_types taxonomy items
UPDATE public.endorsement_types SET short_name = 'Addition', short_name_ar = 'إضافة' WHERE code LIKE '%-ADD%' OR code LIKE '%-ADD-LIVES%';
UPDATE public.endorsement_types SET short_name = 'Deletion', short_name_ar = 'حذف' WHERE code LIKE '%-DEL%' OR code LIKE '%-DEL-LIVES%';
UPDATE public.endorsement_types SET short_name = 'Upgrade', short_name_ar = 'ترقية' WHERE code LIKE '%-UPG%';
UPDATE public.endorsement_types SET short_name = 'Downgrade', short_name_ar = 'تخفيض' WHERE code LIKE '%-DWN%';
UPDATE public.endorsement_types SET short_name = 'Data Fix', short_name_ar = 'تصحيح بيانات' WHERE code LIKE '%-DC%' OR code LIKE '%-CORR%';
UPDATE public.endorsement_types SET short_name = 'Renewal', short_name_ar = 'تجديد' WHERE code LIKE '%-REN%';
UPDATE public.endorsement_types SET short_name = 'Termination', short_name_ar = 'إنهاء' WHERE code LIKE '%-TERM%';
UPDATE public.endorsement_types SET short_name = 'Reinstatement', short_name_ar = 'إعادة تفعيل' WHERE code LIKE '%-REIN%';
UPDATE public.endorsement_types SET short_name = 'Cancellation', short_name_ar = 'إلغاء' WHERE code LIKE '%-CANC%';

-- 3. Seed explicit short names for master_endorsement_types taxonomy items
UPDATE public.master_endorsement_types SET short_name = 'Addition', short_name_ar = 'إضافة' WHERE code LIKE '%-ADD%';
UPDATE public.master_endorsement_types SET short_name = 'Deletion', short_name_ar = 'حذف' WHERE code LIKE '%-DEL%';
UPDATE public.master_endorsement_types SET short_name = 'Upgrade', short_name_ar = 'ترقية' WHERE code LIKE '%-UPG%';
UPDATE public.master_endorsement_types SET short_name = 'Downgrade', short_name_ar = 'تخفيض' WHERE code LIKE '%-DWN%';
UPDATE public.master_endorsement_types SET short_name = 'Data Fix', short_name_ar = 'تصحيح بيانات' WHERE code LIKE '%-DC%' OR code LIKE '%-CORR%';
UPDATE public.master_endorsement_types SET short_name = 'Renewal', short_name_ar = 'تجديد' WHERE code LIKE '%-REN%';
UPDATE public.master_endorsement_types SET short_name = 'Termination', short_name_ar = 'إنهاء' WHERE code LIKE '%-TERM%';
UPDATE public.master_endorsement_types SET short_name = 'Reinstatement', short_name_ar = 'إعادة تفعيل' WHERE code LIKE '%-REIN%';
UPDATE public.master_endorsement_types SET short_name = 'Cancellation', short_name_ar = 'إلغاء' WHERE code LIKE '%-CANC%';

-- 4. Dynamic fallback population across all 31 reference tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'endorsement_types',
    'master_endorsement_types',
    'lines_of_business',
    'sub_lines_of_business',
    'policy_types',
    'policy_statuses',
    'stages',
    'company_statuses',
    'company_types',
    'industries',
    'governorates',
    'cities',
    'currencies',
    'payment_frequencies',
    'payment_methods',
    'document_types',
    'relationship_types',
    'member_types',
    'marital_statuses',
    'gender_types',
    'claim_types',
    'claim_statuses',
    'denial_reasons',
    'provider_types',
    'provider_categories',
    'tpas',
    'networks',
    'benefit_categories',
    'master_benefit_items',
    'commission_types',
    'activity_types'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'name') THEN
        EXECUTE format('UPDATE public.%I SET short_name = name WHERE (short_name IS NULL OR short_name = '''') AND name IS NOT NULL;', t);
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'name_ar') THEN
        EXECUTE format('UPDATE public.%I SET short_name_ar = name_ar WHERE (short_name_ar IS NULL OR short_name_ar = '''') AND name_ar IS NOT NULL;', t);
      END IF;
    END IF;
  END LOOP;
END $$;
