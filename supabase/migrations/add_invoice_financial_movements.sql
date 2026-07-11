-- Add invoice_financial_movements

CREATE TABLE IF NOT EXISTS public.invoice_financial_movements (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid references public.invoices(id) on delete cascade not null,
    movement_id uuid references public.policy_financial_movements(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    CONSTRAINT unique_invoice_movement_id UNIQUE(movement_id)
);

ALTER TABLE public.invoice_financial_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on invoice_financial_movements" 
  ON public.invoice_financial_movements FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_inv_fm_invoice_id ON public.invoice_financial_movements(invoice_id);
