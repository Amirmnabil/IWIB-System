-- Migration: add custom endorsement statuses and approval fields
ALTER TABLE public.endorsements DROP CONSTRAINT IF EXISTS endorsements_status_check;
ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_status_check CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Invoiced', 'Pending', 'Issued', 'Completed'));

ALTER TABLE public.endorsements ADD COLUMN IF NOT EXISTS approval_ref text;
ALTER TABLE public.endorsements ADD COLUMN IF NOT EXISTS approval_date date;
