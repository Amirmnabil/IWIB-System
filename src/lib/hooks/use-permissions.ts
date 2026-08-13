'use client';

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/auth-provider';

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
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['userPermissions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user || !user.email) {
        return null;
      }

      const userId = user.id;

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, is_admin, role, level')
        .ilike('email', user.email)
        .maybeSingle();
      
      const internalId = userRecord?.id ?? null;
      const isMetaAdmin = user.user_metadata?.role?.toLowerCase() === 'admin';
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
        if (userRoles) userRoles.forEach((ur: any) => roleIds.add(ur.role_id));
        
        if (roleIds.size > 0) {
          const roleIdsArray = Array.from(roleIds);
          
          // Get matching role_level IDs if userRecord.level exists
          const roleLevelIds = new Set<string>();
          if (userRecord?.level) {
            const { data: rl } = await supabase
              .from('role_levels')
              .select('id')
              .in('role_id', roleIdsArray)
              .eq('name', userRecord.level)
              .eq('is_active', true);
            if (rl) rl.forEach((l: any) => roleLevelIds.add(l.id));
          }
          const roleLevelIdsArray = Array.from(roleLevelIds);

          // Use Promise.all to fetch all permissions in parallel instead of sequentially
          const [rppRes, modsRes, permsRes, pagesRes, rlppRes] = await Promise.all([
            supabase.from('role_page_permissions').select('page_id, permission_id').in('role_id', roleIdsArray),
            supabase.from('system_modules').select('id, code'),
            supabase.from('permissions').select('id, code'),
            supabase.from('system_pages').select('id, code, module_id'),
            roleLevelIdsArray.length > 0
              ? supabase.from('role_level_page_permissions').select('page_id, permission_id, is_granted').in('role_level_id', roleLevelIdsArray)
              : Promise.resolve({ data: [] })
          ]);

          const rppData = rppRes.data;
          const mods = modsRes.data;
          const perms = permsRes.data;
          const pages = pagesRes.data;
          const rlppData = rlppRes.data;

          if (mods && perms) {
            const grantedSet = new Set<string>(); // "pageCode:permCode"
            const revokedSet = new Set<string>();
            const pageIdToCode = new Map(pages?.map((p: any) => [p.id, p.code]) || []);
            const permIdToCode = new Map(perms?.map((p: any) => [p.id, p.code]) || []);

            // process base role page permissions
            if (rppData) {
              rppData.forEach((rp: any) => {
                const page = pages?.find((p: any) => p.id === rp.page_id);
                const perm = perms.find((p: any) => p.id === rp.permission_id);
                if (page && perm) {
                  grantedSet.add(`${page.code}:${String(perm.code).toLowerCase()}`);
                }
              });
            }

            // Process level overrides
            if (rlppData && pages) {
              rlppData.forEach((rlpp: any) => {
                const pageCode = pageIdToCode.get(rlpp.page_id);
                const permCode = permIdToCode.get(rlpp.permission_id);
                if (pageCode && permCode) {
                   const key = `${pageCode}:${String(permCode).toLowerCase()}`;
                   if (rlpp.is_granted) {
                     grantedSet.add(key);
                     revokedSet.delete(key);
                   } else {
                     revokedSet.add(key);
                     grantedSet.delete(key);
                   }
                 }
              });
            }

            // Consolidate final page permissions
            grantedSet.forEach(key => {
               if (!revokedSet.has(key)) {
                  const [pageCode, action] = key.split(':');
                  const page = pages?.find((p: any) => p.code === pageCode);
                  if (page) {
                     const moduleCode = mods.find((m: any) => m.id === page.module_id)?.code;
                     if (moduleCode) allowedMod.add(moduleCode.toLowerCase());
                     if (!pageCodes.includes(pageCode)) pageCodes.push(pageCode);
                     permsList.push({ module: pageCode, action });
                  }
               }
            });
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any) => {
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
