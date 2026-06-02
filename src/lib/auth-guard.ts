import { createClient } from '@supabase/supabase-js';

// Initialize a supabase client with service role for backend checks if needed
// or use the standard authenticated client provided by @supabase/ssr in your routes.

/**
 * Backend permission guard to check if a user can perform an action on a page.
 * Use this in API routes or Server Actions.
 * 
 * @param supabase The authenticated Supabase client instance
 * @param userId The user's database ID (not auth ID unless they are the same)
 * @param pageCode The page code (e.g. '/companies')
 * @param actionCode The action required (e.g. 'view', 'create', 'edit')
 * @returns boolean indicating if the user has access
 */
export async function checkServerPermission(
  supabase: any,
  userId: string,
  pageCode: string,
  actionCode: string
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase.rpc('check_user_page_permission', {
      p_user_id: userId,
      p_page_code: pageCode,
      p_action_code: actionCode
    });

    if (error) {
      console.error("Error checking permissions:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Exception checking permissions:", error);
    return false;
  }
}

/**
 * Example usage for a Next.js App Router API Endpoint:
 * 
 * import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
 * import { checkServerPermission } from '@/lib/auth-guard';
 * 
 * export async function POST(req: Request) {
 *   const supabase = createRouteHandlerClient({ cookies });
 *   const { data: { session } } = await supabase.auth.getSession();
 *   
 *   if (!session) return new Response("Unauthorized", { status: 401 });
 *   
 *   const hasAccess = await checkServerPermission(supabase, session.user.id, '/companies', 'create');
 *   if (!hasAccess) {
 *     return new Response("Forbidden: Missing create permission for companies", { status: 403 });
 *   }
 *   
 *   // Proceed with action...
 * }
 */
