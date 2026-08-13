-- Add policy_id foreign key to users table to support Client Portal accounts linked to a policy contract
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL;
