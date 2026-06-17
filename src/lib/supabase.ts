import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Basic URL validation
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[IWIB] Missing Supabase environment variables. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before starting the app.'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
