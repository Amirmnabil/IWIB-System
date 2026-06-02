-- Migration: Broker Commission Sharing Feature

CREATE TABLE IF NOT EXISTS public.policy_commission_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    sharing_type TEXT CHECK (sharing_type IN ('percentage', 'fixed')) NOT NULL,
    sharing_value NUMERIC NOT NULL,
    calculated_amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policy_commission_shares_policy ON public.policy_commission_shares(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_commission_shares_user ON public.policy_commission_shares(user_id);

-- Enable RLS
ALTER TABLE public.policy_commission_shares ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins, Management, Finance can do everything
CREATE POLICY "Admins and Finance can manage all commission shares" 
ON public.policy_commission_shares
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (role IN ('Admin', 'ceo', 'Management', 'Finance', 'admin') OR is_admin = true)
    )
);

-- Policy 2: Policy authorized users (Account Managers) can manage shares for their policies
CREATE POLICY "Authorized policy users can manage commission shares"
ON public.policy_commission_shares
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.policies p 
        WHERE p.id = policy_commission_shares.policy_id 
        AND (p.iwib_account_manager_id = auth.uid())
    )
);

-- Policy 3: Users can view their own commission shares
CREATE POLICY "Users can view their own commission shares" 
ON public.policy_commission_shares
FOR SELECT
USING (
    user_id = auth.uid()
);

-- Allow authenticated users to insert/update if they pass the check (RLS handled by ALL above)
-- Real-time validation trigger to ensure max 3 shares per policy
CREATE OR REPLACE FUNCTION check_commission_share_limits()
RETURNS trigger AS $$
DECLARE
    share_count INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO share_count FROM public.policy_commission_shares WHERE policy_id = NEW.policy_id;
        IF share_count >= 3 THEN
            RAISE EXCEPTION 'Maximum 3 commission sharing entries allowed per policy.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_commission_share_limits ON public.policy_commission_shares;
CREATE TRIGGER trg_check_commission_share_limits
BEFORE INSERT ON public.policy_commission_shares
FOR EACH ROW
EXECUTE FUNCTION check_commission_share_limits();

-- Reporting Integration View
CREATE OR REPLACE VIEW public.vw_commission_sharing_report AS
SELECT 
    pcs.id AS share_id,
    pcs.user_id,
    pcs.user_name,
    pcs.sharing_type,
    pcs.sharing_value,
    pcs.calculated_amount,
    p.id AS policy_id,
    p.policy_number,
    p.client_company_name,
    p.insurer_name,
    p.start_date,
    p.end_date,
    p.premium_total,
    p.contract_net AS net_premium,
    p.broker_commission_percent,
    (p.contract_net * (p.broker_commission_percent / 100.0)) AS total_broker_commission,
    pcs.created_at
FROM public.policy_commission_shares pcs
JOIN public.policies p ON pcs.policy_id = p.id;

-- Grant access to reporting roles
GRANT SELECT ON public.vw_commission_sharing_report TO authenticated;
