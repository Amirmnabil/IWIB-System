-- Drop the default Supabase auth trigger if it exists and is causing schema mismatch errors
-- This typically happens when the public.users schema is modified but the trigger still tries to insert old columns like 'full_name' or 'avatar_url'.

-- Note: Our Next.js backend API (/api/admin/create-user) handles inserting into the public.users table manually, 
-- so we do not need this trigger for admin-created users.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
