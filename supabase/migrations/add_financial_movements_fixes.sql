-- Fix script: add_financial_movements_fixes

-- 1. Drop the incorrect unique constraint
ALTER TABLE public.installment_financial_movements 
DROP CONSTRAINT IF EXISTS installment_financial_movements_installment_id_movement_id_key;

-- 2. Add the correct unique constraint (movement_id must be unique across all installments)
ALTER TABLE public.installment_financial_movements 
ADD CONSTRAINT unique_movement_id UNIQUE(movement_id);

-- 3. Add Indexes as required
CREATE INDEX IF NOT EXISTS idx_pfm_policy_id_status 
ON public.policy_financial_movements(policy_id, status);
