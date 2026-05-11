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
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (data) setIsAdmin(data.is_admin ?? false);
      setIsLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = useCallback(async (module: ModuleCode, action: ActionCode): Promise<boolean> => {
    if (!userId) return false;
    
    // Admin Bypass
    if (isAdmin) return true;

    // Call the RPC function for granular check
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_module_code: module,
      p_action_code: action
    });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return !!data;
  }, [userId, isAdmin]);

  return {
    can,
    isAdmin,
    isLoading
  };
}
