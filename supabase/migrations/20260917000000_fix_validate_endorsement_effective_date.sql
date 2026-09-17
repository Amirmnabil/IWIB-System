-- Fix trigger function to prevent blocking UPDATE operations when Admins / Claim Managers edit dates or change status of Client Portal endorsements
CREATE OR REPLACE FUNCTION public.validate_endorsement_effective_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only restrict date selection to today/future for NEW Client Portal submissions (INSERT).
    -- Allow UPDATE operations so Admins and Claim Managers can edit dates, change status, and process endorsements.
    IF (TG_OP = 'INSERT') AND NEW.source = 'Client Portal' AND NEW.effective_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Effective date cannot be in the past. Date received: %, Current date: %', NEW.effective_date, CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is properly bound to public.endorsements
DROP TRIGGER IF EXISTS trg_validate_endorsement_effective_date ON public.endorsements;

CREATE TRIGGER trg_validate_endorsement_effective_date
BEFORE INSERT OR UPDATE ON public.endorsements
FOR EACH ROW
EXECUTE FUNCTION public.validate_endorsement_effective_date();

