-- Fix missing RLS policies for core system tables
-- Without these policies, non-admin users cannot read from these tables,
-- causing the usePermissions hook to fail and only show the Dashboard.

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read system_modules" ON public.system_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read users" ON public.users FOR SELECT TO authenticated USING (true);
