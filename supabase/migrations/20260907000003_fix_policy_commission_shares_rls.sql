-- Migration: Fix Row Level Security policies for policy_commission_shares
-- Ensures authenticated users can add, view, update, and remove commission shares for policies

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins and Finance can manage all commission shares" ON public.policy_commission_shares;
    DROP POLICY IF EXISTS "Authorized policy users can manage commission shares" ON public.policy_commission_shares;
    DROP POLICY IF EXISTS "Users can view their own commission shares" ON public.policy_commission_shares;
    DROP POLICY IF EXISTS "Enable all access for authenticated users on policy_commission_shares" ON public.policy_commission_shares;
    DROP POLICY IF EXISTS "Authenticated users can manage policy_commission_shares" ON public.policy_commission_shares;
END $$;

ALTER TABLE public.policy_commission_shares ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage policy_commission_shares
CREATE POLICY "Authenticated users can manage policy_commission_shares"
ON public.policy_commission_shares
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
