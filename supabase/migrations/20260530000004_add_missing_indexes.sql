-- Missing foreign key indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_account_manager
  ON public.policies (iwib_account_manager_id);

CREATE INDEX IF NOT EXISTS idx_prospects_lead_id
  ON public.prospects (lead_id);

-- Additional common foreign key columns across the schema
CREATE INDEX IF NOT EXISTS idx_prospects_company_id ON public.prospects (company_id);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_user ON public.prospects (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON public.leads (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_policies_insurer ON public.policies (insurer_id);
CREATE INDEX IF NOT EXISTS idx_policies_tpa ON public.policies (tpa_id);
CREATE INDEX IF NOT EXISTS idx_policy_members_policy ON public.policy_members (policy_id);
CREATE INDEX IF NOT EXISTS idx_sme_quotations_company ON public.sme_quotations (company_id);
CREATE INDEX IF NOT EXISTS idx_sme_quotations_user ON public.sme_quotations (user_id);
CREATE INDEX IF NOT EXISTS idx_census_members_policy ON public.census_members (policy_id);
CREATE INDEX IF NOT EXISTS idx_benefit_schedules_policy ON public.benefit_schedules (policy_id);
CREATE INDEX IF NOT EXISTS idx_claim_appeals_claim ON public.claim_appeals (claim_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_insurer ON public.commissions (insurer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_client ON public.commissions (client_company_id);
CREATE INDEX IF NOT EXISTS idx_renewals_client ON public.renewals (client_company_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_company ON public.kyc_documents (company_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_policy ON public.risk_scores (policy_id);
