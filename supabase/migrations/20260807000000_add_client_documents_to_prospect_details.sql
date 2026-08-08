-- ============================================================
-- IWIB — Add client_documents to prospect_details
-- Migration: 20260807000000_add_client_documents_to_prospect_details.sql
--
-- Purpose:
--   The Companies page stores client-uploaded files in proposal_versions
--   when "Request Quotation" is triggered. However, saveUnderwritingVersions()
--   in the Underwriting module later overwrites proposal_versions with insurer
--   offer data. This migration adds a dedicated client_documents column so
--   the original client uploads are preserved independently.
-- ============================================================

-- 1. Add client_documents column
ALTER TABLE public.prospect_details
  ADD COLUMN IF NOT EXISTS client_documents jsonb DEFAULT '[]'::jsonb;

-- 2. Backfill: copy existing proposal_versions entries that look like
--    client-uploaded docs (have name + url + uploaded_at, but NOT insurer/premium)
--    into client_documents so data already in the system is preserved.
UPDATE public.prospect_details
SET client_documents = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(COALESCE(proposal_versions, '[]'::jsonb)) AS elem
  WHERE
    (elem ? 'name') AND
    (elem ? 'url') AND
    (elem ? 'uploaded_at') AND
    NOT (elem ? 'insurer') AND
    NOT (elem ? 'premium')
)
WHERE
  proposal_versions IS NOT NULL AND
  jsonb_array_length(COALESCE(proposal_versions, '[]'::jsonb)) > 0 AND
  (client_documents IS NULL OR jsonb_array_length(client_documents) = 0);

-- 3. Index for quick lookup by company
CREATE INDEX IF NOT EXISTS idx_prospect_details_client_docs
  ON public.prospect_details USING gin (client_documents);
