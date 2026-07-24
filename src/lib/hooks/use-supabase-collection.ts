import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UseSupabaseCollectionResult<T> {
  data: T[] | null;
  totalCount: number | null;
  pageCount: number | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSupabaseCollectionOptions {
  /** Columns to select. Default is '*'. Prefer explicit projections over '*'. */
  select?: string;
  enabled?: boolean;
  realtime?: boolean;
  staleTime?: number;
  /**
   * A stable string key that uniquely identifies this query's filter.
   * MUST be provided when `filter` is used to ensure correct cache isolation.
   * E.g., 'leads-status-new', 'companies-dropdown'.
   */
  filterKey?: string;
  /** Override the entire React Query key. Prefer `filterKey` instead. */
  queryKey?: any[];
  /** Additional reactive dependencies that, when changed, trigger a refetch. */
  deps?: any[];
  /** 0-indexed page number for server-side pagination. Omit for full fetch. */
  page?: number;
  /** Number of rows per page. Defaults to 50 when `page` is set. */
  pageSize?: number;
  /** If true, fetches all records in the table recursively in batches of 1,000 rows. */
  fetchAll?: boolean;
}

/**
 * Fetches rows from a Supabase table with optional filtering, column projection,
 * server-side pagination, and realtime updates.
 *
 * Uses React Query for caching. Cache keys are structured as:
 *   ['supabase', table, select, filterKey, page, pageSize, ...deps]
 *
 * @param table - The Supabase table name.
 * @param filter - Optional query modifier function. MUST be wrapped in `useCallback`
 *   by the caller, otherwise this hook will re-fetch on every render (infinite loop).
 * @param options - Optional configuration.
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
    staleTime = 1000 * 60 * 5, // 5 minutes default
    filterKey,
    queryKey,
    deps = [],
    page,
    pageSize = 50,
    fetchAll = false,
  } = options;

  const queryClient = useQueryClient();

  const isPaginated = page !== undefined && page !== null;

  // Structured, stable cache key. All parts are explicit — no toString() heuristics.
  const finalQueryKey = queryKey ?? [
    'supabase',
    table,
    select,
    filterKey ?? 'no-filter',
    isPaginated ? page : (fetchAll ? 'all-fetched' : 'all'),
    isPaginated ? pageSize : 'all',
    ...deps,
  ];

  const query = useQuery({
    queryKey: finalQueryKey,
    queryFn: async () => {
      if (fetchAll) {
        let allData: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let q = supabase.from(table).select(select).range(from, from + batchSize - 1);
          if (filter) {
            q = filter(q);
          }
          const { data, error } = await q;
          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allData = allData.concat(data);
            if (data.length < batchSize) {
              hasMore = false;
            } else {
              from += batchSize;
            }
          }
        }
        return {
          data: allData,
          totalCount: allData.length,
        };
      }

      let q = supabase.from(table).select(select, isPaginated ? { count: 'exact' } : {});

      if (filter) {
        q = filter(q);
      }

      if (isPaginated) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);
      }

      const { data: result, error: supabaseError, count } = await q;

      if (supabaseError) throw supabaseError;

      return {
        data: result as T[],
        totalCount: count ?? null,
      };
    },
    enabled,
    staleTime,
  });

  // Compute pageCount from totalCount
  const totalCount = query.data?.totalCount ?? null;
  const pageCount =
    totalCount !== null && isPaginated ? Math.ceil(totalCount / pageSize) : null;

  useEffect(() => {
    if (!realtime || !enabled) return;

    // Use a unique channel name per hook instance to avoid collisions
    const channelId = `${table}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        () => {
          // Invalidate only queries for this table+select+filterKey combination
          // to reduce blast radius compared to invalidating the entire table key
          queryClient.invalidateQueries({
            queryKey: ['supabase', table, select, filterKey ?? 'no-filter'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, select, filterKey, queryClient, realtime, enabled]);

  return {
    data: query.data?.data ?? null,
    totalCount,
    pageCount,
    isLoading: query.isLoading,
    error: (query.error as Error) ?? null,
  };
}
