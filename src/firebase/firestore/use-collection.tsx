'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Supabase shim for useCollection.
 * Mimics the Firestore hook API but fetches from Supabase.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: any // In Supabase shim, this can be the table name
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If it's a Firestore query object, we try to extract the collection path
    let table = '';
    if (typeof memoizedTargetRefOrQuery === 'string') {
      table = memoizedTargetRefOrQuery;
    } else if (memoizedTargetRefOrQuery?.type === 'collection') {
      table = memoizedTargetRefOrQuery.path;
    } else if (memoizedTargetRefOrQuery?._query?.path?.canonicalString) {
      table = memoizedTargetRefOrQuery._query.path.canonicalString();
    } else if (memoizedTargetRefOrQuery?._query?.path?.segments) {
        table = memoizedTargetRefOrQuery._query.path.segments[0];
    }

    if (!table) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const fetchData = async () => {
      try {
        const { data: result, error: supabaseError } = await supabase
          .from(table)
          .select('*');

        if (supabaseError) throw supabaseError;
        
        setData(result as WithId<T>[]);
        setError(null);
      } catch (err: any) {
        setError(err);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Setup real-time
    const channel = supabase
      .channel(`${table}_realtime_shim`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
