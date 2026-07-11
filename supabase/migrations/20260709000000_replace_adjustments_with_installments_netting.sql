-- 1. DROP deprecated tables and functions
DROP FUNCTION IF EXISTS public.reverse_netting(uuid);
DROP FUNCTION IF EXISTS public.net_invoices(uuid, uuid[]);

DROP TABLE IF EXISTS public.invoice_financial_movements CASCADE;
DROP TABLE IF EXISTS public.policy_financial_movements CASCADE;

-- 2. RENAME invoice_netting to installment_netting
ALTER TABLE IF EXISTS public.invoice_netting RENAME TO installment_netting;
ALTER TABLE IF EXISTS public.installment_netting RENAME COLUMN source_invoice_id TO source_installment_id;
ALTER TABLE IF EXISTS public.installment_netting RENAME COLUMN target_invoice_id TO target_installment_id;

-- Ensure indexes are renamed
ALTER INDEX IF EXISTS idx_invoice_netting_source RENAME TO idx_installment_netting_source;
ALTER INDEX IF EXISTS idx_invoice_netting_target RENAME TO idx_installment_netting_target;

-- 3. ALTER installments table
ALTER TABLE public.installments 
ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type IN ('BASE', 'ENDORSEMENT')) DEFAULT 'BASE',
ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE INDEX IF NOT EXISTS idx_installments_policy_id ON public.installments(policy_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_remaining_amount ON public.installments(remaining_amount);

-- 4. Re-create Netting Logic RPCs
CREATE OR REPLACE FUNCTION net_installments(
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
    RAISE EXCEPTION 'Source installment not found';
  END IF;

  v_remaining_source := COALESCE(v_source.remaining_amount, v_source.amount);
  IF v_remaining_source <= 0 THEN
    RAISE EXCEPTION 'Source installment has no remaining amount to settle';
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
      RAISE EXCEPTION 'Cannot net installments from different policies';
    END IF;

    IF v_target.id = v_source.id THEN
      RAISE EXCEPTION 'Cannot net an installment against itself';
    END IF;

    IF COALESCE(v_target.financial_direction, 'Debit') = COALESCE(v_source.financial_direction, 'Debit') THEN
      RAISE EXCEPTION 'Cannot net installments with the same financial direction';
    END IF;

    v_remaining_target := COALESCE(v_target.remaining_amount, v_target.amount);
    IF v_remaining_target <= 0 THEN
      CONTINUE;
    END IF;

    v_apply_amount := LEAST(v_remaining_source, v_remaining_target);

    -- Insert netting record
    INSERT INTO public.installment_netting (source_installment_id, target_installment_id, amount)
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
CREATE OR REPLACE FUNCTION reverse_installment_netting(
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
  SELECT * INTO v_netting FROM public.installment_netting WHERE id = p_netting_id FOR UPDATE;
  IF v_netting IS NULL THEN
    RAISE EXCEPTION 'Netting record not found';
  END IF;

  -- 2. Lock and fetch source and target
  SELECT * INTO v_source FROM public.installments WHERE id = v_netting.source_installment_id FOR UPDATE;
  SELECT * INTO v_target FROM public.installments WHERE id = v_netting.target_installment_id FOR UPDATE;

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
  DELETE FROM public.installment_netting WHERE id = p_netting_id;

END;
$$;
