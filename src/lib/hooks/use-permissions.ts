'use client';

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        return null;
      }

      const userId = session.user.id;

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, is_admin, role')
        .eq('email', session.user.email)
        .maybeSingle();
      
      const internalId = userRecord?.id ?? null;
      const isMetaAdmin = session.user.user_metadata?.role?.toLowerCase() === 'admin';
      const adminStatus = isMetaAdmin || (userRecord?.is_admin ?? false);
      
      const ALL_MODULES: ModuleCode[] = [
        'crm', 'underwriting', 'policy_admin', 'claims', 
        'finance', 'master_data', 'complaints', 'analytics', 
        'settings', 'user_manual'
      ];

      if (adminStatus) {
        return {
          userId,
          internalUserId: internalId,
          isAdmin: true,
          allowedModules: ALL_MODULES,
          allowedPages: ['*'],
          grantedPermissions: []
        };
      }

      let allowedMod = new Set<string>();
      let pageCodes: string[] = [];
      let permsList: {module: string, action: string}[] = [];

      if (internalId) {
        const { data: userRoles } = await supabase.from('user_roles').select('role_id').eq('user_id', internalId);
        
        let legacyRole = null;
        if (userRecord?.role) {
           const { data: lr } = await supabase.from('roles').select('id').eq('name', userRecord.role).maybeSingle();
           legacyRole = lr;
        }
        
        const roleIds = new Set<string>();
        if (legacyRole) roleIds.add(legacyRole.id);
        if (userRoles) userRoles.forEach(ur => roleIds.add(ur.role_id));
        
        if (roleIds.size > 0) {
          const roleIdsArray = Array.from(roleIds);
          
          // Use Promise.all to fetch all permissions in parallel instead of sequentially
          const [rppRes, rpRes, modsRes, permsRes, pagesRes] = await Promise.all([
            supabase.from('role_page_permissions').select('page_id, permission_id').in('role_id', roleIdsArray),
            supabase.from('role_permissions').select('module_id, permission_id').in('role_id', roleIdsArray),
            supabase.from('system_modules').select('id, code'),
            supabase.from('permissions').select('id, code'),
            supabase.from('system_pages').select('id, code, module_id')
          ]);

          const rppData = rppRes.data;
          const rpData = rpRes.data;
          const mods = modsRes.data;
          const perms = permsRes.data;
          const pages = pagesRes.data;

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
                  
                  // Add to permissions list
                  const permCode = perms.find(p => p.id === rpp.permission_id)?.code;
                  if (permCode) {
                    permsList.push({ module: page.code, action: permCode.toLowerCase() });
                  }
                }
              });
            }
          }
        }
      }

      return {
        userId,
        internalUserId: internalId,
        isAdmin: false,
        allowedModules: Array.from(allowedMod) as ModuleCode[],
        allowedPages: pageCodes,
        grantedPermissions: permsList
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache prevents lag on navigation
    gcTime: 10 * 60 * 1000,
  });

  // Subscribe to auth state changes to invalidate cache
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const can = useCallback(async (module: ModuleCode | string, action: ActionCode): Promise<boolean> => {
    if (!data || !data.userId) return false;
    if (data.isAdmin) return true;
    if (!data.internalUserId) return false;

    // Check cached client-side permissions
    const hasPerm = data.grantedPermissions.some(
      p => p.module === module.toLowerCase() && p.action === action.toLowerCase()
    );

    if (hasPerm) return true;

    // Fallback to RPC
    const { data: rpcData, error } = await supabase.rpc('check_user_page_permission', {
      p_user_id: data.internalUserId,
      p_page_code: module,
      p_action_code: action
    });

    if (error) {
      const { data: legData, error: legError } = await supabase.rpc('check_user_permission', {
        p_user_id: data.internalUserId,
        p_module_code: module,
        p_action_code: action
      });
      if (legError) return false;
      return !!legData;
    }

    return !!rpcData;
  }, [data]);

  return {
    can,
    isAdmin: data?.isAdmin ?? false,
    isLoading,
    allowedModules: data?.allowedModules ?? [],
    allowedPages: data?.allowedPages ?? [],
    internalUserId: data?.internalUserId ?? null
  };
}
