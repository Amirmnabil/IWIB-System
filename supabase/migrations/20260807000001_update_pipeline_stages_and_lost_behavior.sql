-- ============================================================
-- IWIB — Update Pipeline Stages, Reopen Lost Prospects, Sync Notes
-- Migration: 20260807000001_update_pipeline_stages_and_lost_behavior.sql
-- ============================================================

-- 1. Truncate and insert updated stages
TRUNCATE TABLE public.master_pipeline_stages CASCADE;

INSERT INTO public.master_pipeline_stages (name, code, "order") VALUES
('Qualification', 'qualification', 1),
('Proposal sent', 'proposal_sent', 2),
('Needs adjustments', 'needs_adjustments', 3),
('Negotiation', 'negotiation', 4),
('Won', 'closed_won', 5),
('Lost', 'closed_lost', 6);

-- 2. Migrate existing prospects with legacy stages to new ones
UPDATE public.prospects 
SET pipeline_stage = 'proposal_sent' 
WHERE pipeline_stage = 'needs_analysis';

UPDATE public.prospects 
SET pipeline_stage = 'needs_adjustments' 
WHERE pipeline_stage = 'proposal';

-- 3. Create or replace trigger function for reopening lost prospects
CREATE OR REPLACE FUNCTION public.reopen_lost_prospect_on_appointment_or_quote()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Triggered by company status update (e.g. Telesales workflow logged meeting or quote)
  IF TG_TABLE_NAME = 'companies' THEN
    IF (NEW.status = 'request_meeting' OR NEW.status = 'request_quotation') THEN
      UPDATE public.prospects
      SET pipeline_stage = 'qualification'
      WHERE company_id = NEW.id AND pipeline_stage = 'closed_lost';
    END IF;
  END IF;

  -- B. Triggered by activities insertion/update (e.g. New meeting/appointment scheduled)
  IF TG_TABLE_NAME = 'activities' THEN
    IF NEW.activity_type = 'meeting' THEN
      IF NEW.related_type = 'company' AND NEW.related_id IS NOT NULL THEN
        UPDATE public.prospects
        SET pipeline_stage = 'qualification'
        WHERE company_id = NEW.related_id AND pipeline_stage = 'closed_lost';
      ELSIF NEW.related_type = 'prospect' AND NEW.related_id IS NOT NULL THEN
        UPDATE public.prospects
        SET pipeline_stage = 'qualification'
        WHERE id = NEW.related_id AND pipeline_stage = 'closed_lost';
      ELSIF NEW.related_type = 'lead' AND NEW.related_id IS NOT NULL THEN
        UPDATE public.prospects p
        SET pipeline_stage = 'qualification'
        FROM public.leads l
        WHERE p.company_id = l.company_id 
          AND l.id = NEW.related_id 
          AND p.pipeline_stage = 'closed_lost';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers for reopening
DROP TRIGGER IF EXISTS trg_reopen_lost_prospect_company ON public.companies;
CREATE TRIGGER trg_reopen_lost_prospect_company
  AFTER UPDATE OF status ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.reopen_lost_prospect_on_appointment_or_quote();

DROP TRIGGER IF EXISTS trg_reopen_lost_prospect_activity ON public.activities;
CREATE TRIGGER trg_reopen_lost_prospect_activity
  AFTER INSERT OR UPDATE OF activity_type, related_id, related_type ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.reopen_lost_prospect_on_appointment_or_quote();

-- 4. Create or replace trigger function to sync notes from prospect to company
CREATE OR REPLACE FUNCTION public.copy_prospect_notes_to_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    UPDATE public.companies
    SET notes = NEW.notes,
        updated_at = timezone('utc', now())
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger for notes sync
DROP TRIGGER IF EXISTS trg_copy_prospect_notes_to_company ON public.prospects;
CREATE TRIGGER trg_copy_prospect_notes_to_company
  AFTER INSERT OR UPDATE OF notes ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_prospect_notes_to_company();
