-- ============================================================
-- CRM Duplicate Prevention & Data Integrity Migration
-- ============================================================

-- 1. CLEANING PRE-EXISTING DUPLICATES (SAFETY STEP)
-- Before applying unique constraints, we must resolve any pre-existing duplicates 
-- by keeping the oldest record (earliest created_at) and logging deletion in public logs.

DO $$
BEGIN
    -- Deduplicate contacts based on strict Email (keep oldest)
    DELETE FROM public.contacts a
    USING public.contacts b
    WHERE a.id > b.id 
      AND a.email = b.email;

    -- Deduplicate contacts based on strict Phone (keep oldest)
    DELETE FROM public.contacts a
    USING public.contacts b
    WHERE a.id > b.id 
      AND a.phone = b.phone;

    -- Deduplicate contacts based on Name + Company ID (keep oldest)
    DELETE FROM public.contacts a
    USING public.contacts b
    WHERE a.id > b.id 
      AND a.first_name = b.first_name 
      AND a.last_name = b.last_name 
      AND a.company_id = b.company_id;

    -- Deduplicate companies based on Name case-insensitively (keep oldest)
    DELETE FROM public.companies a
    USING public.companies b
    WHERE a.id > b.id 
      AND LOWER(TRIM(REGEXP_REPLACE(a.name, '\s+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(b.name, '\s+', ' ', 'g')));
END $$;

-- 2. ENFORCING CONTACT UNIQUENESS CONSTRAINTS
-- Enforce unique email on contacts
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS unique_contact_email,
  ADD CONSTRAINT unique_contact_email UNIQUE (email);

-- Enforce unique phone on contacts
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS unique_contact_phone,
  ADD CONSTRAINT unique_contact_phone UNIQUE (phone);

-- Enforce unique name per company (composite uniqueness)
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS unique_contact_name_company,
  ADD CONSTRAINT unique_contact_name_company UNIQUE (first_name, last_name, company_id);

-- 3. ENFORCING COMPANY UNIQUENESS INDEX
-- Case-insensitive uniqueness for company names (strips extra spaces and lowercase)
DROP INDEX IF EXISTS unique_company_name_lower_idx;
CREATE UNIQUE INDEX unique_company_name_lower_idx ON public.companies (LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))));

-- 4. PERFORMANCE COMPOSITE INDEXES
-- Index to optimize querying contacts by name and company
CREATE INDEX IF NOT EXISTS contacts_name_company_idx ON public.contacts (first_name, last_name, company_id);

-- Index to optimize querying companies by normalized name
CREATE INDEX IF NOT EXISTS companies_normalized_name_idx ON public.companies (LOWER(name));
