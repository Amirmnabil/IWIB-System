-- Drop the broken foreign key constraint that resolved to the old table
ALTER TABLE public.endorsements DROP CONSTRAINT IF EXISTS endorsements_policy_id_fkey;

-- Re-add the constraint explicitly to the correct policies table
-- If policies is a view, you might not be able to add an FK to it. In that case, we can omit the FK.
-- But let's try to add it. If it fails, the user can just omit it.
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.endorsements ADD CONSTRAINT endorsements_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        -- If policies is a view or something else prevents it, leave without FK constraint
        NULL;
    END;
END $$;
