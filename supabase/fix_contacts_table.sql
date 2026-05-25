-- Add missing columns to public.contacts for polymorphic relation and universal CRM sync
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linked_policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS primary_phone text;

-- Backfill entity_type for existing records
UPDATE public.contacts 
SET entity_type = 'company', entity_id = company_id 
WHERE company_id IS NOT NULL AND entity_type IS NULL;
