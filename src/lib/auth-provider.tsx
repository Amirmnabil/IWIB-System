'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Auth context
export interface AuthContextState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    // Auth is handled by Supabase
    supabase.auth.getSession().then(({ data: { session }, error }: any) => {
      if (error) {
        supabase.auth.signOut();
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      } else {
        setUserAuthState({ user: session?.user ?? null, isUserLoading: false, userError: null });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUserAuthState({ user: session?.user ?? null, isUserLoading: false, userError: null });
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue = useMemo((): AuthContextState => {
    return {
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [userAuthState]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useAuth();
  return { user, isUserLoading, userError };
};
