-- Migration to align policy_members and census_members tables and fix sync trigger

-- 1. policy_members table adjustments
DO $$
BEGIN
  -- Rename member_code to member_id_tpa if member_code exists and member_id_tpa does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'policy_members' 
      AND column_name = 'member_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'policy_members' 
      AND column_name = 'member_id_tpa'
  ) THEN
    ALTER TABLE public.policy_members RENAME COLUMN member_code TO member_id_tpa;
  END IF;
END $$;

ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS member_id_tpa TEXT;
ALTER TABLE public.policy_members ADD COLUMN IF NOT EXISTS member_id_insurance TEXT;

-- 2. census_members table adjustments
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS member_id_insurance TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS staff_code TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS member_id_tpa TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS addition_date DATE;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS deletion_date DATE;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS premium NUMERIC;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS policy_name TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS insurance_company_name TEXT;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.census_members ADD COLUMN IF NOT EXISTS tpa_name TEXT;

-- 3. Re-create the sync trigger function with correct column names mapping
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
    -- Check if already exists in census_members
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
        marital_status, bank_name, bank_account, iban, principle_id, premium, status
      ) VALUES (
        NEW.policy_id, v_policy_number, v_policy_name, v_company_id, v_company_name, v_insurer_name,
        v_start_date, v_expiry_date, v_tpa_name, NEW.member_name, NEW.national_id, NEW.date_of_birth,
        NEW.gender, NEW.relation, NEW.plan_category, NEW.location, NEW.department, NEW.job_title, NEW.mobile_number, NEW.addition_date,
        NEW.deletion_date, NEW.notes, NEW.staff_code, NEW.member_id_insurance, NEW.member_id_tpa, NEW.full_name_arabic,
        NEW.marital_status, NEW.bank_name, NEW.bank_account, NEW.iban, NEW.principle_id, NEW.premium,
        CASE WHEN NEW.deletion_date IS NULL THEN 'active' ELSE 'cancelled' END
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
      status = CASE WHEN NEW.deletion_date IS NULL THEN 'active' ELSE 'cancelled' END
    WHERE policy_id = NEW.policy_id 
      AND (
        (national_id IS NOT NULL AND national_id = OLD.national_id) 
        OR (member_full_name = OLD.member_name)
      );
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.census_members
    WHERE policy_id = OLD.policy_id 
      AND (
        (national_id IS NOT NULL AND national_id = OLD.national_id) 
        OR (member_full_name = OLD.member_name)
      );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_policy_member_to_census ON public.policy_members;
CREATE TRIGGER trg_sync_policy_member_to_census
AFTER INSERT OR UPDATE OR DELETE ON public.policy_members
FOR EACH ROW EXECUTE FUNCTION public.sync_policy_member_to_census();

-- 4. Re-define get_auth_user_company_id helper with fallback to policy's company if company_id is null
CREATE OR REPLACE FUNCTION public.get_auth_user_company_id() RETURNS uuid AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Try to get company_id directly from public.users
  SELECT company_id INTO v_company_id FROM public.users WHERE id = auth.uid();
  
  -- Fallback: If null, resolve via the user's policy_id
  IF v_company_id IS NULL THEN
    SELECT p.client_company_id INTO v_company_id 
    FROM public.users u
    JOIN public.policies p ON u.policy_id = p.id
    WHERE u.id = auth.uid();
  END IF;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

