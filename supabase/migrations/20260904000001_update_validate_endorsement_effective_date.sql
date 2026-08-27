-- Migration to allow past dates for Main System users and restrict only Client Portal users
CREATE OR REPLACE FUNCTION public.validate_endorsement_effective_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only restrict date selection to today/future for Client Portal submissions.
    IF NEW.source = 'Client Portal' AND NEW.effective_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Effective date cannot be in the past. Date received: %, Current date: %', NEW.effective_date, CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
