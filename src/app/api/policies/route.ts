import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch real policies from public.policies using exact column names: id, policy_number, client_company_name, insurer_name
    const { data: polsData, error: polsError } = await supabaseAdmin
      .from('policies')
      .select('id, policy_number, client_company_name, insurer_name, policy_status')
      .order('created_at', { ascending: false });

    if (polsError) {
      console.error('[API /api/policies GET] Error fetching policies:', polsError);
    }

    let result = (polsData || []).map((p: any) => ({
      id: p.id,
      policy_number: p.policy_number || `POL-${p.id.substring(0, 8)}`,
      company_name: p.client_company_name || p.insurer_name || 'Corporate Policy',
      policy_holder_name: p.client_company_name || p.insurer_name || 'Corporate Policy'
    }));

    // Fallback if public.policies is empty: fetch real client companies from public.companies
    if (result.length === 0) {
      const { data: compData, error: compError } = await supabaseAdmin
        .from('companies')
        .select('id, name, name_ar, code');

      if (compError) {
        console.error('[API /api/policies GET] Error fetching companies:', compError);
      }

      if (compData && compData.length > 0) {
        result = compData.map((c: any) => ({
          id: c.id,
          policy_number: c.code ? `POL-${c.code}` : `POL-${(c.name || 'CLIENT').substring(0, 4).toUpperCase()}-2026`,
          company_name: c.name || c.name_ar || 'Client Company',
          policy_holder_name: c.name || c.name_ar || 'Client Company'
        }));
      }
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/policies GET] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
