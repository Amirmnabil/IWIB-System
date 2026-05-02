'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { SupabaseProvider } from '@/lib/supabase-provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * This provider provides BOTH the legacy Firebase shim context 
 * AND the new Supabase context.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <SupabaseProvider>
      <FirebaseProvider>
        {children}
      </FirebaseProvider>
    </SupabaseProvider>
  );
}