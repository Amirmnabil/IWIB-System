-- Add netting fields to installments
ALTER TABLE public.installments 
ADD COLUMN IF NOT EXISTS financial_direction text CHECK (financial_direction IN ('Debit', 'Credit')) DEFAULT 'Debit',
ADD COLUMN IF NOT EXISTS settled_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount numeric;

-- Backfill existing records
UPDATE public.installments 
SET remaining_amount = amount, settled_amount = 0 
WHERE remaining_amount IS NULL;

-- Create trigger to auto-set remaining_amount on insert if not provided
CREATE OR REPLACE FUNCTION set_initial_remaining_amount()
RETURNS trigger AS $$
BEGIN
    IF NEW.remaining_amount IS NULL THEN
        NEW.remaining_amount := NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_installments_remaining_amount ON public.installments;
CREATE TRIGGER trg_installments_remaining_amount
BEFORE INSERT ON public.installments
FOR EACH ROW EXECUTE FUNCTION set_initial_remaining_amount();

-- Create invoice_netting table
CREATE TABLE IF NOT EXISTS public.invoice_netting (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_invoice_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
    target_invoice_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    CONSTRAINT no_self_netting CHECK (source_invoice_id != target_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_netting_source ON public.invoice_netting(source_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_netting_target ON public.invoice_netting(target_invoice_id);

ALTER TABLE public.invoice_netting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" 
  ON public.invoice_netting FOR ALL USING (auth.role() = 'authenticated');

-- Atomic Netting RPC
CREATE OR REPLACE FUNCTION net_invoices(
  p_source_id uuid,
  p_target_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source record;
  v_target record;
  v_remaining_source numeric;
  v_remaining_target numeric;
  v_apply_amount numeric;
  v_target_id uuid;
BEGIN
  -- 1. Lock and fetch source
  SELECT * INTO v_source FROM public.installments WHERE id = p_source_id FOR UPDATE;
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Source invoice not found';
  END IF;

  v_remaining_source := COALESCE(v_source.remaining_amount, v_source.amount);
  IF v_remaining_source <= 0 THEN
    RAISE EXCEPTION 'Source invoice has no remaining amount to settle';
  END IF;

  -- 2. Loop targets and apply netting
  FOREACH v_target_id IN ARRAY p_target_ids
  LOOP
    IF v_remaining_source <= 0 THEN
      EXIT;
    END IF;

    -- Lock and fetch target
    SELECT * INTO v_target FROM public.installments WHERE id = v_target_id FOR UPDATE;
    IF v_target IS NULL THEN
      CONTINUE;
    END IF;

    IF v_target.policy_id != v_source.policy_id THEN
      RAISE EXCEPTION 'Cannot net invoices from different policies';
    END IF;

    IF v_target.id = v_source.id THEN
      RAISE EXCEPTION 'Cannot net an invoice against itself';
    END IF;

    IF COALESCE(v_target.financial_direction, 'Debit') = COALESCE(v_source.financial_direction, 'Debit') THEN
      RAISE EXCEPTION 'Cannot net invoices with the same financial direction';
    END IF;

    v_remaining_target := COALESCE(v_target.remaining_amount, v_target.amount);
    IF v_remaining_target <= 0 THEN
      CONTINUE;
    END IF;

    v_apply_amount := LEAST(v_remaining_source, v_remaining_target);

    -- Insert netting record
    INSERT INTO public.invoice_netting (source_invoice_id, target_invoice_id, amount)
    VALUES (v_source.id, v_target.id, v_apply_amount);

    -- Update target
    v_remaining_target := v_remaining_target - v_apply_amount;
    UPDATE public.installments
    SET 
      settled_amount = COALESCE(settled_amount, 0) + v_apply_amount,
      remaining_amount = v_remaining_target,
      status = CASE WHEN v_remaining_target = 0 THEN 'Settled' ELSE 'Partially Settled' END
    WHERE id = v_target.id;

    v_remaining_source := v_remaining_source - v_apply_amount;
  END LOOP;

  -- 3. Update source
  UPDATE public.installments
  SET 
    settled_amount = COALESCE(settled_amount, 0) + (COALESCE(v_source.remaining_amount, v_source.amount) - v_remaining_source),
    remaining_amount = v_remaining_source,
    status = CASE WHEN v_remaining_source = 0 THEN 'Settled' ELSE 'Partially Settled' END
  WHERE id = v_source.id;

END;
$$;

-- Atomic Reverse Netting RPC
CREATE OR REPLACE FUNCTION reverse_netting(
  p_netting_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_netting record;
  v_source record;
  v_target record;
  v_src_rem numeric;
  v_tgt_rem numeric;
BEGIN
  -- 1. Lock and fetch netting record
  SELECT * INTO v_netting FROM public.invoice_netting WHERE id = p_netting_id FOR UPDATE;
  IF v_netting IS NULL THEN
    RAISE EXCEPTION 'Netting record not found';
  END IF;

  -- 2. Lock and fetch source and target
  SELECT * INTO v_source FROM public.installments WHERE id = v_netting.source_invoice_id FOR UPDATE;
  SELECT * INTO v_target FROM public.installments WHERE id = v_netting.target_invoice_id FOR UPDATE;

  -- 3. Revert source
  v_src_rem := COALESCE(v_source.remaining_amount, v_source.amount) + v_netting.amount;
  UPDATE public.installments
  SET 
    settled_amount = GREATEST(0, COALESCE(settled_amount, 0) - v_netting.amount),
    remaining_amount = v_src_rem,
    status = CASE WHEN v_src_rem = amount THEN (CASE WHEN issue_date IS NOT NULL THEN 'Issued' ELSE 'Pending' END) ELSE 'Partially Settled' END
  WHERE id = v_source.id;

  -- 4. Revert target
  v_tgt_rem := COALESCE(v_target.remaining_amount, v_target.amount) + v_netting.amount;
  UPDATE public.installments
  SET 
    settled_amount = GREATEST(0, COALESCE(settled_amount, 0) - v_netting.amount),
    remaining_amount = v_tgt_rem,
    status = CASE WHEN v_tgt_rem = amount THEN (CASE WHEN issue_date IS NOT NULL THEN 'Issued' ELSE 'Pending' END) ELSE 'Partially Settled' END
  WHERE id = v_target.id;

  -- 5. Delete netting record
  DELETE FROM public.invoice_netting WHERE id = p_netting_id;

END;
$$;
