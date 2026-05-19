-- Migration: Fix Row Level Security policies for audit_logs
-- Allows insert operations for all users (including anonymous/system events)
-- strictly preserves select/read permission for authenticated users only,
-- and forbids any update or delete actions to prevent tampering.

-- 1. Drop existing generic loop policies for audit_logs
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.audit_logs;

-- 2. Create the relaxed insert policy (permits both anon and authenticated users to log events)
CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (true);

-- 3. Ensure select is still restricted to authenticated users
-- (In a production environment, this should ideally be restricted to Admin role users)
DROP POLICY IF EXISTS "Authenticated users can select" ON public.audit_logs;
CREATE POLICY "Authenticated users can select" ON public.audit_logs
    FOR SELECT 
    USING (auth.role() = 'authenticated');
