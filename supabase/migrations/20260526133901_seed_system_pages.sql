-- 1. Insert system pages if system_modules exist
DO $$
DECLARE
  mod_crm uuid;
  mod_underwriting uuid;
  mod_policy_admin uuid;
  mod_claims uuid;
  mod_finance uuid;
  mod_master_data uuid;
  mod_complaints uuid;
  mod_analytics uuid;
  mod_settings uuid;
  mod_user_manual uuid;
BEGIN
  -- Get module IDs
  SELECT id INTO mod_crm FROM public.system_modules WHERE code = 'crm';
  SELECT id INTO mod_underwriting FROM public.system_modules WHERE code = 'underwriting';
  SELECT id INTO mod_policy_admin FROM public.system_modules WHERE code = 'policy_admin';
  SELECT id INTO mod_claims FROM public.system_modules WHERE code = 'claims';
  SELECT id INTO mod_finance FROM public.system_modules WHERE code = 'finance';
  SELECT id INTO mod_master_data FROM public.system_modules WHERE code = 'master_data';
  SELECT id INTO mod_complaints FROM public.system_modules WHERE code = 'complaints';
  SELECT id INTO mod_analytics FROM public.system_modules WHERE code = 'analytics';
  SELECT id INTO mod_settings FROM public.system_modules WHERE code = 'settings';
  SELECT id INTO mod_user_manual FROM public.system_modules WHERE code = 'user_manual';

  -- CRM
  IF mod_crm IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_crm, 'Companies', '/companies', '/companies'),
      (mod_crm, 'Contacts', '/contacts', '/contacts'),
      (mod_crm, 'Leads', '/leads', '/leads'),
      (mod_crm, 'Prospects', '/prospects', '/prospects'),
      (mod_crm, 'Activities', '/activities', '/activities'),
      (mod_crm, 'Calendar', '/calendar', '/calendar'),
      (mod_crm, 'Sales Pipeline', '/sales-pipeline', '/sales-pipeline')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Underwriting
  IF mod_underwriting IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_underwriting, 'Quotations', '/underwriting/quotations', '/underwriting/quotations'),
      (mod_underwriting, 'SME Medical Pricing', '/underwriting/medical-pricing', '/underwriting/medical-pricing'),
      (mod_underwriting, 'Motor Insurance Pricing', '/underwriting/motor-pricing', '/underwriting/motor-pricing'),
      (mod_underwriting, 'Census', '/census', '/census'),
      (mod_underwriting, 'Benefit Schedules', '/benefit-schedules', '/benefit-schedules'),
      (mod_underwriting, 'Risk Scoring', '/risk-scoring', '/risk-scoring')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Policy Admin
  IF mod_policy_admin IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_policy_admin, 'Policies', '/policies', '/policies'),
      (mod_policy_admin, 'Medical Analytics', '/policy-admin/medical-utilization', '/policy-admin/medical-utilization'),
      (mod_policy_admin, 'Endorsements', '/endorsements', '/endorsements'),
      (mod_policy_admin, 'Renewals', '/renewals', '/renewals')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Claims
  IF mod_claims IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_claims, 'All Claims', '/claims', '/claims'),
      (mod_claims, 'Appeals', '/claim-appeals', '/claim-appeals'),
      (mod_claims, 'Fraud Detection', '/fraud-detection', '/fraud-detection')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Master Data
  IF mod_master_data IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_master_data, 'Insurance Companies', '/insurance-companies', '/insurance-companies'),
      (mod_master_data, 'TPAs', '/tpas', '/tpas'),
      (mod_master_data, 'Provider Network', '/providers', '/providers'),
      (mod_master_data, 'Reference Lists', '/master-data/reference-lists', '/master-data/reference-lists')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Finance
  IF mod_finance IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_finance, 'Invoices', '/invoices', '/invoices'),
      (mod_finance, 'Payments', '/payments', '/payments'),
      (mod_finance, 'Commissions', '/commissions', '/commissions')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Compliance
  IF mod_complaints IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_complaints, 'KYC Documents', '/kyc-documents', '/kyc-documents'),
      (mod_complaints, 'Audit Logs', '/audit-logs', '/audit-logs')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Analytics
  IF mod_analytics IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_analytics, 'Analytics', '/analytics', '/analytics')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- Settings
  IF mod_settings IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_settings, 'Settings', '/settings', '/settings')
    ON CONFLICT (code) DO NOTHING;
  END IF;

  -- User Manual
  IF mod_user_manual IS NOT NULL THEN
    INSERT INTO public.system_pages (module_id, name, code, path) VALUES
      (mod_user_manual, 'User Manual', '/user-manual', '/user-manual')
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;
