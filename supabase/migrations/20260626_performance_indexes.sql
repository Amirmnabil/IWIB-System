-- ============================================================
-- IWIB CRM — Phase 3 Performance Index Migration
-- File: supabase/migrations/20260626_performance_indexes.sql
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- All indexes use IF NOT EXISTS — safe to run multiple times
-- ============================================================

-- -------------------------------------------------------
-- COMPANIES (most queried table — used on every page load)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_status
  ON companies(status);

CREATE INDEX IF NOT EXISTS idx_companies_assigned_user
  ON companies(assigned_user_id);

-- Supports name-based duplicate detection in LeadService
CREATE INDEX IF NOT EXISTS idx_companies_name
  ON companies(name);

-- Supports the Smart Sort priority scoring (date-based sort)
CREATE INDEX IF NOT EXISTS idx_companies_expected_offer_date
  ON companies(expected_offer_date);

CREATE INDEX IF NOT EXISTS idx_companies_expected_renewal_date
  ON companies(expected_renewal_date);


-- -------------------------------------------------------
-- LEADS
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_company_id
  ON leads(company_id);

CREATE INDEX IF NOT EXISTS idx_leads_status
  ON leads(status);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_user
  ON leads(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads(created_at DESC);


-- -------------------------------------------------------
-- PROSPECTS
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_prospects_company_id
  ON prospects(company_id);

CREATE INDEX IF NOT EXISTS idx_prospects_lead_id
  ON prospects(lead_id);

CREATE INDEX IF NOT EXISTS idx_prospects_pipeline_stage
  ON prospects(pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_prospects_assigned_user
  ON prospects(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_prospects_created_at
  ON prospects(created_at DESC);


-- -------------------------------------------------------
-- POLICIES
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_policies_client_company_id
  ON policies(client_company_id);

CREATE INDEX IF NOT EXISTS idx_policies_policy_status
  ON policies(policy_status);

CREATE INDEX IF NOT EXISTS idx_policies_insurer_id
  ON policies(insurer_id);

CREATE INDEX IF NOT EXISTS idx_policies_end_date
  ON policies(end_date);

CREATE INDEX IF NOT EXISTS idx_policies_created_at
  ON policies(created_at DESC);


-- -------------------------------------------------------
-- POLICY MEMBERS (census queries)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_policy_members_policy_id
  ON policy_members(policy_id);


-- -------------------------------------------------------
-- ACTIVITIES (used in workflow triggers & detail views)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_activities_related_id
  ON activities(related_id);

CREATE INDEX IF NOT EXISTS idx_activities_related_type
  ON activities(related_type);

CREATE INDEX IF NOT EXISTS idx_activities_status
  ON activities(status);

CREATE INDEX IF NOT EXISTS idx_activities_due_date
  ON activities(due_date);

-- Composite index for the most common activities query pattern:
-- "find pending activities for a related entity"
CREATE INDEX IF NOT EXISTS idx_activities_related_pending
  ON activities(related_id, status)
  WHERE status = 'pending';


-- -------------------------------------------------------
-- CONTACTS
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_company_id
  ON contacts(company_id);

CREATE INDEX IF NOT EXISTS idx_contacts_email
  ON contacts(email);


-- -------------------------------------------------------
-- CLAIMS
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_claims_policy_id
  ON claims(policy_id);

CREATE INDEX IF NOT EXISTS idx_claims_status
  ON claims(status);


-- -------------------------------------------------------
-- COMMISSIONS
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_commissions_policy_id
  ON commissions(policy_id);

CREATE INDEX IF NOT EXISTS idx_commissions_status
  ON commissions(commission_status);



-- ============================================================
-- VERIFY: Run this after applying to confirm indexes were created
-- ============================================================
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
