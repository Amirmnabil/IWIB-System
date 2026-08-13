-- Create endorsement_types table
CREATE TABLE IF NOT EXISTS public.endorsement_types (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    line_of_business text not null,
    category text not null CHECK (category IN ('Corporate', 'Individual', 'Over Ceiling', 'Recovery', 'Exception')),
    is_financial boolean default false,
    default_logic jsonb,
    created_at timestamptz default timezone('utc', now()) not null
);

-- Recreate endorsements table
DROP TABLE IF EXISTS public.endorsement_items CASCADE;
DROP TABLE IF EXISTS public.endorsements CASCADE;

CREATE TABLE public.endorsements (
    id uuid primary key default uuid_generate_v4(),
    policy_id uuid references public.policies(id) on delete cascade,
    client_id uuid references public.companies(id) on delete set null,
    line_of_business text not null,
    endorsement_type_id uuid references public.endorsement_types(id) on delete set null,
    endorsement_number text unique,
    category text not null CHECK (category IN ('Corporate', 'Individual', 'Over Ceiling', 'Recovery', 'Exception')),
    effective_date date not null,
    creation_date timestamptz default timezone('utc', now()) not null,
    status text not null default 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Invoiced')),
    premium_impact numeric not null default 0,
    sum_insured_impact numeric not null default 0,
    notes text,
    created_by uuid references public.users(id) on delete set null,
    approved_by uuid references public.users(id) on delete set null,
    linked_invoice_id uuid references public.invoices(id) on delete set null,
    source text not null default 'Manual' CHECK (source IN ('Manual', 'Excel Upload', 'API', 'Client Portal')),
    created_at timestamptz default timezone('utc', now()) not null
);

-- Recreate endorsement_items table to link details
CREATE TABLE public.endorsement_items (
    id uuid primary key default uuid_generate_v4(),
    endorsement_id uuid references public.endorsements(id) on delete cascade,
    name text not null,
    national_id text,
    action_type text not null CHECK (action_type IN ('add', 'delete', 'modify')),
    premium numeric default 0,
    details jsonb,
    created_at timestamptz default timezone('utc', now()) not null
);

-- Seed basic endorsement types
INSERT INTO public.endorsement_types (name, line_of_business, category, is_financial) VALUES
('Member Addition', 'Medical', 'Corporate', true),
('Member Deletion', 'Medical', 'Corporate', true),
('Member Addition (Life)', 'Life', 'Corporate', true),
('Member Deletion (Life)', 'Life', 'Corporate', true),
('Vehicle Addition', 'Motor', 'Individual', true),
('Vehicle Deletion', 'Motor', 'Individual', true),
('Sum Insured Increase', 'Property', 'Corporate', true),
('Sum Insured Decrease', 'Property', 'Corporate', true),
('Non-Financial Data Correction', 'Medical', 'Individual', false),
('Over Ceiling Upgrade', 'Medical', 'Over Ceiling', true),
('Premium Exception Refund', 'Medical', 'Exception', true),
('Recovery Claim Refund', 'Medical', 'Recovery', true)
ON CONFLICT DO NOTHING;

-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_endorsements_policy_id ON public.endorsements(policy_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_client_id ON public.endorsements(client_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_status ON public.endorsements(status);

-- RLS
ALTER TABLE public.endorsement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select endorsement_types" ON public.endorsement_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage endorsement_types" ON public.endorsement_types FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select endorsements" ON public.endorsements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage endorsements" ON public.endorsements FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select endorsement_items" ON public.endorsement_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage endorsement_items" ON public.endorsement_items FOR ALL USING (auth.role() = 'authenticated');
