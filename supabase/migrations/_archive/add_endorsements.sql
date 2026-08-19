-- Add proration_method to insurance_companies
ALTER TABLE public.insurance_companies ADD COLUMN proration_method text DEFAULT 'monthly';

-- Create endorsements table
CREATE TABLE IF NOT EXISTS public.endorsements (
    id uuid primary key default uuid_generate_v4(),
    endorsement_number text,
    policy_id uuid references public.policies(id) on delete cascade,
    endorsement_type text, -- 'addition', 'deletion', etc.
    effective_date date,
    members_added integer default 0,
    members_deleted integer default 0,
    premium_adjustment numeric default 0,
    status text default 'pending',
    requested_by_name text,
    notes text,
    details jsonb,
    created_at timestamptz default timezone('utc', now()) not null
);

-- Create endorsement_items table
CREATE TABLE IF NOT EXISTS public.endorsement_items (
    id uuid primary key default uuid_generate_v4(),
    endorsement_id uuid references public.endorsements(id) on delete cascade,
    member_name text not null,
    national_id text,
    action_type text, -- 'add' or 'delete'
    annual_premium numeric,
    calculation_method text, -- 'daily' or 'monthly'
    prorated_factor numeric,
    calculated_premium numeric,
    created_at timestamptz default timezone('utc', now()) not null
);

-- RLS
alter table public.endorsements enable row level security;
alter table public.endorsement_items enable row level security;

create policy "Authenticated users can select endorsements" on public.endorsements for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert endorsements" on public.endorsements for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update endorsements" on public.endorsements for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete endorsements" on public.endorsements for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can select endorsement_items" on public.endorsement_items for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert endorsement_items" on public.endorsement_items for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update endorsement_items" on public.endorsement_items for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete endorsement_items" on public.endorsement_items for delete using (auth.role() = 'authenticated');
