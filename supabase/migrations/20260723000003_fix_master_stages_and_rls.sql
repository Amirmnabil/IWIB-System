-- =========================================================================
-- IWIB CRM — Master Data Stages and RLS Read Policies
-- Migration File: supabase/migrations/20260723000003_fix_master_stages_and_rls.sql
-- =========================================================================

-- 1. Truncate master_pipeline_stages to clean old lead-only stages
TRUNCATE TABLE public.master_pipeline_stages CASCADE;

-- 2. Insert standardized Prospect sub-stages
INSERT INTO public.master_pipeline_stages (name, code, "order") VALUES
('Qualification', 'qualification', 1),
('Needs Analysis', 'needs_analysis', 2),
('Proposal', 'proposal', 3),
('Negotiation', 'negotiation', 4),
('Closed Won', 'closed_won', 5),
('Closed Lost', 'closed_lost', 6);

-- 3. Configure public read SELECT policies on master tables
-- This ensures that the client browser (using the anon key) can read lookup dropdowns.
ALTER TABLE public.master_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_industries ENABLE ROW LEVEL SECURITY;

-- Select policy for master_pipeline_stages
DROP POLICY IF EXISTS "Allow public read for master_pipeline_stages" ON public.master_pipeline_stages;
CREATE POLICY "Allow public read for master_pipeline_stages" 
  ON public.master_pipeline_stages FOR SELECT USING (true);

-- Select policy for master_industries
DROP POLICY IF EXISTS "Allow public read for master_industries" ON public.master_industries;
CREATE POLICY "Allow public read for master_industries" 
  ON public.master_industries FOR SELECT USING (true);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
