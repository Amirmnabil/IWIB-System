-- Migration to ensure both approved_by and approval_by columns exist on public.endorsements
-- Prevents schema cache column mismatch errors when approving endorsements.

ALTER TABLE public.endorsements ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.endorsements ADD COLUMN IF NOT EXISTS approval_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
