-- ============================================================
-- IWIB Hub — Tighten remaining RLS security & audit logs
-- ============================================================

DO $$
BEGIN
    -- 1. Drop wildcard select/insert/update/delete policies on users
    DROP POLICY IF EXISTS "Allow authenticated users to view users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to update users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON public.users;

    -- 2. Drop wildcard select/insert/update/delete policies on sme_plans
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.sme_plans;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.sme_plans;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.sme_plans;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.sme_plans;
    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sme_plans;

    -- 3. Drop wildcard select/insert/update/delete policies on sme_premiums
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.sme_premiums;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.sme_premiums;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.sme_premiums;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.sme_premiums;
    DROP POLICY IF EXISTS "Allow all for authenticated premiums" ON public.sme_premiums;

    -- 4. Drop wildcard select/insert/update/delete policies on sme_quotations
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.sme_quotations;
    DROP POLICY IF EXISTS "Authenticated users can insert" ON public.sme_quotations;
    DROP POLICY IF EXISTS "Authenticated users can update" ON public.sme_quotations;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON public.sme_quotations;
    DROP POLICY IF EXISTS "Allow all for authenticated quotations" ON public.sme_quotations;

    -- 5. Drop wildcard select/insert/update/delete policies on insurance_companies
    DROP POLICY IF EXISTS "Allow all" ON public.insurance_companies;
    DROP POLICY IF EXISTS "Allow authenticated users to view companies" ON public.insurance_companies;

    -- 6. Drop wildcard select/insert/update/delete policies on audit_logs
    DROP POLICY IF EXISTS "Authenticated users can select" ON public.audit_logs;
    DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;

END $$;

-- Enable Row Level Security (ensure active)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_premiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- A. USERS Table RLS (Prevent Privilege Escalation)
-- ==========================================
CREATE POLICY "Anyone authenticated can see users list"
ON public.users FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admins/managers can insert users"
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Users can update their own row or admins can update any"
ON public.users FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR auth.uid() = id
);

CREATE POLICY "Only admins/managers can delete users"
ON public.users FOR DELETE TO authenticated
USING (public.is_admin_or_manager());

-- ==========================================
-- B. SME PLANS Table RLS
-- ==========================================
CREATE POLICY "Anyone authenticated can see plans"
ON public.sme_plans FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admins/managers can insert plans"
ON public.sme_plans FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can update plans"
ON public.sme_plans FOR UPDATE TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can delete plans"
ON public.sme_plans FOR DELETE TO authenticated
USING (public.is_admin_or_manager());

-- ==========================================
-- C. SME PREMIUMS Table RLS
-- ==========================================
CREATE POLICY "Anyone authenticated can see premiums"
ON public.sme_premiums FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admins/managers can insert premiums"
ON public.sme_premiums FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can update premiums"
ON public.sme_premiums FOR UPDATE TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can delete premiums"
ON public.sme_premiums FOR DELETE TO authenticated
USING (public.is_admin_or_manager());

-- ==========================================
-- D. INSURANCE COMPANIES Table RLS
-- ==========================================
CREATE POLICY "Anyone authenticated can see insurance companies"
ON public.insurance_companies FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admins/managers can insert insurance companies"
ON public.insurance_companies FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can update insurance companies"
ON public.insurance_companies FOR UPDATE TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Only admins/managers can delete insurance companies"
ON public.insurance_companies FOR DELETE TO authenticated
USING (public.is_admin_or_manager());

-- ==========================================
-- E. SME QUOTATIONS Table RLS (Prevent Cross-Tenant Leakage)
-- ==========================================
CREATE POLICY "Users can see own quotations or all if admin"
ON public.sme_quotations FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager() OR created_by = auth.uid()
);

CREATE POLICY "Users can insert own quotations or all if admin"
ON public.sme_quotations FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager() OR created_by = auth.uid()
);

CREATE POLICY "Users can update own quotations or all if admin"
ON public.sme_quotations FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager() OR created_by = auth.uid()
);

CREATE POLICY "Users can delete own quotations or all if admin"
ON public.sme_quotations FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager() OR created_by = auth.uid()
);

-- ==========================================
-- F. AUDIT LOGS Table RLS
-- ==========================================
CREATE POLICY "Only admins/managers can select audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Anyone authenticated can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);
