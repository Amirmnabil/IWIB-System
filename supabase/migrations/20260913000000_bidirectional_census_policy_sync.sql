-- Migration: Bidirectional sync between census_members and policy_members
-- Ensures updates in Census Database automatically sync to policy_members (Policy Census & Client Portal Beneficiaries)

-- 1. Ensure sync_policy_member_to_census prevents trigger recursion loops
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
  -- Prevent infinite trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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
        (OLD.national_id IS NOT NULL AND OLD.national_id <> '' AND national_id = OLD.national_id) 
        OR (NEW.national_id IS NOT NULL AND NEW.national_id <> '' AND national_id = NEW.national_id) 
        OR (member_full_name = OLD.member_name)
      );
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.census_members
    WHERE policy_id = OLD.policy_id 
      AND (
        (OLD.national_id IS NOT NULL AND OLD.national_id <> '' AND national_id = OLD.national_id) 
        OR (member_full_name = OLD.member_name)
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create sync_census_member_to_policy function to push updates from census_members -> policy_members
CREATE OR REPLACE FUNCTION public.sync_census_member_to_policy() RETURNS trigger AS $$
DECLARE
  v_policy_id uuid;
BEGIN
  -- Prevent infinite trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Resolve policy_id
  v_policy_id := NEW.policy_id;
  IF v_policy_id IS NULL AND NEW.policy_number IS NOT NULL AND NEW.policy_number <> '' THEN
    SELECT id INTO v_policy_id FROM public.policies WHERE policy_number = NEW.policy_number LIMIT 1;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_policy_id IS NOT NULL THEN
      UPDATE public.policy_members
      SET
        member_name = COALESCE(NEW.member_full_name, member_name),
        national_id = NEW.national_id,
        date_of_birth = NEW.date_of_birth,
        gender = NEW.gender,
        relation = CASE WHEN NEW.relation = 'Employee' THEN 'Principal' ELSE NEW.relation END,
        nationality = NEW.nationality,
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
        updated_at = timezone('utc', now())
      WHERE policy_id = v_policy_id
        AND (
          (OLD.national_id IS NOT NULL AND OLD.national_id <> '' AND national_id = OLD.national_id)
          OR (NEW.national_id IS NOT NULL AND NEW.national_id <> '' AND national_id = NEW.national_id)
          OR (member_name = OLD.member_full_name)
          OR (member_name = NEW.member_full_name)
        );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_policy_id := OLD.policy_id;
    IF v_policy_id IS NULL AND OLD.policy_number IS NOT NULL AND OLD.policy_number <> '' THEN
      SELECT id INTO v_policy_id FROM public.policies WHERE policy_number = OLD.policy_number LIMIT 1;
    END IF;

    IF v_policy_id IS NOT NULL THEN
      DELETE FROM public.policy_members
      WHERE policy_id = v_policy_id
        AND (
          (OLD.national_id IS NOT NULL AND OLD.national_id <> '' AND national_id = OLD.national_id)
          OR (member_name = OLD.member_full_name)
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_census_member_to_policy ON public.census_members;
CREATE TRIGGER trg_sync_census_member_to_policy
AFTER UPDATE OR DELETE ON public.census_members
FOR EACH ROW EXECUTE FUNCTION public.sync_census_member_to_policy();
