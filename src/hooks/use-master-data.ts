import { useMemo } from 'react';
import { collection, query, orderBy } from "@/firebase";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";

const EMPTY_ARRAY: any[] = [];

export function useMasterData(category: string) {
  const firestore = useFirestore();
  const collectionPath = `master_${category}`;
  
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    // Sort by display_order first, then by name/subcategory
    return query(
      collection(firestore, collectionPath), 
      orderBy('display_order', 'asc')
    );
  }, [firestore, collectionPath]);

  const { data, isLoading } = useCollection<any>(q);

  return {
    data: data || EMPTY_ARRAY,
    isLoading
  };
}
