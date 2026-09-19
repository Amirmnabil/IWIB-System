-- Migration: Add attachments support to policy_members, census_members, endorsements, and endorsement_items
-- Date: 2026-09-20

-- 1. Add attachments JSONB columns
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.endorsements ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.endorsement_items ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure Storage bucket 'documents' exists and is configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage bucket policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete documents" ON storage.objects;

CREATE POLICY "Allow authenticated read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- 4. Update sync_policy_member_to_census trigger function to sync attachments
CREATE OR REPLACE FUNCTION public.sync_policy_member_to_census() RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_insurer_name text;
  v_policy_number text;
  v_policy_name text;
  v_start_date date;
  v_expiry_date date;
  v_tpa_name text;
BEGIN
  -- Fetch policy-level info
  SELECT 
    p.client_company_id, p.client_company_name, p.insurer_name, p.policy_number, p.policy_number, p.start_date, p.end_date, t.name
  INTO 
    v_company_id, v_company_name, v_insurer_name, v_policy_number, v_policy_name, v_start_date, v_expiry_date, v_tpa_name
  FROM public.policies p
  LEFT JOIN public.tpas t ON p.tpa_id = t.id
  WHERE p.id = COALESCE(NEW.policy_id, OLD.policy_id);

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.census_members 
      WHERE policy_id = NEW.policy_id 
        AND (
          (national_id IS NOT NULL AND national_id = NEW.national_id) 
          OR (member_full_name = NEW.member_name)
        )
    ) THEN
      INSERT INTO public.census_members (
        policy_id, policy_number, policy_name, company_id, company_name, insurance_company_name,
        start_date, expiry_date, tpa_name, member_full_name, national_id, date_of_birth,
        gender, relation, plan_category, location, department, job_title, mobile_number, addition_date,
        deletion_date, notes, staff_code, member_id_insurance, member_id_tpa, full_name_arabic,
        marital_status, bank_name, bank_account, iban, principle_id, premium, status, attachments
      ) VALUES (
        NEW.policy_id, v_policy_number, v_policy_name, v_company_id, v_company_name, v_insurer_name,
        v_start_date, v_expiry_date, v_tpa_name, NEW.member_name, NEW.national_id, NEW.date_of_birth,
        NEW.gender, NEW.relation, NEW.plan_category, NEW.location, NEW.department, NEW.job_title, NEW.mobile_number, NEW.addition_date,
        NEW.deletion_date, NEW.notes, NEW.staff_code, NEW.member_id_insurance, NEW.member_id_tpa, NEW.full_name_arabic,
        NEW.marital_status, NEW.bank_name, NEW.bank_account, NEW.iban, NEW.principle_id, NEW.premium,
        CASE WHEN NEW.deletion_date IS NULL THEN 'active' ELSE 'cancelled' END,
        COALESCE(NEW.attachments, '[]'::jsonb)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.census_members
    SET
      member_full_name = NEW.member_name,
      national_id = NEW.national_id,
      date_of_birth = NEW.date_of_birth,
      gender = NEW.gender,
      relation = NEW.relation,
      plan_category = NEW.plan_category,
      location = NEW.location,
      department = NEW.department,
      job_title = NEW.job_title,
      mobile_number = NEW.mobile_number,
      addition_date = NEW.addition_date,
      deletion_date = NEW.deletion_date,
      notes = NEW.notes,
      staff_code = NEW.staff_code,
      member_id_insurance = NEW.member_id_insurance,
      member_id_tpa = NEW.member_id_tpa,
      full_name_arabic = NEW.full_name_arabic,
      marital_status = NEW.marital_status,
      bank_name = NEW.bank_name,
      bank_account = NEW.bank_account,
      iban = NEW.iban,
      principle_id = NEW.principle_id,
      premium = NEW.premium,
      attachments = COALESCE(NEW.attachments, attachments),
      status = CASE WHEN NEW.deletion_date IS NULL THEN 'active' ELSE 'cancelled' END
    WHERE policy_id = NEW.policy_id 
      AND (
        (NEW.national_id IS NOT NULL AND national_id = NEW.national_id) 
        OR (member_full_name = NEW.member_name)
      );
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.census_members 
    WHERE policy_id = OLD.policy_id 
      AND (
        (OLD.national_id IS NOT NULL AND national_id = OLD.national_id) 
        OR (member_full_name = OLD.member_name)
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
