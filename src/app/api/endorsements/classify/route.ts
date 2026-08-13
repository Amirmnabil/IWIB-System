import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endorsement_type_id } = body;

    if (!endorsement_type_id) {
      return NextResponse.json({ error: 'Missing endorsement_type_id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: endorsementType, error } = await supabaseAdmin
      .from('endorsement_types')
      .select('*')
      .eq('id', endorsement_type_id)
      .maybeSingle();

    if (error || !endorsementType) {
      return NextResponse.json({ error: 'Endorsement type not found' }, { status: 404 });
    }

    return NextResponse.json({
      is_financial: endorsementType.is_financial,
      category: endorsementType.category,
      line_of_business: endorsementType.line_of_business,
      name: endorsementType.name
    });
  } catch (err: any) {
    console.error('Classification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
