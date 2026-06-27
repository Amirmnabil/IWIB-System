import { useMemo } from 'react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';

const EMPTY_ARRAY: any[] = [];

export function useMasterData(category: string) {
  const collectionPath = `master_${category}`;
  
  const { data, isLoading } = useSupabaseCollection<any>(collectionPath);

  const sortedData = useMemo(() => {
    if (!data) return EMPTY_ARRAY;
    return [...data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [data]);

  return {
    data: sortedData,
    isLoading
  };
}
