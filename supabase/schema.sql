-- ============================================================
-- IWIB Hub — Supabase Database Schema (Full, Corrected)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CORE MASTER DATA (no foreign key deps)
-- ============================================================

-- Users / Broker Profiles (internal)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text unique,
  role text default 'User', -- Admin | Broker | Manager | User
  status text default 'active',
  created_at timestamptz default timezone('utc', now()) not null
);

-- Auth Profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamptz default timezone('utc', now()) not null
);

-- Reference Lists
create table if not exists public.master_industries (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.master_pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text unique,
  "order" integer,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.master_product_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text unique,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Insurance Companies
create table if not exists public.insurance_companies (
  id uuid primary key default uuid_generate_v4(),
  -- Schema aligned with InsuranceCompany type
  "companyName" text not null,
  "companyCode" text,
  "companyType" text default 'Investment', -- Takaful | Investment
  status text default 'Active',            -- Active | Inactive | Suspended | etc.
  logo_url text,
  contact_info jsonb,
  created_at timestamptz default timezone('utc', now()) not null
);

-- TPAs
create table if not exists public.tpas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text,
  status text default 'active',
  contact_info jsonb,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Provider Network
create table if not exists public.providers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text,
  license_number text,
  address text,
  city text,
  country text,
  is_in_network boolean default true,
  tpa_names text[],
  capabilities text[],
  contact_name text,
  contact_phone text,
  contact_email text,
  status text default 'active',
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- COMPANIES (CRM core)
-- ============================================================
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  code text,
  name text not null,          -- English Name
  name_ar text,                -- Arabic Name
  status text default 'interested',
  industry text,
  employee_count integer,
  priority text default 'medium',
  city text,
  address text,
  cr_number text,
  tax_card text,
  current_insurer text,
  insurance_type text default 'Medical',
  medical_subtype text,
  checklist_status jsonb,
  checklist_completion text default 'Pending',
  expected_renewal_date text,
  expected_offer_date text,
  actual_renewal_date text,
  actual_offer_date text,
  primary_contact_title text,
  primary_contact_name text,
  primary_contact_phone text,
  primary_contact_email text,
  second_contact_title text,
  second_contact_name text,
  second_contact_mobile text,
  second_contact_email text,
  third_contact_title text,
  third_contact_name text,
  third_contact_mobile text,
  third_contact_email text,
  website text,
  linkedin_page text,
  landline text,
  assigned_user_id text,
  assigned_user_name text,
  source text,
  last_contact_date text,
  call_date text,
  follow_up_date text,
  renewal_month text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

-- Contacts (aligned with Contact type — uses job_title not position)
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  mobile text,
  job_title text,              -- was 'position' — fixed to match Contact type
  role_type text,
  preferred_contact_method text default 'Email',
  is_primary boolean default false,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- CRM / SALES
-- ============================================================
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  status text default 'new',
  lead_source text,
  priority text default 'medium',
  estimated_premium numeric,
  next_follow_up timestamptz,
  assigned_user_name text,
  assigned_user_id uuid,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.prospects (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  company_id uuid references public.companies(id),
  lead_id uuid references public.leads(id),
  pipeline_stage text default 'qualification',
  probability numeric default 50,
  estimated_value numeric default 0,
  expected_close_date date,
  assigned_user_name text,
  assigned_user_id uuid,
  current_insurer text,
  current_tpa text,
  requested_products text[],
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  activity_type text not null, -- call | meeting | task | follow_up | feedback | note | email
  subject text not null,
  description text,
  status text default 'pending',
  priority text default 'medium',
  due_date timestamptz,
  end_date timestamptz,
  related_type text,           -- company | lead | prospect | policy | claim | contact
  related_id uuid,
  related_name text,
  assigned_to_name text,
  assigned_to_id uuid,
  result text,
  duration_minutes integer,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- POLICIES (must be before claims, policy_members, etc.)
-- ============================================================
create table if not exists public.policies (
  id uuid primary key default uuid_generate_v4(),
  policy_number text unique,
  client_company_id uuid references public.companies(id),
  client_company_name text,
  insurer_id uuid references public.insurance_companies(id),
  insurer_name text,
  tpa_id uuid references public.tpas(id),
  tpa_name text,
  policy_type text,
  start_date date,
  end_date date,
  premium_total numeric,
  premium_gross numeric,
  contract_net numeric,
  fee_percent numeric,
  insurer_account_managers jsonb,
  sales_person text,
  iwib_account_manager_id uuid,
  iwib_account_manager_name text,
  contract_document_url text,
  related_documents jsonb,
  policy_status text default 'active',
  member_count integer,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Policy Members (census per policy)
create table if not exists public.policy_members (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.policies(id) on delete cascade,
  member_name text not null,
  member_code text,
  staff_code text,
  date_of_birth date,
  gender text,              -- Male | Female
  relation text,            -- Principal | Spouse | Child
  nationality text,
  national_id text,
  plan_category text,
  location text,
  department text,
  job_title text,
  premium numeric,
  addition_date date,
  deletion_date date,
  mobile_number text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- UNDERWRITING
-- ============================================================
create table if not exists public.sme_plans (
  id text primary key,
  "Plan ID" text,
  "Company Name" text not null,
  "Plan Name" text not null,
  "Life Insurance" text,
  "Annual Coverage Limits" text,
  "TPA" text,
  "Network" text,
  "Accommodation" text,
  "Inpatient" text,
  "Consultations" text,
  "Radiology & laboratory" text,
  "Medications" text,
  "Dental" text,
  "Optical" text,
  "Maternity" text,
  "Chronic & Pre-existing" text,
  "COVID-19" text,
  "Out-of-Network Reimbursement" text,
  "Minimum Member Count" numeric,
  "Maximum members count" numeric,
  "Payment terms" text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.sme_premiums (
  id text primary key,           -- formatted as {planId}_{age}
  plan_id text references public.sme_plans(id) on delete cascade,
  age integer not null,
  emp numeric not null,
  spouse numeric not null,
  child numeric not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.sme_quotations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id),
  company_name text,
  selected_plan_ids text[],
  census_snapshot jsonb,
  total_premium numeric,
  status text default 'draft',
  user_id uuid,
  user_name text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Census Database (standalone, not per-policy)
create table if not exists public.census_members (
  id uuid primary key default uuid_generate_v4(),
  member_full_name text not null,
  national_id text,
  policy_number text,
  policy_id uuid references public.policies(id),
  relation text,
  status text default 'active',
  date_of_birth date,
  gender text,
  nationality text,
  plan_category text,
  department text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Benefit Schedules
create table if not exists public.benefit_schedules (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.policies(id) on delete cascade,
  plan_name text,
  benefit_class text,
  network_type text,
  inpatient_limit numeric,
  outpatient_limit numeric,
  dental_limit numeric,
  optical_limit numeric,
  maternity_limit numeric,
  details jsonb,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- CLAIMS
-- ============================================================
create table if not exists public.claims (
  id uuid primary key default uuid_generate_v4(),
  claim_number text unique,
  policy_id uuid references public.policies(id),
  policy_number text,
  member_id uuid,
  member_name text,
  company_id uuid references public.companies(id),
  company_name text,
  claim_type text,
  incident_date date,
  submission_date date,
  claim_amount numeric,
  approved_amount numeric,
  paid_amount numeric,
  status text default 'pending',
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.claim_appeals (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references public.claims(id) on delete cascade,
  claim_number text,
  appeal_reason text not null,
  appeal_date date,
  status text default 'under_review',
  resolution text,
  resolved_date date,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- FINANCE
-- ============================================================
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text unique,
  client_company_id uuid references public.companies(id),
  client_company_name text,
  policy_id uuid references public.policies(id),
  policy_number text,
  invoice_type text,
  issue_date date,
  due_date date,
  amount_due numeric default 0,
  amount_paid numeric default 0,
  balance numeric generated always as (amount_due - amount_paid) stored,
  status text default 'unpaid',
  payment_terms text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  payment_number text unique,
  invoice_id uuid references public.invoices(id),
  invoice_number text,
  policy_number text,
  client_company_name text,
  payment_date date,
  amount numeric not null,
  payment_method text,
  reference_number text,
  bank_name text,
  status text default 'completed',
  received_by_name text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.commissions (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.policies(id),
  policy_number text,
  client_company_name text,
  client_company_id uuid references public.companies(id),
  insurer_name text,
  insurer_id uuid references public.insurance_companies(id),
  commission_rate numeric,
  premium_amount numeric,
  expected_commission numeric,
  accrued_commission numeric,
  paid_commission numeric,
  commission_status text default 'pending',
  period_start date,
  period_end date,
  payment_date date,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- RENEWALS
-- ============================================================
create table if not exists public.renewals (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.policies(id),
  policy_number text,
  client_company_name text,
  client_company_id uuid references public.companies(id),
  renewal_term_start date,
  renewal_term_end date,
  current_premium numeric,
  proposed_premium numeric,
  renewal_status text default 'upcoming',
  renewal_probability numeric,
  assigned_user_name text,
  notes text,
  days_until_expiry integer,
  premium_change_percent numeric,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- COMPLIANCE
-- ============================================================
create table if not exists public.kyc_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id),
  company_name text,
  contact_name text,
  document_type text not null,
  document_number text,
  file_url text,
  expiry_date date,
  status text default 'pending',
  verified_by_id uuid,
  verified_by_name text,
  rejection_reason text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  user_name text,
  action text not null,        -- create | update | delete | login | logout
  resource_type text,          -- company | policy | claim | etc.
  resource_id text,
  resource_name text,
  changes jsonb,
  ip_address text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- RISK SCORING
-- ============================================================
create table if not exists public.risk_scores (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id),
  company_name text,
  policy_id uuid references public.policies(id),
  policy_number text,
  score_value numeric not null,
  risk_level text not null,    -- low | medium | high | critical
  calculated_at timestamptz default timezone('utc', now()),
  notes text,
  components jsonb,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.master_industries enable row level security;
alter table public.master_pipeline_stages enable row level security;
alter table public.master_product_types enable row level security;
alter table public.insurance_companies enable row level security;
alter table public.tpas enable row level security;
alter table public.providers enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.prospects enable row level security;
alter table public.activities enable row level security;
alter table public.policies enable row level security;
alter table public.policy_members enable row level security;
alter table public.sme_plans enable row level security;
alter table public.sme_premiums enable row level security;
alter table public.sme_quotations enable row level security;
alter table public.census_members enable row level security;
alter table public.benefit_schedules enable row level security;
alter table public.claims enable row level security;
alter table public.claim_appeals enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.renewals enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.risk_scores enable row level security;

-- ============================================================
-- RLS POLICIES
-- Authenticated users can read all records.
-- Write operations are limited to authenticated users.
-- Future: add role-based policies per table using auth.jwt() claims.
-- ============================================================

-- Helper: apply standard authenticated-user read/write policy to a table
-- Read: any authenticated user
-- Write: any authenticated user (to be tightened with role claims in Phase 2)

do $$
declare
  tbl text;
  tables text[] := array[
    'users','profiles','master_industries','master_pipeline_stages','master_product_types',
    'insurance_companies','tpas','providers','companies','contacts','leads','prospects',
    'activities','policies','policy_members','sme_plans','sme_premiums','sme_quotations',
    'census_members','benefit_schedules','claims','claim_appeals','invoices','payments',
    'commissions','renewals','kyc_documents','audit_logs','risk_scores'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'create policy "Authenticated users can select" on public.%I for select using (auth.role() = ''authenticated'');',
      tbl
    );
    execute format(
      'create policy "Authenticated users can insert" on public.%I for insert with check (auth.role() = ''authenticated'');',
      tbl
    );
    execute format(
      'create policy "Authenticated users can update" on public.%I for update using (auth.role() = ''authenticated'');',
      tbl
    );
    execute format(
      'create policy "Authenticated users can delete" on public.%I for delete using (auth.role() = ''authenticated'');',
      tbl
    );
  end loop;
end $$;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_assigned_user on public.companies(assigned_user_id);
create index if not exists idx_contacts_company_id on public.contacts(company_id);
create index if not exists idx_contacts_email on public.contacts(email);
create index if not exists idx_policies_client on public.policies(client_company_id);
create index if not exists idx_policies_status on public.policies(policy_status);
create index if not exists idx_policies_end_date on public.policies(end_date);
create index if not exists idx_claims_policy on public.claims(policy_id);
create index if not exists idx_claims_status on public.claims(status);
create index if not exists idx_activities_due_date on public.activities(due_date);
create index if not exists idx_activities_assigned_to on public.activities(assigned_to_id);
create index if not exists idx_renewals_term_end on public.renewals(renewal_term_end);
create index if not exists idx_commissions_policy on public.commissions(policy_id);
create index if not exists idx_invoices_company on public.invoices(client_company_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_sme_premiums_plan on public.sme_premiums(plan_id);
create index if not exists idx_risk_scores_company on public.risk_scores(company_id);
