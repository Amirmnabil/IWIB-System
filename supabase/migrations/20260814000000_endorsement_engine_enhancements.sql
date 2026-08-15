-- SAFE ENHANCEMENT: check existence before altering or creating tables/columns

DO $$
BEGIN
    -- 1. Alter insurance_companies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='insurance_companies' AND column_name='late_addition_threshold_month') THEN
        ALTER TABLE public.insurance_companies ADD COLUMN late_addition_threshold_month integer DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='insurance_companies' AND column_name='minimum_premium_percentage_after_threshold') THEN
        ALTER TABLE public.insurance_companies ADD COLUMN minimum_premium_percentage_after_threshold numeric DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='insurance_companies' AND column_name='refund_allowed_if_utilized') THEN
        ALTER TABLE public.insurance_companies ADD COLUMN refund_allowed_if_utilized boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='insurance_companies' AND column_name='refund_processing_delay_days') THEN
        ALTER TABLE public.insurance_companies ADD COLUMN refund_processing_delay_days integer DEFAULT 30;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='insurance_companies' AND column_name='dependent_termination_on_main_delete') THEN
        ALTER TABLE public.insurance_companies ADD COLUMN dependent_termination_on_main_delete boolean DEFAULT true;
    END IF;

    -- 2. Alter sme_plans
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sme_plans' AND column_name='min_age') THEN
        ALTER TABLE public.sme_plans ADD COLUMN min_age integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sme_plans' AND column_name='max_age') THEN
        ALTER TABLE public.sme_plans ADD COLUMN max_age integer DEFAULT 65;
    END IF;

    -- 3. Alter policies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='policies' AND column_name='max_allowed_age') THEN
        ALTER TABLE public.policies ADD COLUMN max_allowed_age integer DEFAULT 65;
    END IF;

    -- 4. Alter policy_members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='policy_members' AND column_name='linked_main_member_id') THEN
        ALTER TABLE public.policy_members ADD COLUMN linked_main_member_id uuid REFERENCES public.policy_members(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create dependent_rules table
CREATE TABLE IF NOT EXISTS public.dependent_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE UNIQUE,
    child_max_age integer DEFAULT 23,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT null
);

-- 6. Create relations table
CREATE TABLE IF NOT EXISTS public.relations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    relation_type text UNIQUE NOT NULL,
    allowed_gender text DEFAULT 'Any',
    created_at timestamptz DEFAULT timezone('utc', now()) NOT null
);

-- Seed default relations
INSERT INTO public.relations (relation_type, allowed_gender)
VALUES
    ('Employee', 'Any'),
    ('Spouse', 'Female'),
    ('Child', 'Any')
ON CONFLICT (relation_type) DO UPDATE
SET allowed_gender = EXCLUDED.allowed_gender;

-- RLS
ALTER TABLE public.dependent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select dependent_rules" ON public.dependent_rules;
CREATE POLICY "Authenticated users can select dependent_rules" ON public.dependent_rules FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage dependent_rules" ON public.dependent_rules;
CREATE POLICY "Authenticated users can manage dependent_rules" ON public.dependent_rules FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can select relations" ON public.relations;
CREATE POLICY "Authenticated users can select relations" ON public.relations FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage relations" ON public.relations;
CREATE POLICY "Authenticated users can manage relations" ON public.relations FOR ALL USING (auth.role() = 'authenticated');
