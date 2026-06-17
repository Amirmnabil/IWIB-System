
export interface User {
    id: string;
    name: string;
    email: string;
    role: string; // Dynamic role name
    is_admin: boolean;
    department?: string;
    level?: string; // manager | senior | junior
    status: 'active' | 'inactive';
    created_at: string;
}

export interface SystemModule {
    id: string;
    name: string;
    code: string;
    description?: string;
}

export interface PermissionAction {
    id: string;
    name: string;
    code: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    is_system: boolean;
    permissions?: RolePermission[];
}

export interface RolePermission {
    module_id: string;
    module_code: string;
    permission_id: string;
    permission_code: string;
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
  insurance_type?: 'Medical' | 'Life' | 'Motor' | 'Property' | 'Liability' | 'Marine' | 'Engineering' | 'Financial Lines' | 'Cyber' | 'Travel' | 'Personal Accident' | 'Other' | 'type_medical' | 'type_life' | 'type_motor' | 'type_property' | 'type_liability' | 'type_marine' | 'type_engineering' | 'type_financial_lines' | 'type_cyber' | 'type_travel' | 'type_personal_accident';
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
  primary_contact_role_id?: string;
  second_contact_name?: string;
  second_contact_mobile?: string;
  second_contact_email?: string;
  second_contact_title?: string;
  second_contact_role_id?: string;
  third_contact_name?: string;
  third_contact_mobile?: string;
  third_contact_email?: string;
  third_contact_title?: string;
  third_contact_role_id?: string;
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
  insurer_policy_number?: string;
  client_company_id: string;
  client_company_name: string;
  insurer_id: string;
  insurer_name: string;
  tpa_id?: string;
  tpa_name?: string;
  policy_type?: string;
  line_of_business_id?: string;
  product_subtype_id?: string;
  client_type_id?: string;
  start_date: string;
  end_date: string;
  policy_value?: number;
  rate?: number;
  premium_total: number;
  premium_gross?: number;
  contract_net?: number;
  tax_amount?: number;
  tax_type?: 'percentage' | 'amount';
  tpa_fee?: number;
  tpa_fee_type?: 'percentage' | 'amount';
  medical_brackets?: any;
  fee_percent?: number;
  broker_commission_percent?: number;
  taxes_percent?: number;
  insurer_account_managers?: InsurerAccountManager[];
  sales_person?: string;
  iwib_account_manager_id?: string;
  iwib_account_manager_name?: string;
  contract_document_url?: string;
  related_documents?: { name: string; url: string; type?: string; uploaded_at?: string }[];
  policy_status: string;
  member_count?: number;
  created_at: string;
  [key: string]: any;
}

export interface PolicyMember {
  id: string;
  policy_id: string;
  member_name: string;
  member_id_tpa?: string;
  member_id_insurance?: string;
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
  companyType?: 'Takaful' | 'Investment' | 'Direct';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Under Negotiation' | 'Contract Expired' | 'Blacklisted';
  rating?: string;
  type?: string[];
  email?: string;
  telephones?: string[];
  phone?: string;
  website?: string;
  address?: string | { fullAddress?: string; area?: string; city?: string; country?: string };
  commercialRegistration?: string;
  taxCard?: string;
  internalComments?: string;
  notes?: string;
  calculationMethod?: 'Monthly' | 'Daily';
  proration_method?: 'daily' | 'monthly';
  allowDeletionIfUtilized?: boolean;
  waitingPeriodDays?: number;
  created_at?: any;
  updated_at?: any;
  [key: string]: any;
}

export interface InsurerContact {
  id: string;
  name: string;
  position?: string;
  department?: string;
  insuranceType?: string;
  subCategory?: string;
  email: string;
  mobile?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
  status: string;
  created_at: any;
}

export interface CommissionAgreement {
  id: string;
  policy_id?: string;
  insurer_id?: string;
  productType: string;
  effectiveFrom: any;
  effectiveTo: any;
  status: 'Active' | 'Inactive' | 'Expired';
  notes?: string;
  commissionStructure: {
    essential: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
      conditions?: string;
    };
    supplementary?: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
      conditions?: string;
    } | null;
    motivational?: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
      conditions?: string;
      targetPremium?: number;
      paymentTarget?: 'Immediate' | 'All Installments' | 'Specific Installment';
      targetInstallmentNumber?: number;
    } | null;
    retentionIncentive?: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
      conditions?: string;
      targetPremium?: number;
      paymentTarget?: 'Immediate' | 'All Installments' | 'Specific Installment';
      targetInstallmentNumber?: number;
    } | null;
    volumeBonus?: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
      conditions?: string;
      targetPremium?: number;
      paymentTarget?: 'Immediate' | 'All Installments' | 'Specific Installment';
      targetInstallmentNumber?: number;
    } | null;
    tpaFee?: {
      rate: number;
      calculationBase: 'Gross Premium' | 'Net Premium' | 'Collected Premium' | 'Fixed Amount';
      paymentFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'One-Time';
      conditions?: string;
    } | null;
  };
  updated_at?: any;
  created_at?: any;
}


export interface TPA {
  id: string;
  name: string;
  name_ar?: string;
  code?: string;
  primary_contact_name?: string;
  primary_contact_title?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  primary_contact_mobile?: string;
  additional_contacts?: any[];
  portal_url?: string;
  sla_approval_hours?: number;
  sla_response_hours?: number;
  network_strength_score?: number;
  associated_insurers?: string[];
  address?: string;
  notes?: string;
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

export interface SMEOffer {
  id: string;
  user_id: string;
  company_name: string;
  offer_name: string;
  selected_plans: {
    members: Member[];
    planIds: string[];
    snapshots: Record<string, any>;
    policyStartDate: string;
    companyId?: string;
    cashbackAmount?: number;
  };
  comparison_data?: any;
  total_premium: number;
  currency: string;
  status: string;
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  name: string;
  birthdate: string;
  age: number;
  type: 'Employee' | 'Spouse' | 'Child';
  isValid: boolean;
  invalidReason?: string;
}

export interface CalculationBreakdown {
  employeeTotal: number;
  spouseTotal: number;
  childTotal: number;
  totalMembers: number;
  excludedMembers: number;
}

export interface ContactRole {
  id: string;
  role_name_en: string;
  role_name_ar: string;
  role_category: 'Client' | 'Insurer' | 'TPA' | 'Provider';
  sub_role_en?: string;
  sub_role_ar?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  // Removed job_title
  role_type?: string;
  role_id?: string;
  company_id?: string;
  company_name?: string;
  entity_type?: 'company' | 'insurer' | 'tpa' | 'provider' | 'policy';
  entity_id?: string;
  preferred_contact_method?: string;
  is_primary?: boolean;
  primary_phone?: 'phone' | 'mobile';
  notes?: string;
  created_at: string;
}

export interface CRMDocument {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  related_type: 'company' | 'policy' | 'claim' | 'lead' | 'prospect';
  related_id: string;
  document_category: 'proposal' | 'quote' | 'contract' | 'kyc' | 'other';
  uploaded_by_id: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  status: 'active' | 'inactive';
  created_at: string;
}

export interface WorkflowTrigger {
  type: 'status_change' | 'activity_overdue' | 'new_lead' | 'inactivity';
  conditions: Record<string, any>;
}

export interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'update_field' | 'assign_user';
  params: Record<string, any>;
}

export interface LeadScore {
  id: string;
  related_id: string; // company_id
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: {
    factor: string;
    points: number;
  }[];
  last_calculated: string;
}

export interface Activity {
  id: string;
  activity_type: 'call' | 'meeting' | 'task' | 'follow_up' | 'feedback' | 'note' | 'email';
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

export interface SMEPlan {
  id: string;
  name: string;
  company: string;
  type: string;
  annualLimit: string;
  annualLimitValue: number;
  lifeInsurance: string;
  tpa: string;
  network: string;
  accommodation: string;
  inpatient: string;
  consultations: string;
  radiologyLab: string;
  medications: string;
  dental: string;
  optical: string;
  maternity: string;
  chronicPreExisting: string;
  covid19: string;
  outOfNetwork: string;
  minMembers: number;
  maxMembers: number;
  paymentTerms: string;
  basePremium?: number; 
}

export interface Endorsement {
  id: string;
  endorsement_number: string;
  policy_id: string;
  policy_number?: string;
  client_company_name?: string;
  endorsement_type: 'addition' | 'deletion' | 'correction' | 'upgrade' | 'downgrade' | 'reinstatement' | string;
  effective_date: string;
  premium_impact?: number;
  premium_adjustment?: number;
  members_added?: number;
  members_deleted?: number;
  details?: any;
  requested_by_name?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface EndorsementItem {
  id: string;
  endorsement_id: string;
  member_name: string;
  national_id?: string;
  action_type: 'add' | 'delete';
  annual_premium: number;
  calculation_method: 'daily' | 'monthly';
  prorated_factor: number;
  calculated_premium: number;
  created_at: string;
}





