import { useMemo } from 'react';
import { collection, query, orderBy } from "@/firebase";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { InsuranceCompany } from "@/lib/types";

const EMPTY_ARRAY: any[] = [];

export function useInsurers() {
  const firestore = useFirestore();
  
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'insurance_companies'), orderBy('companyName', 'asc'));
  }, [firestore]);

  const { data, isLoading } = useCollection<InsuranceCompany>(q);

  return {
    data: data || EMPTY_ARRAY,
    isLoading
  };
}
