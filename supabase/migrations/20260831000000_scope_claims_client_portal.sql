-- Migration: scope_claims_client_portal
-- Date: 2026-08-31 00:00:00

-- 1. Drop existing claims RLS policies
DROP POLICY IF EXISTS "Users can see claims of assigned companies or all if admin" ON public.claims;
DROP POLICY IF EXISTS "Users can insert claims of assigned companies or all if admin" ON public.claims;
DROP POLICY IF EXISTS "Users can update claims of assigned companies or all if admin" ON public.claims;
DROP POLICY IF EXISTS "Users can delete claims of assigned companies or all if admin" ON public.claims;

-- 2. Re-create secure scoped RLS policies on claims
CREATE POLICY "Users can see claims of allowed companies" ON public.claims FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR company_id = public.get_auth_user_company_id() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert claims of allowed companies" ON public.claims FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR company_id = public.get_auth_user_company_id() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update claims of allowed companies" ON public.claims FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id = public.get_auth_user_company_id() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete claims of allowed companies" ON public.claims FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);
