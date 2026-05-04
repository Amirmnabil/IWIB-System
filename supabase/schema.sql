-- IWIB Hub Supabase Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Companies
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  code text,
  name text not null, -- English Name
  name_ar text, -- Arabic Name
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contacts
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  position text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insurance Companies
create table if not exists public.insurance_companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  contact_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TPAs
create table if not exists public.tpas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SME Plans
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SME Premiums
create table if not exists public.sme_premiums (
  id text primary key, -- formatted as planId_age
  plan_id text references public.sme_plans(id) on delete cascade,
  age integer not null,
  emp numeric not null,
  spouse numeric not null,
  child numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SME Quotations
create table if not exists public.sme_quotations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id),
  company_name text,
  plan_ids text[],
  census_id text,
  total_premium numeric,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leads
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  status text default 'new',
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Prospects / Sales Pipeline
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
  notes text,
  requested_products text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activities
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  activity_type text not null, -- call, meeting, task, etc.
  subject text not null,
  description text,
  status text default 'pending',
  priority text default 'medium',
  due_date timestamp with time zone,
  end_date timestamp with time zone,
  related_type text,
  related_id uuid,
  related_name text,
  assigned_to_name text,
  assigned_to_id uuid,
  result text,
  duration_minutes integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Claims
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
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Master Data: Industries
create table if not exists public.master_industries (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Master Data: Pipeline Stages
create table if not exists public.master_pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text unique,
  "order" integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Master Data: Product Types
create table if not exists public.master_product_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Users (Alias or separate table for profile data if needed)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text unique,
  role text default 'User',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies
create table if not exists public.policies (
  id uuid primary key default uuid_generate_v4(),
  policy_number text unique,
  company_id uuid references public.companies(id),
  insurance_company_id uuid references public.insurance_companies(id),
  plan_name text,
  start_date date,
  end_date date,
  premium numeric,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.insurance_companies enable row level security;
alter table public.tpas enable row level security;
alter table public.sme_plans enable row level security;
alter table public.sme_premiums enable row level security;
alter table public.sme_quotations enable row level security;
alter table public.leads enable row level security;
alter table public.prospects enable row level security;
alter table public.activities enable row level security;
alter table public.claims enable row level security;
alter table public.master_industries enable row level security;
alter table public.master_pipeline_stages enable row level security;
alter table public.master_product_types enable row level security;
alter table public.users enable row level security;
alter table public.policies enable row level security;
alter table public.profiles enable row level security;

-- Simple policies (Allow all authenticated users to read/write for now)
create policy "Allow all authenticated users" on public.companies for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.contacts for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.insurance_companies for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.tpas for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.sme_plans for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.sme_premiums for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.sme_quotations for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.leads for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.prospects for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.activities for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.claims for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.master_industries for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.master_pipeline_stages for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.master_product_types for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.users for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.policies for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.profiles for all using (auth.role() = 'authenticated');
