-- ============================================================
-- Installments & Claim Settlements Schema
-- ============================================================

alter table public.policies add column if not exists payment_frequency text default 'Annual';

create table if not exists public.installments (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.policies(id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  issue_date date,
  status text default 'Pending', -- Pending | Issued | Paid
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.installment_claims (
  id uuid primary key default uuid_generate_v4(),
  installment_id uuid references public.installments(id) on delete cascade,
  claim_id uuid references public.claims(id) on delete cascade,
  created_at timestamptz default timezone('utc', now()) not null,
  unique(installment_id, claim_id)
);

-- RLS Policies
alter table public.installments enable row level security;
alter table public.installment_claims enable row level security;

create policy "Authenticated users can select on installments" on public.installments for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert on installments" on public.installments for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update on installments" on public.installments for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete on installments" on public.installments for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can select on installment_claims" on public.installment_claims for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert on installment_claims" on public.installment_claims for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update on installment_claims" on public.installment_claims for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete on installment_claims" on public.installment_claims for delete using (auth.role() = 'authenticated');

create index if not exists idx_installments_policy on public.installments(policy_id);
create index if not exists idx_installments_status on public.installments(status);
create index if not exists idx_installment_claims_installment on public.installment_claims(installment_id);
create index if not exists idx_installment_claims_claim on public.installment_claims(claim_id);
