'use client';

import { useMemo } from 'react';
import { useSupabaseDoc } from '@/lib/hooks/use-supabase-doc';

export interface UseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  exists: boolean;
}

/**
 * Supabase shim for useDoc.
 * Mimics the Firestore hook API but fetches from Supabase using useSupabaseDoc.
 */
export function useDoc<T = any>(
  memoizedTargetRef: any
): UseDocResult<T> {
  const { table, id } = useMemo(() => {
    let table = '';
    let id = '';

    if (memoizedTargetRef?.path) {
      const parts = memoizedTargetRef.path.split('/');
      table = parts[0];
      id = parts[1];
    } else if (memoizedTargetRef?.table && memoizedTargetRef?.id) {
      table = memoizedTargetRef.table;
      id = memoizedTargetRef.id;
    }
    return { table, id };
  }, [memoizedTargetRef]);

  const { data, isLoading, error } = useSupabaseDoc<T>(table, id);

  return { 
    data, 
    isLoading, 
    error, 
    exists: !!data 
  };
}
