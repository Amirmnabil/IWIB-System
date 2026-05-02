
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Broker' | 'User' | 'Manager';
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Company {
  id: string;
  code?: string;
  name: string; // English Name
  name_ar?: string; // Arabic Name
  status: 'lead' | 'interested' | 'follow_up' | 'refused' | 'wrong_number' | 'client' | 'renewed' | string;
  industry?: string;
  employee_count?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  city?: string;
  address?: string;
  cr_number?: string;
  tax_card?: string;
  current_insurer?: string;
  
  // Telesales / Insurance Specific
  insurance_type?: 'Medical' | 'Life' | 'Motor' | 'Property' | 'Liability' | 'Marine' | 'Engineering' | 'Financial Lines' | 'Cyber' | 'Travel' | 'Personal Accident' | 'Other';
  medical_subtype?: 'SME' | 'Corporate / Group';
  checklist_status?: Record<string, boolean>;
  checklist_completion?: 'Pending' | 'Partially Received' | 'Completed';
  
  // Milestones
  expected_renewal_date?: string;
  expected_offer_date?: string;
  actual_renewal_date?: string;
  actual_offer_date?: string;
  
  // Primary Contact
  primary_contact_title?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  
  // Second Contact
  second_contact_title?: string;
  second_contact_name?: string;
  second_contact_mobile?: string;
  second_contact_email?: string;
  
  // Third Contact
  third_contact_title?: string;
  third_contact_name?: string;
  third_contact_mobile?: string;
  third_contact_email?: string;
  
  website?: string;
  linkedin_page?: string;
  landline?: string;
  
  assigned_user_id?: string;
  assigned_user_name?: string;
  source?: string;
  
  last_contact_date?: string;
  call_date?: string;
  follow_up_date?: string;
  renewal_month?: string;
  notes?: string;
  
  created_at: string;
  [key: string]: any;
}

export interface InsurerAccountManager {
  name: string;
  phone?: string;
  email?: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  client_company_id: string;
  client_company_name: string;
  insurer_id: string;
  insurer_name: string;
  tpa_id?: string;
  tpa_name?: string;
  policy_type: string;
  start_date: string;
  end_date: string;
  premium_total: number;
  premium_gross?: number;
  contract_net?: number;
  fee_percent?: number;
  insurer_account_managers?: InsurerAccountManager[];
  sales_person?: string;
  iwib_account_manager_id?: string;
  iwib_account_manager_name?: string;
  contract_document_url?: string;
  related_documents?: { name: string; url: string }[];
  policy_status: string;
  member_count?: number;
  created_at: string;
  [key: string]: any;
}

export interface PolicyMember {
  id: string;
  policy_id: string;
  member_name: string;
  member_code?: string;
  staff_code?: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  relation: 'Principal' | 'Spouse' | 'Child';
  nationality?: string;
  national_id?: string;
  plan_category?: string;
  location?: string;
  department?: string;
  job_title?: string;
  premium?: number;
  addition_date?: string;
  deletion_date?: string;
  mobile_number?: string;
  notes?: string;
  created_at: string;
}

export interface Claim {
  id: string;
  claim_number: string;
  policy_id: string;
  policy_number: string;
  member_id: string;
  member_name: string;
  company_id: string;
  company_name: string;
  claim_type: string;
  incident_date: string;
  submission_date: string;
  claim_amount: number;
  status: string;
  created_at: string;
  [key: string]: any;
}

export interface InsuranceCompany {
  id: string;
  companyName: string;
  companyCode: string;
  companyType: 'Takaful' | 'Investment';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Negotiation' | 'Contract Expired' | 'Blacklisted';
  [key: string]: any;
}

export interface TPA {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CensusMember {
  id: string;
  member_full_name: string;
  national_id: string;
  policy_number: string;
  relation: string;
  status: string;
  [key: string]: any;
}

export interface SMEQuotation {
  id: string;
  companyName: string;
  companyId?: string;
  policyStartDate: string;
  members: any[];
  selectedPlanIds: string[];
  snapshots?: Record<string, any>;
  version: number;
  status: 'pending' | 'approved';
  created_at: string;
  user_id: string;
}

export interface Activity {
  id: string;
  activity_type: 'call' | 'meeting' | 'task' | 'follow_up' | 'feedback' | 'note';
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  due_date: string; // Start Date
  end_date?: string; // End Date for ranges
  related_type?: 'company' | 'lead' | 'prospect' | 'policy' | 'claim' | 'contact';
  related_id?: string;
  related_name?: string;
  assigned_to_name?: string;
  assigned_to_id?: string;
  result?: string;
  duration_minutes?: number;
  created_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name?: string;
  status: string;
  lead_source?: string;
  priority?: string;
  estimated_premium?: number;
  next_follow_up?: string;
  assigned_user_name?: string;
  notes?: string;
  created_at: string;
}

export interface Prospect {
  id: string;
  company_name: string;
  company_id?: string;
  lead_id?: string;
  pipeline_stage: string;
  probability?: number;
  estimated_value?: number;
  expected_close_date?: string;
  assigned_user_name?: string;
  assigned_user_id?: string;
  current_insurer?: string;
  current_tpa?: string;
  requested_products: string[];
  notes?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  policy_number: string;
  policy_id: string;
  client_company_name: string;
  client_company_id?: string;
  insurer_name: string;
  insurer_id?: string;
  commission_rate: number;
  premium_amount: number;
  expected_commission: number;
  accrued_commission?: number;
  paid_commission?: number;
  commission_status: string;
  period_start?: string;
  period_end?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_company_id: string;
  client_company_name: string;
  policy_id?: string;
  policy_number?: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  balance?: number;
  status: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id?: string;
  invoice_number?: string;
  policy_number?: string;
  client_company_name: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  bank_name?: string;
  status: string;
  received_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface Renewal {
  id: string;
  policy_id: string;
  policy_number: string;
  client_company_name: string;
  client_company_id?: string;
  renewal_term_start: string;
  renewal_term_end: string;
  current_premium: number;
  proposed_premium: number;
  renewal_status: string;
  renewal_probability?: number;
  assigned_user_name?: string;
  notes?: string;
  days_until_expiry?: number;
  premium_change_percent?: number;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  type: string;
  license_number?: string;
  address?: string;
  city?: string;
  country?: string;
  is_in_network?: boolean;
  tpa_names?: string[];
  capabilities?: string[];
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface RiskScore {
  id: string;
  company_id: string;
  company_name: string;
  policy_id?: string;
  policy_number?: string;
  score_value: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  calculated_at: string;
  notes?: string;
  components?: {
    age_score?: number;
    claims_history_score?: number;
    industry_score?: number;
    [key: string]: any;
  };
}

export interface KYC {
  id: string;
  company_id?: string;
  company_name?: string;
  contact_name?: string;
  document_type: string;
  document_number?: string;
  file_url: string;
  expiry_date?: string;
  status: string;
  verified_by_id?: string;
  verified_by_name?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}
