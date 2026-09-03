-- Migration: Fix Row-Level Security (RLS) policies for endorsements and endorsement_items
-- Timestamp: 2026-09-08 10:00:00

-- 1. Reset & rebuild policies on public.endorsements
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see endorsements of allowed companies" ON public.endorsements;
DROP POLICY IF EXISTS "Users can manage endorsements of allowed companies" ON public.endorsements;
DROP POLICY IF EXISTS "Authenticated users can select endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Authenticated users can manage endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Enable SELECT for endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Enable INSERT for endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Enable UPDATE and DELETE for endorsements" ON public.endorsements;

-- SELECT: Allow viewing endorsements relevant to user's company, policy, or created by user
CREATE POLICY "Enable SELECT for endorsements" ON public.endorsements
FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() 
  OR client_id = public.get_auth_user_company_id() 
  OR policy_id = public.get_auth_user_policy_id()
  OR policy_id IN (SELECT id FROM public.policies WHERE client_company_id = public.get_auth_user_company_id())
  OR client_id IN (SELECT id FROM public.companies WHERE assigned_user_id::text = auth.uid()::text)
  OR created_by::text = auth.uid()::text
);

-- INSERT: Allow authenticated users (including Client Portal users) to submit endorsement requests
CREATE POLICY "Enable INSERT for endorsements" ON public.endorsements
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE/DELETE: Allow managing endorsements for authorized users
CREATE POLICY "Enable UPDATE and DELETE for endorsements" ON public.endorsements
FOR ALL TO authenticated
USING (
  public.is_admin_or_manager() 
  OR client_id = public.get_auth_user_company_id() 
  OR policy_id = public.get_auth_user_policy_id()
  OR policy_id IN (SELECT id FROM public.policies WHERE client_company_id = public.get_auth_user_company_id())
  OR client_id IN (SELECT id FROM public.companies WHERE assigned_user_id::text = auth.uid()::text)
  OR created_by::text = auth.uid()::text
);


-- 2. Reset & rebuild policies on public.endorsement_items
ALTER TABLE public.endorsement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Authenticated users can manage endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Authenticated users can insert endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Authenticated users can update endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Authenticated users can delete endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Enable SELECT for endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Enable INSERT for endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Enable UPDATE and DELETE for endorsement_items" ON public.endorsement_items;
DROP POLICY IF EXISTS "Enable ALL for endorsement_items" ON public.endorsement_items;

CREATE POLICY "Enable SELECT for endorsement_items" ON public.endorsement_items
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable INSERT for endorsement_items" ON public.endorsement_items
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable ALL for endorsement_items" ON public.endorsement_items
FOR ALL TO authenticated
USING (true);
