-- Migration: scope_client_portal_rls and needs_review column
-- Created: 2026-08-29 00:00:00

-- 1. Add needs_review column to endorsement_items table
ALTER TABLE public.endorsement_items ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- 2. Define user portal helpers (STABLE, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_auth_user_company_id() RETURNS uuid AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_policy_id() RETURNS uuid AS $$
  SELECT policy_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_role() RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Re-define process_endorsement_invoicing to handle needs_review column
CREATE OR REPLACE FUNCTION public.process_endorsement_invoicing(
  p_endorsement_id uuid,
  p_invoice_number text,
  p_invoice_type text,
  p_issue_date date,
  p_due_date date,
  p_amount_due numeric,
  p_notes text,
  p_computed_premium_impact numeric,
  p_computed_sum_insured_impact numeric,
  p_items_to_update jsonb,
  p_members_to_insert jsonb,
  p_members_to_delete jsonb,
  p_audit_logs_to_insert jsonb,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_endorsement_status text;
  v_policy_id uuid;
  v_client_id uuid;
  v_lob text;
  v_endorsement_number text;
  v_effective_date date;
  v_source text;
  v_invoice_id uuid := null;
  v_fin_mov_id uuid;
  v_item record;
  v_member record;
  v_del record;
  v_log record;
  v_lob_ref_id uuid;
  v_type_ref_id uuid;
  v_dir_ref_id uuid;
  v_status_ref_id uuid;
  v_main_m record;
  v_dependent_termination_on_main_delete boolean := true;
  v_user_name text;
BEGIN
  -- 1. Lock and fetch endorsement details
  SELECT status, policy_id, client_id, line_of_business, endorsement_number, effective_date, source
  INTO v_endorsement_status, v_policy_id, v_client_id, v_lob, v_endorsement_number, v_effective_date, v_source
  FROM public.endorsements
  WHERE id = p_endorsement_id
  FOR UPDATE;

  IF v_endorsement_status IS NULL THEN
    RAISE EXCEPTION 'Endorsement not found';
  END IF;

  IF v_endorsement_status = 'Invoiced' THEN
    RAISE EXCEPTION 'Endorsement is already invoiced';
  END IF;

  -- Get user name for audit logs
  SELECT name INTO v_user_name FROM public.users WHERE id = p_user_id;

  -- 2. Update endorsement items computed premiums & needs_review flag
  IF p_items_to_update IS NOT NULL AND jsonb_array_length(p_items_to_update) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_to_update) AS x(id uuid, premium numeric, needs_review boolean)
    LOOP
      UPDATE public.endorsement_items
      SET 
        premium = v_item.premium,
        needs_review = COALESCE(v_item.needs_review, false)
      WHERE id = v_item.id;
    END LOOP;
  END IF;

  -- 3. Insert policy members additions
  IF p_members_to_insert IS NOT NULL AND jsonb_array_length(p_members_to_insert) > 0 THEN
    FOR v_member IN SELECT * FROM jsonb_to_recordset(p_members_to_insert) AS x(
      policy_id uuid,
      member_name text,
      date_of_birth date,
      gender text,
      relation text,
      nationality text,
      national_id text,
      plan_category text,
      location text,
      department text,
      job_title text,
      mobile_number text,
      addition_date date,
      linked_main_member_id uuid,
      full_name_arabic text,
      marital_status text,
      bank_name text,
      bank_account text,
      iban text,
      principle_id text,
      notes text
    )
    LOOP
      INSERT INTO public.policy_members (
        policy_id, member_name, date_of_birth, gender, relation, nationality,
        national_id, plan_category, location, department, job_title, mobile_number,
        addition_date, linked_main_member_id, full_name_arabic, marital_status, bank_name,
        bank_account, iban, principle_id, notes
      ) VALUES (
        v_member.policy_id, v_member.member_name, v_member.date_of_birth, v_member.gender, v_member.relation, v_member.nationality,
        v_member.national_id, v_member.plan_category, v_member.location, v_member.department, v_member.job_title, v_member.mobile_number,
        v_member.addition_date, v_member.linked_main_member_id, v_member.full_name_arabic, v_member.marital_status, v_member.bank_name,
        v_member.bank_account, v_member.iban, v_member.principle_id, v_member.notes
      );
    END LOOP;
  END IF;

  -- 4. Apply policy members deletions & cascade updates
  IF p_members_to_delete IS NOT NULL AND jsonb_array_length(p_members_to_delete) > 0 THEN
    -- Get dependent_termination_on_main_delete setting from insurer rules
    SELECT COALESCE(ier.dependent_termination_on_main_delete, true) INTO v_dependent_termination_on_main_delete
    FROM public.policies p
    JOIN public.insurer_endorsement_rules ier ON p.insurer_id = ier.insurer_id
    WHERE p.id = v_policy_id;

    FOR v_del IN SELECT * FROM jsonb_to_recordset(p_members_to_delete) AS x(national_id text, name text, relation text)
    LOOP
      IF v_del.national_id IS NOT NULL AND v_del.national_id <> '' THEN
        -- Cancel main member by national_id
        FOR v_main_m IN 
          UPDATE public.policy_members
          SET deletion_date = v_effective_date
          WHERE policy_id = v_policy_id AND national_id = v_del.national_id AND deletion_date IS NULL
          RETURNING id
        LOOP
          -- Cascade to dependents
          IF v_dependent_termination_on_main_delete AND (lower(v_del.relation) = 'employee' OR lower(v_del.relation) = 'principal') THEN
            UPDATE public.policy_members
            SET deletion_date = v_effective_date
            WHERE linked_main_member_id = v_main_m.id AND deletion_date IS NULL;
          END IF;
        END LOOP;
      ELSE
        -- Cancel main member by name
        FOR v_main_m IN 
          UPDATE public.policy_members
          SET deletion_date = v_effective_date
          WHERE policy_id = v_policy_id AND member_name = v_del.name AND deletion_date IS NULL
          RETURNING id
        LOOP
          -- Cascade to dependents
          IF v_dependent_termination_on_main_delete AND (lower(v_del.relation) = 'employee' OR lower(v_del.relation) = 'principal') THEN
            UPDATE public.policy_members
            SET deletion_date = v_effective_date
            WHERE linked_main_member_id = v_main_m.id AND deletion_date IS NULL;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 5. Non-Financial vs Financial processing
  IF p_computed_premium_impact = 0 THEN
    -- Update endorsement status to Approved
    UPDATE public.endorsements
    SET 
      status = 'Approved',
      premium_impact = p_computed_premium_impact,
      sum_insured_impact = p_computed_sum_insured_impact
    WHERE id = p_endorsement_id;

    -- Write parent approval log
    INSERT INTO public.audit_logs (action, resource_type, resource_id, resource_name, changes, user_id, user_name)
    VALUES (
      'APPROVE_ENDORSEMENT',
      'endorsement',
      p_endorsement_id,
      v_endorsement_number,
      jsonb_build_object(
        'old_status', v_endorsement_status,
        'new_status', 'Approved',
        'premium_impact', 0,
        'source', COALESCE(v_source, 'Client Portal')
      ),
      p_user_id,
      v_user_name
    );
  ELSE
    -- 6. Insert invoice record
    INSERT INTO public.invoices (
      invoice_number, client_company_id, client_company_name, policy_id, policy_number,
      insurer_id, insurer_name, invoice_type, issue_date, due_date, amount_due, amount_paid, status, notes
    )
    SELECT
      p_invoice_number, p_details.client_company_id, p_details.client_company_name, v_policy_id, p_details.policy_number,
      p_details.insurer_id, p_details.insurer_name, p_invoice_type, p_issue_date, p_due_date, p_amount_due, 0,
      CASE WHEN p_computed_premium_impact < 0 THEN 'paid' ELSE 'unpaid' END,
      p_notes
    FROM (
      SELECT
        p.client_company_id, p.client_company_name, p.policy_number, p.insurer_id, p.insurer_name
      FROM public.policies p
      WHERE p.id = v_policy_id
    ) p_details
    RETURNING id INTO v_invoice_id;

    -- 7. Link financial movements if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'policy_financial_movements') THEN
      SELECT id INTO v_lob_ref_id FROM public.reference_list WHERE category = 'line_of_business' AND key = 'MEDICAL';
      SELECT id INTO v_type_ref_id FROM public.reference_list WHERE category = 'transaction_type' AND key = (CASE WHEN p_computed_premium_impact >= 0 THEN 'ADDITION' ELSE 'REFUND' END);
      SELECT id INTO v_dir_ref_id FROM public.reference_list WHERE category = 'financial_direction' AND key = (CASE WHEN p_computed_premium_impact >= 0 THEN 'DEBIT' ELSE 'CREDIT' END);
      SELECT id INTO v_status_ref_id FROM public.reference_list WHERE category = 'movement_status' AND key = 'APPLIED';

      IF v_lob_ref_id IS NOT NULL AND v_type_ref_id IS NOT NULL AND v_dir_ref_id IS NOT NULL AND v_status_ref_id IS NOT NULL THEN
        INSERT INTO public.policy_financial_movements (
          policy_id, line_of_business, type, financial_direction, amount, description, transaction_date, status
        ) VALUES (
          v_policy_id, v_lob_ref_id, v_type_ref_id, v_dir_ref_id, abs(p_computed_premium_impact),
          'Financial movement for Endorsement: ' || v_endorsement_number, p_issue_date, v_status_ref_id
        ) RETURNING id INTO v_fin_mov_id;

        IF v_fin_mov_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_financial_movements') THEN
          INSERT INTO public.invoice_financial_movements (invoice_id, movement_id)
          VALUES (v_invoice_id, v_fin_mov_id);
        END IF;
      END IF;
    END IF;

    -- 8. Update endorsement status to Invoiced and link invoice
    UPDATE public.endorsements
    SET
      linked_invoice_id = v_invoice_id,
      status = 'Invoiced',
      premium_impact = p_computed_premium_impact,
      sum_insured_impact = p_computed_sum_insured_impact
    WHERE id = p_endorsement_id;

    -- 9. Insert parent audit log for Invoicing
    INSERT INTO public.audit_logs (action, resource_type, resource_id, resource_name, changes, user_id, user_name)
    VALUES (
      'APPROVE_ENDORSEMENT',
      'endorsement',
      p_endorsement_id,
      v_endorsement_number,
      jsonb_build_object(
        'old_status', v_endorsement_status,
        'new_status', 'Invoiced',
        'premium_impact', p_computed_premium_impact,
        'source', COALESCE(v_source, 'Client Portal')
      ),
      p_user_id,
      v_user_name
    );
  END IF;

  -- 10. Write items audit logs
  IF p_audit_logs_to_insert IS NOT NULL AND jsonb_array_length(p_audit_logs_to_insert) > 0 THEN
    FOR v_log IN SELECT * FROM jsonb_to_recordset(p_audit_logs_to_insert) AS x(
      action text,
      resource_type text,
      resource_id uuid,
      resource_name text,
      changes jsonb
    )
    LOOP
      INSERT INTO public.audit_logs (action, resource_type, resource_id, resource_name, changes, user_id, user_name)
      VALUES (v_log.action, v_log.resource_type, v_log.resource_id, v_log.resource_name, v_log.changes, p_user_id, v_user_name);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', p_invoice_number,
    'status', CASE WHEN p_computed_premium_impact = 0 THEN 'Approved' ELSE 'Invoiced' END
  );
END;
$$;

-- 4. Scope RLS policies for Client Portal role

-- A. COMPANIES Table
DROP POLICY IF EXISTS "Users can see assigned companies or all if admin" ON public.companies;
DROP POLICY IF EXISTS "Users can update assigned companies or all if admin" ON public.companies;
DROP POLICY IF EXISTS "Users can delete assigned companies or all if admin" ON public.companies;

CREATE POLICY "Users can see assigned companies or all if admin" ON public.companies FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR assigned_user_id = auth.uid()::text OR id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can update assigned companies or all if admin" ON public.companies FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR assigned_user_id = auth.uid()::text OR id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can delete assigned companies or all if admin" ON public.companies FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR assigned_user_id = auth.uid()::text
);

-- B. POLICIES Table
DROP POLICY IF EXISTS "Users can see policies of assigned companies or all if admin" ON public.policies;
DROP POLICY IF EXISTS "Users can insert policies of assigned companies or all if admin" ON public.policies;
DROP POLICY IF EXISTS "Users can update policies of assigned companies or all if admin" ON public.policies;
DROP POLICY IF EXISTS "Users can delete policies of assigned companies or all if admin" ON public.policies;

CREATE POLICY "Users can see policies of assigned companies or all if admin" ON public.policies FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id() OR id = public.get_auth_user_policy_id()
);

CREATE POLICY "Users can insert policies of assigned companies or all if admin" ON public.policies FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can update policies of assigned companies or all if admin" ON public.policies FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id() OR id = public.get_auth_user_policy_id()
);

CREATE POLICY "Users can delete policies of assigned companies or all if admin" ON public.policies FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- C. CENSUS_MEMBERS Table
DROP POLICY IF EXISTS "Users can see census members" ON public.census_members;
DROP POLICY IF EXISTS "Users can manage census members" ON public.census_members;

CREATE POLICY "Users can see census members" ON public.census_members FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR policy_id = public.get_auth_user_policy_id() OR policy_id IN (
    SELECT id FROM public.policies WHERE client_company_id = public.get_auth_user_company_id()
  )
);

CREATE POLICY "Users can manage census members" ON public.census_members FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR policy_id = public.get_auth_user_policy_id() OR policy_id IN (
    SELECT id FROM public.policies WHERE client_company_id = public.get_auth_user_company_id()
  )
);

-- D. ENDORSEMENTS Table
DROP POLICY IF EXISTS "Authenticated users can select endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Authenticated users can manage endorsements" ON public.endorsements;

CREATE POLICY "Users can see endorsements of allowed companies" ON public.endorsements FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_id = public.get_auth_user_company_id() OR client_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can manage endorsements of allowed companies" ON public.endorsements FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() OR client_id = public.get_auth_user_company_id() OR client_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- E. INVOICES Table
DROP POLICY IF EXISTS "Users can see invoices of assigned companies or all if admin" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices of assigned companies or all if admin" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices of assigned companies or all if admin" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices of assigned companies or all if admin" ON public.invoices;

CREATE POLICY "Users can see invoices of assigned companies or all if admin" ON public.invoices FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can insert invoices of assigned companies or all if admin" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can update invoices of assigned companies or all if admin" ON public.invoices FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  ) OR client_company_id = public.get_auth_user_company_id()
);

CREATE POLICY "Users can delete invoices of assigned companies or all if admin" ON public.invoices FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- 5. Synchronize policy_members to census_members automatically

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
        gender, relation, category, branch, department, job_title, mobile_number, addition_date,
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
      category = NEW.plan_category,
      branch = NEW.location,
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
