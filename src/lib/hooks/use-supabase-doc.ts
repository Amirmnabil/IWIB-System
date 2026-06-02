import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UseSupabaseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSupabaseDocOptions {
  select?: string;
  enabled?: boolean;
  realtime?: boolean;
  staleTime?: number;
}

export function useSupabaseDoc<T = any>(
  table: string,
  id: string | null | undefined,
  options: UseSupabaseDocOptions = {}
): UseSupabaseDocResult<T> {
  const { 
    select = '*', 
    enabled = true, 
    realtime = true,
    staleTime = 1000 * 60 * 5 // 5 minutes default
  } = options;

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['supabase', table, id, { select }],
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
    enabled: enabled && !!id,
    staleTime,
  });

  useEffect(() => {
    if (!id || !realtime || !enabled) return;

    const channelId = `${table}_${id}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
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
  }, [table, id, queryClient, realtime, enabled]);

  return { 
    data: query.data ?? null, 
    isLoading: query.isLoading, 
    error: (query.error as Error) ?? null 
  };
}
