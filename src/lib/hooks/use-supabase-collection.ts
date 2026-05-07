import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UseSupabaseCollectionResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches all rows from a Supabase table with optional filtering and realtime updates.
 * Uses React Query for caching and automatic re-fetching.
 *
 * @param table - The Supabase table name.
 * @param filter - Optional query modifier function. MUST be wrapped in `useCallback` by the
 *   caller, otherwise this hook will re-fetch on every render (infinite loop).
 * @param select - Optional string of columns to select (default: '*')
 */
export function useSupabaseCollection<T = any>(
  table: string,
  filter?: (query: any) => any,
  select: string = '*'
): UseSupabaseCollectionResult<T> {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['supabase', table, filter?.toString(), select],
    queryFn: async () => {
      let q = supabase.from(table).select(select);
      if (filter) {
        q = filter(q);
      }
      
      const { data: result, error: supabaseError } = await q;

      if (supabaseError) throw supabaseError;
      return result as T[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    // Setup real-time subscription
    const channel = supabase
      .channel(`${table}_realtime_global`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        () => {
          // Invalidate the query to trigger a background refetch
          queryClient.invalidateQueries({ queryKey: ['supabase', table] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);

  return { 
    data: query.data ?? null, 
    isLoading: query.isLoading, 
    error: (query.error as Error) ?? null 
  };
}
