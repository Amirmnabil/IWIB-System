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
      } else if (internalId) {
        // Fallback or explicit lookup if RPC fails or case mismatch
        const { data: roleData } = await supabase.from('roles').select('id').eq('name', userRecord?.role).single();
        let allowed = new Set<string>();
        let permsList: {module: string, action: string}[] = [];

        if (roleData) {
          const { data: rps } = await supabase.from('role_permissions').select('module_id, permission_id').eq('role_id', roleData.id);
          if (rps && rps.length > 0) {
            const { data: mods } = await supabase.from('system_modules').select('id, code');
            const { data: perms } = await supabase.from('permissions').select('id, code');
            
            if (mods && perms) {
              rps.forEach((rp: { module_id: string; permission_id: string }) => {
                const moduleCode = mods.find((m: { id: string; code: string }) => m.id === rp.module_id)?.code;
                const permCode = perms.find((p: { id: string; code: string }) => p.id === rp.permission_id)?.code;
                
                if (moduleCode) {
                  allowed.add(moduleCode.toLowerCase());
                  if (permCode) {
                    permsList.push({
                      module: moduleCode.toLowerCase(),
                      action: permCode.toLowerCase()
                    });
                  }
                }
              });
            }
          }
        }
        
        setGrantedPermissions(permsList);
        setAllowedModules(Array.from(allowed) as ModuleCode[]);
      } else {
        setAllowedModules([]);
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
    const hasPerm = grantedPermissions.some(
      p => p.module === module.toLowerCase() && p.action === action.toLowerCase()
    );

    if (hasPerm) return true;

    // Fallback to RPC just in case it handles special logic not covered by standard role_permissions
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: internalUserId,
      p_module_code: module,
      p_action_code: action
    });

    if (error) {
      return false;
    }

    return !!data;
  }, [userId, internalUserId, isAdmin, grantedPermissions]);

  return {
    can,
    isAdmin,
    isLoading,
    allowedModules
  };
}

