-- Function to sync primary contact details to the companies table
CREATE OR REPLACE FUNCTION public.sync_company_primary_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_mobile TEXT;
  v_contact_name TEXT;
  v_contact_phone TEXT;
BEGIN
  -- Determine which company_id to update
  IF (TG_OP = 'DELETE') THEN
    v_company_id := OLD.company_id;
  ELSE
    v_company_id := NEW.company_id;
  END IF;

  IF v_company_id IS NOT NULL THEN
    -- Find the primary contact for this company.
    -- Priority: 1. is_primary = true, 2. oldest created_at
    SELECT first_name, last_name, email, phone, mobile
    INTO v_first_name, v_last_name, v_email, v_phone, v_mobile
    FROM public.contacts
    WHERE company_id = v_company_id
    ORDER BY is_primary DESC, created_at ASC
    LIMIT 1;

    IF FOUND THEN
      v_contact_name := rtrim(concat(v_first_name, ' ', v_last_name));
      -- Use phone, fallback to mobile
      v_contact_phone := COALESCE(v_phone, v_mobile);

      UPDATE public.companies
      SET primary_contact_name = v_contact_name,
          primary_contact_phone = v_contact_phone,
          primary_contact_email = v_email
      WHERE id = v_company_id;
    ELSE
      -- No contacts left, set to NULL
      UPDATE public.companies
      SET primary_contact_name = NULL,
          primary_contact_phone = NULL,
          primary_contact_email = NULL
      WHERE id = v_company_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync primary contact details
DROP TRIGGER IF EXISTS trg_sync_company_primary_contact ON public.contacts;
CREATE TRIGGER trg_sync_company_primary_contact
AFTER INSERT OR UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.sync_company_primary_contact();

-- One-time backfill to sync all existing companies
UPDATE public.companies c
SET 
  primary_contact_name = sub.name,
  primary_contact_phone = sub.phone,
  primary_contact_email = sub.email
FROM (
  SELECT DISTINCT ON (company_id)
    company_id,
    rtrim(concat(first_name, ' ', last_name)) AS name,
    COALESCE(phone, mobile) AS phone,
    email
  FROM public.contacts
  ORDER BY company_id, is_primary DESC, created_at ASC
) sub
WHERE c.id = sub.company_id;
