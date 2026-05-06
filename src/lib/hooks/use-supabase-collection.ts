'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UseSupabaseCollectionResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches all rows from a Supabase table with optional filtering and realtime updates.
 *
 * @param table - The Supabase table name.
 * @param filter - Optional query modifier function. MUST be wrapped in `useCallback` by the
 *   caller, otherwise this hook will re-fetch on every render (infinite loop).
 */
export function useSupabaseCollection<T = any>(
  table: string,
  filter?: (query: any) => any
): UseSupabaseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from(table).select('*');
        if (filter) {
          query = filter(query);
        }
        
        const { data: result, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;
        if (isMounted) {
          setData(result as T[]);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // Setup real-time subscription
    const channel = supabase
      .channel(`${table}_realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [table, filter]);

  return { data, isLoading, error };
}
