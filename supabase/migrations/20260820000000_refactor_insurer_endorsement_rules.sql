-- 1. Drop NOT NULL constraints from rules columns
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN proration_method DROP NOT NULL;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN late_addition_threshold_month DROP NOT NULL;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN minimum_premium_percentage_after_threshold DROP NOT NULL;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN refund_allowed_if_utilized DROP NOT NULL;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN refund_processing_delay_days DROP NOT NULL;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN dependent_termination_on_main_delete DROP NOT NULL;

-- 2. Drop DEFAULT values from rules columns
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN proration_method DROP DEFAULT;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN late_addition_threshold_month DROP DEFAULT;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN minimum_premium_percentage_after_threshold DROP DEFAULT;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN refund_allowed_if_utilized DROP DEFAULT;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN refund_processing_delay_days DROP DEFAULT;
ALTER TABLE public.insurer_endorsement_rules ALTER COLUMN dependent_termination_on_main_delete DROP DEFAULT;

-- 3. Add new rule columns
ALTER TABLE public.insurer_endorsement_rules ADD COLUMN IF NOT EXISTS coverage_start_basis text;
ALTER TABLE public.insurer_endorsement_rules ADD COLUMN IF NOT EXISTS refund_proration_method text;

-- 4. Nullify existing configurations to enforce strict setup
UPDATE public.insurer_endorsement_rules 
SET 
  proration_method = NULL,
  late_addition_threshold_month = NULL,
  minimum_premium_percentage_after_threshold = NULL,
  refund_allowed_if_utilized = NULL,
  refund_processing_delay_days = NULL,
  dependent_termination_on_main_delete = NULL,
  coverage_start_basis = NULL,
  refund_proration_method = NULL;
