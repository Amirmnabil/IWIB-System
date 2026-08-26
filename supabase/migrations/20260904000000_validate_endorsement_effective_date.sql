-- Trigger to prevent inserting or updating endorsements with effective date in the past
CREATE OR REPLACE FUNCTION public.validate_endorsement_effective_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.effective_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Effective date cannot be in the past. Date received: %, Current date: %', NEW.effective_date, CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_endorsement_effective_date ON public.endorsements;

CREATE TRIGGER trg_validate_endorsement_effective_date
BEFORE INSERT OR UPDATE ON public.endorsements
FOR EACH ROW
EXECUTE FUNCTION public.validate_endorsement_effective_date();
