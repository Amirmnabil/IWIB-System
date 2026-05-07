import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UseSupabaseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseDoc<T = any>(
  table: string,
  id: string | null | undefined,
  select: string = '*'
): UseSupabaseDocResult<T> {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['supabase', table, id, select],
    queryFn: async () => {
      if (!id) return null;
      const { data: result, error: supabaseError } = await supabase
        .from(table)
        .select(select)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;
      return result as T;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`${table}_${id}_realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table, filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['supabase', table, id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, id, queryClient]);

  return { 
    data: query.data ?? null, 
    isLoading: query.isLoading, 
    error: (query.error as Error) ?? null 
  };
}
