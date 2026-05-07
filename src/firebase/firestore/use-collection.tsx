'use client';

import { useMemo } from 'react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Supabase shim for useCollection.
 * Mimics the Firestore hook API but fetches from Supabase using useSupabaseCollection.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: any,
  select: string = '*'
): UseCollectionResult<T> {
  // Extract table name
  const table = useMemo(() => {
    if (typeof memoizedTargetRefOrQuery === 'string') return memoizedTargetRefOrQuery;
    if (memoizedTargetRefOrQuery?.type === 'collection') return memoizedTargetRefOrQuery.path;
    if (memoizedTargetRefOrQuery?._query?.path?.canonicalString) return memoizedTargetRefOrQuery._query.path.canonicalString();
    if (memoizedTargetRefOrQuery?._query?.path?.segments) return memoizedTargetRefOrQuery._query.path.segments[0];
    return '';
  }, [memoizedTargetRefOrQuery]);

  // Map Firestore constraints to Supabase filter
  const filter = useMemo(() => {
    if (!memoizedTargetRefOrQuery?.constraints) return undefined;

    return (query: any) => {
      let q = query;
      memoizedTargetRefOrQuery.constraints.forEach((c: any) => {
        if (c.type === 'where') {
          if (c.op === '==' || c.op === '===') q = q.eq(c.field, c.value);
          else if (c.op === '>=') q = q.gte(c.field, c.value);
          else if (c.op === '<=') q = q.lte(c.field, c.value);
          else if (c.op === 'array-contains') q = q.contains(c.field, [c.value]);
        } else if (c.type === 'orderBy') {
          q = q.order(c.field, { ascending: c.dir === 'asc' });
        } else if (c.type === 'limit') {
          q = q.limit(c.value);
        }
      });
      return q;
    };
  }, [memoizedTargetRefOrQuery]);

  const { data, isLoading, error } = useSupabaseCollection<WithId<T>>(table, filter, select);

  return { data, isLoading, error };
}
