-- IWIB Hub Supabase Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Companies
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  industry text,
  website text,
  address text,
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

-- Leads / Prospects
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

-- Users / Profiles
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
create policy "Allow all authenticated users" on public.policies for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated users" on public.profiles for all using (auth.role() = 'authenticated');
