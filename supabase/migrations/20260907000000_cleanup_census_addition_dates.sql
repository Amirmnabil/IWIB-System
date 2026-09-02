-- =========================================================================================
-- MIGRATION: 20260907000000_cleanup_census_addition_dates.sql
-- DESCRIPTION: Non-destructive data cleanup for initial census subscribers.
--              In the policy census roster, any individual without an addition date is an
--              initial/primary subscriber from the start of the policy (inception) and
--              not a mid-term addition.
--              This script resets addition_date to NULL for members whose addition_date was
--              previously set to the policy start date or creation date at initial upload.
-- =========================================================================================

-- 1. Reset addition_date to NULL in policy_members for invalid initial policy subscribers
-- (where addition_date < policy.start_date)
UPDATE public.policy_members pm
SET addition_date = NULL
FROM public.policies p
WHERE pm.policy_id = p.id
  AND pm.addition_date IS NOT NULL
  AND p.start_date IS NOT NULL
  AND pm.addition_date < p.start_date;

-- 2. Reset addition_date to NULL in census_members for invalid initial policy subscribers
UPDATE public.census_members cm
SET addition_date = NULL
FROM public.policies p
WHERE cm.policy_id = p.id
  AND cm.addition_date IS NOT NULL
  AND p.start_date IS NOT NULL
  AND cm.addition_date < p.start_date;

-- 3. For standalone census_members unlinked from policy with addition_date strictly before start_date
UPDATE public.census_members
SET addition_date = NULL
WHERE addition_date IS NOT NULL
  AND start_date IS NOT NULL
  AND addition_date < start_date;
