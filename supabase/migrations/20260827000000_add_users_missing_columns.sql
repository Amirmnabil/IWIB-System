-- Add company_id and policy_id columns to public.users table to support Client Portal accounts
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL;

-- Insert 'Client' role into roles table
INSERT INTO public.roles (name, is_system) VALUES ('Client', false) ON CONFLICT (name) DO NOTHING;
