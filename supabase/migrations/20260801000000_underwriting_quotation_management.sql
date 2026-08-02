-- ============================================================
-- IWIB — Underwriting Quotation Management
-- Migration: 20260801000000_underwriting_quotation_management.sql
-- Extends prospect_details with underwriting lifecycle columns
-- ============================================================

-- 1. Add underwriting_status to prospect_details
ALTER TABLE public.prospect_details
  ADD COLUMN IF NOT EXISTS underwriting_status text DEFAULT 'pending'
    CHECK (underwriting_status IN ('pending', 'in_progress', 'done'));

-- 2. Add underwriting_versions JSONB to prospect_details
--    Stores full versioned offer history, separate from proposal_versions.
--    On save, offers are flattened & synced into proposal_versions automatically.
ALTER TABLE public.prospect_details
  ADD COLUMN IF NOT EXISTS underwriting_versions jsonb DEFAULT '[]'::jsonb;

-- 3. Index on underwriting_status for fast tab filtering
CREATE INDEX IF NOT EXISTS idx_prospect_details_uw_status
  ON public.prospect_details(underwriting_status);

-- 4. Backfill underwriting_status for existing rows
--    Rows that already have proposal_versions populated → in_progress
--    Others → pending
UPDATE public.prospect_details
  SET underwriting_status = 'in_progress'
  WHERE jsonb_array_length(COALESCE(proposal_versions, '[]'::jsonb)) > 0
    AND underwriting_status = 'pending';
