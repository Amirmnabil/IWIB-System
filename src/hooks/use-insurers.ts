import { useCallback } from 'react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { InsuranceCompany } from "@/lib/types";

const EMPTY_ARRAY: any[] = [];

export function useInsurers() {
  const filter = useCallback((q: any) => q.order('companyName', { ascending: true }), []);
  const { data, isLoading } = useSupabaseCollection<InsuranceCompany>('insurance_companies', filter);

  return {
    data: data || EMPTY_ARRAY,
    isLoading
  };
}
