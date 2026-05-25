'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { initializeFirebase } from './sdk';

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Supabase/Firebase shim context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: any;
  firestore: any;
  auth: any;
  storage: any;
  user: any;
  isUserLoading: boolean;
  userError: Error | null;
}


export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Initialize Firebase SDK once (needed by legacy pages that still use Firestore API)
let _firebaseSdks: ReturnType<typeof initializeFirebase> | null = null;
function getFirebaseSdks() {
  if (!_firebaseSdks) {
    try {
      _firebaseSdks = initializeFirebase();
    } catch (e) {
      console.warn('Firebase SDK init failed (non-critical, using Supabase for auth):', e);
    }
  }
  return _firebaseSdks;
}

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  const contextValue = useMemo((): FirebaseContextState => {
    const sdks = getFirebaseSdks();
    return {
      areServicesAvailable: true,
      firebaseApp: sdks?.firebaseApp ?? {},
      // Expose empty object as firestore (shims handle the actual data access)
      firestore: sdks?.firestore ?? {},
      auth: supabase.auth,
      storage: supabase.storage,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,

    };
  }, [userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = () => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = () => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useStorage = () => {
  const { storage } = useFirebase();
  return storage;
};

export const useUser = () => {

  const { user, isUserLoading, userError } = useFirebase();

  // Shim: map Supabase user fields to Firebase-compatible shape
  const shimmedUser = useMemo(() => {
    return user ? {
      ...user,
      uid: user.id,
      displayName: user.user_metadata?.full_name || user.email
    } : null;
  }, [user]);

  return { user: shimmedUser, isUserLoading, userError };
};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}