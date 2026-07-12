-- Create helper function for admin/manager check
CREATE OR REPLACE FUNCTION public.is_admin_or_manager() RETURNS boolean AS $$
DECLARE
  has_access boolean;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN false; END IF;

  -- Check users table for direct admin flag
  SELECT is_admin INTO has_access FROM public.users WHERE id = v_uid;
  IF has_access THEN RETURN true; END IF;

  -- Check user_roles for Admin, Management, or Manager role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_uid AND (r.name ILIKE 'Admin' OR r.name ILIKE 'Management' OR r.name ILIKE 'Manager')
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. COMPANIES POLICY
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Users can see assigned companies or all if admin" ON public.companies;
DROP POLICY IF EXISTS "Users can update assigned companies or all if admin" ON public.companies;
DROP POLICY IF EXISTS "Users can delete assigned companies or all if admin" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;

CREATE POLICY "Users can see assigned companies or all if admin" ON public.companies FOR SELECT TO authenticated
USING (
  assigned_user_id = auth.uid()::text OR public.is_admin_or_manager()
);

CREATE POLICY "Users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update assigned companies or all if admin" ON public.companies FOR UPDATE TO authenticated
USING (
  assigned_user_id = auth.uid()::text OR public.is_admin_or_manager()
);

CREATE POLICY "Users can delete assigned companies or all if admin" ON public.companies FOR DELETE TO authenticated
USING (
  assigned_user_id = auth.uid()::text OR public.is_admin_or_manager()
);

-- 2. LEADS POLICY
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Users can see assigned leads or all if admin" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads or all if admin" ON public.leads;
DROP POLICY IF EXISTS "Users can delete assigned leads or all if admin" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;

CREATE POLICY "Users can see assigned leads or all if admin" ON public.leads FOR SELECT TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

CREATE POLICY "Users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update assigned leads or all if admin" ON public.leads FOR UPDATE TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

CREATE POLICY "Users can delete assigned leads or all if admin" ON public.leads FOR DELETE TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

-- 3. PROSPECTS POLICY
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.prospects;
DROP POLICY IF EXISTS "Users can see assigned prospects or all if admin" ON public.prospects;
DROP POLICY IF EXISTS "Users can update assigned prospects or all if admin" ON public.prospects;
DROP POLICY IF EXISTS "Users can delete assigned prospects or all if admin" ON public.prospects;
DROP POLICY IF EXISTS "Users can insert prospects" ON public.prospects;

CREATE POLICY "Users can see assigned prospects or all if admin" ON public.prospects FOR SELECT TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

CREATE POLICY "Users can insert prospects" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update assigned prospects or all if admin" ON public.prospects FOR UPDATE TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

CREATE POLICY "Users can delete assigned prospects or all if admin" ON public.prospects FOR DELETE TO authenticated
USING (
  assigned_user_id = auth.uid() OR public.is_admin_or_manager()
);

-- 4. CONTACTS POLICY
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Users can see contacts of assigned companies or all if admin" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts of assigned companies or all if admin" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts of assigned companies or all if admin" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON public.contacts;

CREATE POLICY "Users can see contacts of assigned companies or all if admin" ON public.contacts FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update contacts of assigned companies or all if admin" ON public.contacts FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete contacts of assigned companies or all if admin" ON public.contacts FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);
