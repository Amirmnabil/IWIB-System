-- Enhance Role & Permission system with Role Level Layer

CREATE TABLE IF NOT EXISTS public.role_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(role_id, name)
);

CREATE TABLE IF NOT EXISTS public.role_level_page_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_level_id uuid REFERENCES public.role_levels(id) ON DELETE CASCADE,
    page_id uuid REFERENCES public.system_pages(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted boolean DEFAULT true,
    UNIQUE(role_level_id, page_id, permission_id)
);

ALTER TABLE public.role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_level_page_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view role_levels" ON public.role_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert role_levels" ON public.role_levels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update role_levels" ON public.role_levels FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete role_levels" ON public.role_levels FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view role_level_page_permissions" ON public.role_level_page_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert role_level_page_permissions" ON public.role_level_page_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update role_level_page_permissions" ON public.role_level_page_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete role_level_page_permissions" ON public.role_level_page_permissions FOR DELETE TO authenticated USING (true);

-- Update check_user_page_permission RPC to consider level overrides
CREATE OR REPLACE FUNCTION public.check_user_page_permission(
  p_user_id uuid,
  p_page_code text,
  p_action_code text
) RETURNS boolean AS $$
DECLARE
  has_access boolean := false;
  is_super_admin boolean;
  v_user_level text;
  v_base_access boolean := false;
  v_override_exists boolean := false;
  v_override_granted boolean := false;
BEGIN
  -- Check super admin status
  SELECT is_admin, level INTO is_super_admin, v_user_level FROM public.users WHERE id = p_user_id;
  IF is_super_admin THEN
    RETURN true;
  END IF;

  -- 1. Check base role access
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_page_permissions rpp ON ur.role_id = rpp.role_id
    JOIN public.system_pages sp ON rpp.page_id = sp.id
    JOIN public.permissions p ON rpp.permission_id = p.id
    WHERE ur.user_id = p_user_id 
      AND sp.code = p_page_code 
      AND p.code = p_action_code
  ) INTO v_base_access;
  
  -- 2. Check for level overrides if user has a level
  IF v_user_level IS NOT NULL THEN
    SELECT true, rlpp.is_granted INTO v_override_exists, v_override_granted
    FROM public.user_roles ur
    JOIN public.role_levels rl ON ur.role_id = rl.role_id
    JOIN public.role_level_page_permissions rlpp ON rl.id = rlpp.role_level_id
    JOIN public.system_pages sp ON rlpp.page_id = sp.id
    JOIN public.permissions p ON rlpp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND rl.name = v_user_level
      AND rl.is_active = true
      AND sp.code = p_page_code
      AND p.code = p_action_code
    LIMIT 1;
    
    IF v_override_exists THEN
      -- Return the override value (granted or revoked)
      RETURN v_override_granted;
    END IF;
  END IF;

  -- Fallback to base access
  RETURN v_base_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
