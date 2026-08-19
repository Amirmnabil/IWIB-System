-- Migration to add insurer fields to invoices table

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS insurer_id uuid REFERENCES public.insurance_companies(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS insurer_name text;
