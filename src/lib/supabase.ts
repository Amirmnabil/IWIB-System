import { createClient } from '@supabase/supabase-js';

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

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl)) {
  console.warn('Supabase URL is invalid or missing. Using mock client.');
}

// If URL is invalid, we export a mock client to prevent the app from crashing on start
export const supabase = isValidUrl(supabaseUrl) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb)
          }),
          then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb)
        }),
        delete: () => ({ neq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      }),
      auth: {
        onAuthStateChange: (callback: any) => {
          // Immediately call callback with no session for the mock
          setTimeout(() => callback('SIGNED_OUT', null), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ 
          data: { user: null, session: null }, 
          error: { message: 'Supabase is not configured. Please check your environment variables.' } 
        }),
        signOut: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Mock mode active.' } }),
      },
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({})
      }),
      removeChannel: () => {}
    } as any);
