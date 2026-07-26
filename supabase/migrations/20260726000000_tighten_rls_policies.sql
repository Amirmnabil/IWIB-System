-- ============================================================
-- IWIB Hub — Tighten RLS Policies & Enable RBAC Protections
-- ============================================================

DO $$
BEGIN
    -- 1. Drop wildcard select/insert/update/delete policies on policies
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.policies;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.policies;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.policies;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.policies;
    DROP POLICY IF EXISTS "Allow all" ON public.policies;

    -- 2. Drop wildcard select/insert/update/delete policies on policy_members
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.policy_members;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.policy_members;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.policy_members;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.policy_members;
    DROP POLICY IF EXISTS "Allow all for authenticated members" ON public.policy_members;

    -- 3. Drop wildcard select/insert/update/delete policies on claims
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.claims;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.claims;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.claims;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.claims;

    -- 4. Drop wildcard select/insert/update/delete policies on invoices
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.invoices;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.invoices;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.invoices;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.invoices;

    -- 5. Drop wildcard select/insert/update/delete policies on commissions
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.commissions;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.commissions;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.commissions;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.commissions;

    -- 6. Drop wildcard select/insert/update/delete policies on RBAC tables
    DROP POLICY IF EXISTS "rbac_role_levels_insert" ON public.role_levels;
    DROP POLICY IF EXISTS "rbac_role_levels_update" ON public.role_levels;
    DROP POLICY IF EXISTS "rbac_role_levels_delete" ON public.role_levels;
    DROP POLICY IF EXISTS "rbac_role_page_permissions_insert" ON public.role_page_permissions;
    DROP POLICY IF EXISTS "rbac_role_page_permissions_delete" ON public.role_page_permissions;
    DROP POLICY IF EXISTS "rbac_role_level_page_permissions_insert" ON public.role_level_page_permissions;
    DROP POLICY IF EXISTS "rbac_role_level_page_permissions_update" ON public.role_level_page_permissions;
    DROP POLICY IF EXISTS "rbac_role_level_page_permissions_delete" ON public.role_level_page_permissions;
    DROP POLICY IF EXISTS "Allow authenticated users to insert roles" ON public.roles;
    DROP POLICY IF EXISTS "Allow authenticated users to update roles" ON public.roles;
    DROP POLICY IF EXISTS "Allow authenticated users to delete roles" ON public.roles;

END $$;

-- Enable Row Level Security (ensure active)
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- A. POLICIES Table RLS
-- ==========================================
CREATE POLICY "Users can see policies of assigned companies or all if admin"
ON public.policies FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert policies of assigned companies or all if admin"
ON public.policies FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update policies of assigned companies or all if admin"
ON public.policies FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete policies of assigned companies or all if admin"
ON public.policies FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- ==========================================
-- B. POLICY MEMBERS Table RLS
-- ==========================================
CREATE POLICY "Users can see members of allowed policies"
ON public.policy_members FOR SELECT TO authenticated
USING (
  policy_id IN (SELECT id FROM public.policies)
);

CREATE POLICY "Users can insert members of allowed policies"
ON public.policy_members FOR INSERT TO authenticated
WITH CHECK (
  policy_id IN (SELECT id FROM public.policies)
);

CREATE POLICY "Users can update members of allowed policies"
ON public.policy_members FOR UPDATE TO authenticated
USING (
  policy_id IN (SELECT id FROM public.policies)
);

CREATE POLICY "Users can delete members of allowed policies"
ON public.policy_members FOR DELETE TO authenticated
USING (
  policy_id IN (SELECT id FROM public.policies)
);

-- ==========================================
-- C. CLAIMS Table RLS
-- ==========================================
CREATE POLICY "Users can see claims of assigned companies or all if admin"
ON public.claims FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert claims of assigned companies or all if admin"
ON public.claims FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update claims of assigned companies or all if admin"
ON public.claims FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete claims of assigned companies or all if admin"
ON public.claims FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- ==========================================
-- D. INVOICES Table RLS
-- ==========================================
CREATE POLICY "Users can see invoices of assigned companies or all if admin"
ON public.invoices FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert invoices of assigned companies or all if admin"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update invoices of assigned companies or all if admin"
ON public.invoices FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete invoices of assigned companies or all if admin"
ON public.invoices FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- ==========================================
-- E. COMMISSIONS Table RLS
-- ==========================================
CREATE POLICY "Users can see commissions of assigned companies or all if admin"
ON public.commissions FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert commissions of assigned companies or all if admin"
ON public.commissions FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update commissions of assigned companies or all if admin"
ON public.commissions FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete commissions of assigned companies or all if admin"
ON public.commissions FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR client_company_id IN (
    SELECT id FROM public.companies WHERE assigned_user_id = auth.uid()::text
  )
);

-- ==========================================
-- F. RBAC Tables Admin Write Constraints
-- ==========================================
CREATE POLICY "rbac_roles_insert" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "rbac_roles_update" ON public.roles FOR UPDATE TO authenticated USING (public.is_admin_or_manager());
CREATE POLICY "rbac_roles_delete" ON public.roles FOR DELETE TO authenticated USING (public.is_admin_or_manager());

CREATE POLICY "rbac_role_levels_insert" ON public.role_levels FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "rbac_role_levels_update" ON public.role_levels FOR UPDATE TO authenticated USING (public.is_admin_or_manager());
CREATE POLICY "rbac_role_levels_delete" ON public.role_levels FOR DELETE TO authenticated USING (public.is_admin_or_manager());

CREATE POLICY "rbac_role_page_permissions_insert" ON public.role_page_permissions FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "rbac_role_page_permissions_delete" ON public.role_page_permissions FOR DELETE TO authenticated USING (public.is_admin_or_manager());

CREATE POLICY "rbac_role_level_page_permissions_insert" ON public.role_level_page_permissions FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "rbac_role_level_page_permissions_update" ON public.role_level_page_permissions FOR UPDATE TO authenticated USING (public.is_admin_or_manager());
CREATE POLICY "rbac_role_level_page_permissions_delete" ON public.role_level_page_permissions FOR DELETE TO authenticated USING (public.is_admin_or_manager());
