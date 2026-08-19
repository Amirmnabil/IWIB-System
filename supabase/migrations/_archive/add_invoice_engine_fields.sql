ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS tax_override numeric DEFAULT 1;
