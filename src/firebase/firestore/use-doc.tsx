'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  exists: boolean;
}

/**
 * Supabase shim for useDoc.
 * Mimics the Firestore hook API but fetches from Supabase.
 */
export function useDoc<T = any>(
  memoizedTargetRef: any // In Supabase shim, this can be an object with {table, id} or a Firestore DocRef
): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [exists, setExists] = useState<boolean>(false);

  useEffect(() => {
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

    if (!table || !id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      setExists(false);
      return;
    }

    setIsLoading(true);

    const fetchData = async () => {
      try {
        const { data: result, error: supabaseError } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();

        if (supabaseError) {
            if (supabaseError.code === 'PGRST116') {
                setExists(false);
                setData(null);
                return;
            }
            throw supabaseError;
        }
        
        setData(result as T);
        setExists(true);
        setError(null);
      } catch (err: any) {
        setError(err);
        setData(null);
        setExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Setup real-time
    const channel = supabase
      .channel(`${table}_${id}_realtime_shim`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table, filter: `id=eq.${id}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memoizedTargetRef]);

  return { data, isLoading, error, exists };
}
