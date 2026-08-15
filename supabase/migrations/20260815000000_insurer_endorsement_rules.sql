-- Create proration_method_enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proration_method_enum') THEN
        CREATE TYPE proration_method_enum AS ENUM ('daily', 'monthly');
    END IF;
END $$;

-- Create insurer_endorsement_rules table
CREATE TABLE IF NOT EXISTS public.insurer_endorsement_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer_id uuid UNIQUE REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
    proration_method proration_method_enum DEFAULT 'daily' NOT NULL,
    late_addition_threshold_month integer DEFAULT 10 NOT NULL,
    minimum_premium_percentage_after_threshold numeric DEFAULT 0.25 NOT NULL,
    refund_allowed_if_utilized boolean DEFAULT false NOT NULL,
    refund_processing_delay_days integer DEFAULT 90 NOT NULL,
    dependent_termination_on_main_delete boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Seed defaults for all existing insurance companies
INSERT INTO public.insurer_endorsement_rules (
    insurer_id,
    proration_method,
    late_addition_threshold_month,
    minimum_premium_percentage_after_threshold,
    refund_allowed_if_utilized,
    refund_processing_delay_days,
    dependent_termination_on_main_delete
)
SELECT 
    id, 
    'daily'::proration_method_enum, 
    10, 
    0.25, 
    false, 
    90, 
    true
FROM public.insurance_companies
ON CONFLICT (insurer_id) DO NOTHING;
