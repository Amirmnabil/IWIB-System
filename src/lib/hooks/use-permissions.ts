'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';

export type ModuleCode = 
  | 'crm' 
  | 'underwriting' 
  | 'policy_admin' 
  | 'claims' 
  | 'finance' 
  | 'master_data' 
  | 'complaints' 
  | 'analytics' 
  | 'settings' 
  | 'user_manual';

export type ActionCode = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export function usePermissions() {
  const [userId, setUserId] = useState<string | null>(null);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allowedModules, setAllowedModules] = useState<ModuleCode[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [grantedPermissions, setGrantedPermissions] = useState<{module: string, action: string}[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        setIsLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, is_admin, role')
        .eq('email', session.user.email)
        .maybeSingle();
      
      if (userError) {
        console.error('Permission check: Error fetching user record:', userError.message);
      }
      
      const internalId = userRecord?.id;
      setInternalUserId(internalId ?? null);
      
      const isMetaAdmin = session.user.user_metadata?.role?.toLowerCase() === 'admin';
      const adminStatus = isMetaAdmin || (userRecord?.is_admin ?? false);
      setIsAdmin(adminStatus);
      
      // Load allowed modules
      const ALL_MODULES: ModuleCode[] = [
        'crm', 'underwriting', 'policy_admin', 'claims', 
        'finance', 'master_data', 'complaints', 'analytics', 
        'settings', 'user_manual'
      ];

      if (adminStatus) {
        setAllowedModules(ALL_MODULES);
        setAllowedPages(['*']); // Admin has access to all pages
      } else if (internalId) {
        // Fetch user roles
        const { data: userRoles } = await supabase.from('user_roles').select('role_id').eq('user_id', internalId);
        
        // Also fetch legacy single role if exists
        const { data: legacyRole } = await supabase.from('roles').select('id').eq('name', userRecord?.role).single();
        
        const roleIds = new Set<string>();
        if (legacyRole) roleIds.add(legacyRole.id);
        if (userRoles) userRoles.forEach(ur => roleIds.add(ur.role_id));
        
        let allowedMod = new Set<string>();
        let pageCodes: string[] = [];
        let permsList: {module: string, action: string}[] = [];

        if (roleIds.size > 0) {
          const roleIdsArray = Array.from(roleIds);
          
          // Fetch Role Page Permissions
          const { data: rppData } = await supabase
            .from('role_page_permissions')
            .select('page_id, permission_id')
            .in('role_id', roleIdsArray);
            
          // Legacy role_permissions support
          const { data: rpData } = await supabase
            .from('role_permissions')
            .select('module_id, permission_id')
            .in('role_id', roleIdsArray);

          const { data: mods } = await supabase.from('system_modules').select('id, code');
          const { data: perms } = await supabase.from('permissions').select('id, code');
          const { data: pages } = await supabase.from('system_pages').select('id, code, module_id');

          if (mods && perms) {
            // Process legacy module permissions
            if (rpData) {
              rpData.forEach(rp => {
                const moduleCode = mods.find(m => m.id === rp.module_id)?.code;
                const permCode = perms.find(p => p.id === rp.permission_id)?.code;
                if (moduleCode) {
                  allowedMod.add(moduleCode.toLowerCase());
                  if (permCode) {
                    permsList.push({ module: moduleCode.toLowerCase(), action: permCode.toLowerCase() });
                  }
                }
              });
            }
            
            // Process new granular page permissions
            if (rppData && pages) {
              rppData.forEach(rpp => {
                const page = pages.find(p => p.id === rpp.page_id);
                if (page) {
                  const moduleCode = mods.find(m => m.id === page.module_id)?.code;
                  if (moduleCode) allowedMod.add(moduleCode.toLowerCase());
                  if (!pageCodes.includes(page.code)) pageCodes.push(page.code);
                  
                  // Add to permissions list (using page code as 'module' context for page-specific actions)
                  const permCode = perms.find(p => p.id === rpp.permission_id)?.code;
                  if (permCode) {
                    permsList.push({ module: page.code, action: permCode.toLowerCase() });
                  }
                }
              });
            }
          }
        }
        
        setGrantedPermissions(permsList);
        setAllowedModules(Array.from(allowedMod) as ModuleCode[]);
        setAllowedPages(pageCodes);
      } else {
        setAllowedModules([]);
        setAllowedPages([]);
        setGrantedPermissions([]);
      }

      setIsLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkUser(); // Re-check on auth state change
      } else {
        setUserId(null);
        setInternalUserId(null);
        setIsAdmin(false);
        setAllowedModules([]);
        setAllowedPages([]);
        setGrantedPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = useCallback(async (module: ModuleCode, action: ActionCode): Promise<boolean> => {
    if (!userId) return false;
    
    // Admin Bypass
    if (isAdmin) return true;
    
    if (!internalUserId) return false;

    // Check cached client-side permissions
    // The module argument can now be a page code (e.g. '/underwriting/quotations') or a top-level module code.
    const hasPerm = grantedPermissions.some(
      p => p.module === module.toLowerCase() && p.action === action.toLowerCase()
    );

    if (hasPerm) return true;

    // Fallback to RPC
    const { data, error } = await supabase.rpc('check_user_page_permission', {
      p_user_id: internalUserId,
      p_page_code: module,
      p_action_code: action
    });

    if (error) {
      // Try legacy RPC if new one fails
      const { data: legData, error: legError } = await supabase.rpc('check_user_permission', {
        p_user_id: internalUserId,
        p_module_code: module,
        p_action_code: action
      });
      if (legError) return false;
      return !!legData;
    }

    return !!data;
  }, [userId, internalUserId, isAdmin, grantedPermissions]);

  return {
    can,
    isAdmin,
    isLoading,
    allowedModules,
    allowedPages,
    internalUserId
  };
}

