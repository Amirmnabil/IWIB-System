-- Migration: Optimize Commission Agreements & Ensure Data Consistency
-- Purpose: Ensures defaults for commission_agreements columns without affecting existing historical data.

-- 1. Ensure commission_agreements has necessary column defaults and indexes
ALTER TABLE IF EXISTS public.commission_agreements
  ALTER COLUMN product_type SET DEFAULT 'medical',
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN rate_percent SET DEFAULT 0;

-- 2. Add performance index on policy_id for commission_agreements
CREATE INDEX IF NOT EXISTS idx_commission_agreements_policy_id 
  ON public.commission_agreements(policy_id);

-- 3. Add index on client_company_id for fast Client -> Policy data synchronization
CREATE INDEX IF NOT EXISTS idx_policies_client_company_id 
  ON public.policies(client_company_id);

-- 4. Enable RLS and verify public policies access if not enabled
ALTER TABLE public.commission_agreements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'commission_agreements' AND policyname = 'Allow authenticated users full access to commission_agreements'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to commission_agreements" 
      ON public.commission_agreements 
      FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;
