CREATE OR REPLACE FUNCTION public.create_company_with_contacts(
  company_payload jsonb,
  contacts_payload jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_contact jsonb;
BEGIN
  INSERT INTO public.companies (
    code, name, name_ar, status, industry, employee_count, priority, city, address, 
    cr_number, tax_card, current_insurer, insurance_type, medical_subtype, 
    checklist_status, checklist_completion, expected_renewal_date, expected_offer_date, 
    actual_renewal_date, actual_offer_date, website, linkedin_page, landline, 
    assigned_user_id, assigned_user_name, source, last_contact_date, call_date, 
    follow_up_date, renewal_month, notes, client_type
  ) VALUES (
    company_payload->>'code',
    company_payload->>'name',
    company_payload->>'name_ar',
    COALESCE(company_payload->>'status', 'interested'),
    company_payload->>'industry',
    (company_payload->>'employee_count')::integer,
    COALESCE(company_payload->>'priority', 'medium'),
    company_payload->>'city',
    company_payload->>'address',
    company_payload->>'cr_number',
    company_payload->>'tax_card',
    company_payload->>'current_insurer',
    COALESCE(company_payload->>'insurance_type', 'Medical'),
    company_payload->>'medical_subtype',
    (company_payload->>'checklist_status')::jsonb,
    COALESCE(company_payload->>'checklist_completion', 'Pending'),
    company_payload->>'expected_renewal_date',
    company_payload->>'expected_offer_date',
    company_payload->>'actual_renewal_date',
    company_payload->>'actual_offer_date',
    company_payload->>'website',
    company_payload->>'linkedin_page',
    company_payload->>'landline',
    company_payload->>'assigned_user_id',
    company_payload->>'assigned_user_name',
    company_payload->>'source',
    (company_payload->>'last_contact_date')::timestamptz,
    (company_payload->>'call_date')::timestamptz,
    (company_payload->>'follow_up_date')::timestamptz,
    company_payload->>'renewal_month',
    company_payload->>'notes',
    company_payload->>'client_type'
  )
  RETURNING id INTO v_company_id;

  -- Insert contacts if provided
  IF contacts_payload IS NOT NULL AND jsonb_array_length(contacts_payload) > 0 THEN
    FOR v_contact IN SELECT * FROM jsonb_array_elements(contacts_payload)
    LOOP
      INSERT INTO public.contacts (
        company_id,
        first_name,
        last_name,
        email,
        phone,
        mobile,
        is_primary,
        role_id
      ) VALUES (
        v_company_id,
        v_contact->>'first_name',
        COALESCE(v_contact->>'last_name', ''),
        v_contact->>'email',
        v_contact->>'phone',
        v_contact->>'mobile',
        COALESCE((v_contact->>'is_primary')::boolean, false),
        (v_contact->>'role_id')::uuid
      );
    END LOOP;
  END IF;

  RETURN v_company_id;
END;
$$;
