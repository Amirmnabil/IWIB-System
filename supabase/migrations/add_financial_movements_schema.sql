-- Migration: add_financial_movements_schema

-- 1. Create reference_list table
CREATE TABLE IF NOT EXISTS public.reference_list (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    key text not null,
    value text not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    UNIQUE(category, key)
);

-- Insert reference data
INSERT INTO public.reference_list (category, key, value, is_active)
VALUES
    ('transaction_type', 'ADDITION', 'Addition', true),
    ('transaction_type', 'REFUND', 'Refund', true),
    ('transaction_type', 'ENDORSEMENT', 'Endorsement', true),
    ('transaction_type', 'CANCELLATION', 'Cancellation', true),
    ('financial_direction', 'DEBIT', 'Debit', true),
    ('financial_direction', 'CREDIT', 'Credit', true),
    ('movement_status', 'PENDING', 'Pending', true),
    ('movement_status', 'APPLIED', 'Applied', true),
    ('line_of_business', 'MEDICAL', 'Medical', true),
    ('line_of_business', 'MOTOR', 'Motor', true),
    ('line_of_business', 'LIFE', 'Life', true),
    ('line_of_business', 'PROPERTY', 'Property', true),
    ('line_of_business', 'MARINE', 'Marine', true)
ON CONFLICT (category, key) DO NOTHING;

-- 2. Create policy_financial_movements table
CREATE TABLE IF NOT EXISTS public.policy_financial_movements (
    id uuid primary key default gen_random_uuid(),
    policy_id uuid references public.policies(id) on delete cascade not null,
    line_of_business uuid references public.reference_list(id),
    type uuid references public.reference_list(id),
    financial_direction uuid references public.reference_list(id),
    amount numeric not null,
    description text,
    transaction_date date,
    status uuid references public.reference_list(id),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create installment_financial_movements table
CREATE TABLE IF NOT EXISTS public.installment_financial_movements (
    id uuid primary key default gen_random_uuid(),
    installment_id uuid references public.installments(id) on delete cascade not null,
    movement_id uuid references public.policy_financial_movements(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    UNIQUE(installment_id, movement_id)
);

-- 4. Enable RLS
ALTER TABLE public.reference_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_financial_movements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Enable read access for authenticated users on reference_list" ON public.reference_list FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on policy_financial_movements" ON public.policy_financial_movements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on installment_financial_movements" ON public.installment_financial_movements FOR ALL USING (auth.role() = 'authenticated');

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_ref_list_category ON public.reference_list(category);
CREATE INDEX IF NOT EXISTS idx_pfm_policy_id ON public.policy_financial_movements(policy_id);
CREATE INDEX IF NOT EXISTS idx_pfm_status ON public.policy_financial_movements(status);
CREATE INDEX IF NOT EXISTS idx_ifm_installment_id ON public.installment_financial_movements(installment_id);
