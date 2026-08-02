import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { queryClient } from '@/components/providers';

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

// Intercept promise chains for insert, update, upsert, delete mutations
function wrapMutationBuilder(builder: any, table: string): any {
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'then') {
        return function (onfulfilled: any, onrejected: any) {
          return target.then(
            (res: any) => {
              // Trigger TanStack query cache invalidation on successful execution of mutation
              if (res && !res.error) {
                if (typeof window !== 'undefined') {
                  setTimeout(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['supabase', table],
                    });
                  }, 50); // Small timeout to ensure backend write-propagation
                }
              }
              return onfulfilled ? onfulfilled(res) : res;
            },
            (err: any) => {
              return onrejected ? onrejected(err) : Promise.reject(err);
            }
          );
        };
      }

      const val = target[prop];
      if (typeof val === 'function') {
        return function (...args: any[]) {
          const result = val.apply(target, args);
          // If the return value is another builder (chainable filters), recursively wrap it
          if (result && typeof result.then === 'function') {
            return wrapMutationBuilder(result, table);
          }
          return result;
        };
      }
      return val;
    },
  });
}

// Proxies the client-side Supabase client to intercept `from` calls
function wrapSupabaseClient(client: any) {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return function (table: string) {
          const queryBuilder = target.from(table);
          return new Proxy(queryBuilder, {
            get(builderTarget, builderProp) {
              const originalVal = builderTarget[builderProp];
              if (typeof originalVal === 'function') {
                return function (...args: any[]) {
                  const result = originalVal.apply(builderTarget, args);
                  if (['insert', 'update', 'upsert', 'delete'].includes(builderProp as string)) {
                    return wrapMutationBuilder(result, table);
                  }
                  return result;
                };
              }
              return originalVal;
            },
          });
        };
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

export const supabase = typeof window === 'undefined'
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : wrapSupabaseClient(createBrowserClient(supabaseUrl, supabaseAnonKey));
