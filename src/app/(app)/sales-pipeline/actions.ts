'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sanitizeUUIDs } from '@/lib/utils/sanitize-uuids'

export async function createProspect(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if cookies cannot be set
          }
        },
      },
    }
  );

  const payload = sanitizeUUIDs({
    company_name: formData.get('company_name'),
    company_id: formData.get('company_id'),
    pipeline_stage: formData.get('pipeline_stage'),
    probability: formData.get('probability') ? Number(formData.get('probability')) : 50,
    estimated_value: formData.get('estimated_value') ? Number(formData.get('estimated_value')) : 0,
    expected_close_date: formData.get('expected_close_date') || null,
    notes: formData.get('notes') || null,
    created_at: new Date().toISOString(),
    requested_products: []
  })

  const { error } = await supabase.from('prospects').insert(sanitizeUUIDs([payload]))
  if (error) throw new Error(error.message)
}
