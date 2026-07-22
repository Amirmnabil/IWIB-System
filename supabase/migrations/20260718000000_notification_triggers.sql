-- Trigger for leads
DROP TRIGGER IF EXISTS lead_evaluate_rules_trigger ON public.leads;
CREATE TRIGGER lead_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Trigger for prospects
DROP TRIGGER IF EXISTS prospect_evaluate_rules_trigger ON public.prospects;
CREATE TRIGGER prospect_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Trigger for policies
DROP TRIGGER IF EXISTS policy_evaluate_rules_trigger ON public.policies;
CREATE TRIGGER policy_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.policies
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Trigger for activities
DROP TRIGGER IF EXISTS activity_evaluate_rules_trigger ON public.activities;
CREATE TRIGGER activity_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Trigger for invoices
DROP TRIGGER IF EXISTS invoice_evaluate_rules_trigger ON public.invoices;
CREATE TRIGGER invoice_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Trigger for claims
DROP TRIGGER IF EXISTS claim_evaluate_rules_trigger ON public.claims;
CREATE TRIGGER claim_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();
