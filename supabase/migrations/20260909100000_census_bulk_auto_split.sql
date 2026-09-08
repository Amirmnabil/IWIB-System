-- Migration: Support auto-splitting bulk census uploads into base roster + auto-approved dated endorsements

ALTER TABLE public.endorsements 
ADD COLUMN IF NOT EXISTS auto_approved boolean DEFAULT false;

-- Drop existing source check constraint if present and update to include bulk_census_upload
ALTER TABLE public.endorsements DROP CONSTRAINT IF EXISTS endorsements_source_check;

ALTER TABLE public.endorsements 
ADD CONSTRAINT endorsements_source_check 
CHECK (source IN ('Manual', 'Excel Upload', 'API', 'Client Portal', 'bulk_census_upload', 'census_auto_split'));

-- Index auto_approved for fast filtering in Endorsement Hub
CREATE INDEX IF NOT EXISTS idx_endorsements_auto_approved ON public.endorsements(auto_approved);
