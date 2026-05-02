'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UseSupabaseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseDoc<T = any>(
  table: string,
  id: string | null | undefined
): UseSupabaseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: result, error: supabaseError } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        if (isMounted) {
          setData(result as T);
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

    const channel = supabase
      .channel(`${table}_${id}_realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table, filter: `id=eq.${id}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [table, id]);

  return { data, isLoading, error };
}
