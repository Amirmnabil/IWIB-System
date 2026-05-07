import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UseSupabaseCollectionResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSupabaseCollectionOptions {
  select?: string;
  enabled?: boolean;
  realtime?: boolean;
  staleTime?: number;
}

/**
 * Fetches all rows from a Supabase table with optional filtering and realtime updates.
 * Uses React Query for caching and automatic re-fetching.
 *
 * @param table - The Supabase table name.
 * @param filter - Optional query modifier function. MUST be wrapped in `useCallback` by the
 *   caller, otherwise this hook will re-fetch on every render (infinite loop).
 * @param options - Optional configuration for selection, real-time, etc.
 */
export function useSupabaseCollection<T = any>(
  table: string,
  filter?: (query: any) => any,
  options: UseSupabaseCollectionOptions = {}
): UseSupabaseCollectionResult<T> {
  const { 
    select = '*', 
    enabled = true, 
    realtime = true,
    staleTime = 1000 * 60 * 5 // 5 minutes default
  } = options;

  const queryClient = useQueryClient();

  // Create a stable representation of the filter if possible
  // Using filter.toString() is a fallback, but better if the user provides a key
  const query = useQuery({
    queryKey: ['supabase', table, { filter: filter?.toString(), select }],
    queryFn: async () => {
      let q = supabase.from(table).select(select);
      if (filter) {
        q = filter(q);
      }
      
      const { data: result, error: supabaseError } = await q;

      if (supabaseError) throw supabaseError;
      return result as T[];
    },
    enabled,
    staleTime,
  });

  useEffect(() => {
    if (!realtime || !enabled) return;

    // Setup real-time subscription
    // Use a unique channel name per hook instance to avoid collisions
    const channelId = `${table}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload: any) => {
          // Invalidate the query to trigger a background refetch
          // Only invalidate the specific table queries
          queryClient.invalidateQueries({ queryKey: ['supabase', table] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient, realtime, enabled]);

  return { 
    data: query.data ?? null, 
    isLoading: query.isLoading, 
    error: (query.error as Error) ?? null 
  };
}
