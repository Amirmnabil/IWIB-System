-- 1. Create tables for complete RBAC
CREATE TABLE IF NOT EXISTS public.role_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.system_pages(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, page_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read role_page_permissions" ON public.role_page_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert role_page_permissions" ON public.role_page_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete role_page_permissions" ON public.role_page_permissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING (true);

-- 2. Ensure basic actions exist
INSERT INTO public.permissions (name, code) VALUES
  ('View', 'view'),
  ('Create', 'create'),
  ('Edit', 'edit'),
  ('Delete', 'delete'),
  ('Approve', 'approve'),
  ('Export', 'export')
ON CONFLICT (code) DO NOTHING;

-- 3. Ensure required roles exist
INSERT INTO public.roles (name, is_system) VALUES
  ('Admin', true),
  ('Management', false),
  ('Broker', false),
  ('Account Manager', false),
  ('Sales', false),
  ('Underwriting', false),
  ('Policy Issuance', false),
  ('Finance', false),
  ('Operations', false),
  ('Viewer', false),
  ('Compliance', false)
ON CONFLICT (name) DO NOTHING;

-- 4. Make amir.nabil@iwib-eg.com Super Admin
DO $$
DECLARE
  v_admin_role_id uuid;
  v_amir_user_id uuid;
BEGIN
  -- Get Admin Role ID
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'Admin';
  
  -- Get user ID for Amir
  SELECT id INTO v_amir_user_id FROM public.users WHERE email = 'amir.nabil@iwib-eg.com';
  
  IF v_amir_user_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    -- Ensure is_admin flag is true
    UPDATE public.users SET is_admin = true WHERE id = v_amir_user_id;
    
    -- Assign Admin role in user_roles
    INSERT INTO public.user_roles (user_id, role_id) 
    VALUES (v_amir_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;

-- 5. RPC Function for backend/RLS checks
CREATE OR REPLACE FUNCTION public.check_user_page_permission(
  p_user_id uuid,
  p_page_code text,
  p_action_code text
) RETURNS boolean AS $$
DECLARE
  has_access boolean;
  is_super_admin boolean;
BEGIN
  -- Check super admin status
  SELECT is_admin INTO is_super_admin FROM public.users WHERE id = p_user_id;
  IF is_super_admin THEN
    RETURN true;
  END IF;

  -- Check granular RBAC
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_page_permissions rpp ON ur.role_id = rpp.role_id
    JOIN public.system_pages sp ON rpp.page_id = sp.id
    JOIN public.permissions p ON rpp.permission_id = p.id
    WHERE ur.user_id = p_user_id 
      AND sp.code = p_page_code 
      AND p.code = p_action_code
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
