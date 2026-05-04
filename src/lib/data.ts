import {
  Activity,
  Claim,
  Commission,
  Company,
  Contact,
  InsuranceCompany,
  Invoice,
  Lead,
  Policy,
  Prospect,
  Provider,
  Renewal,
  TPA,
  User
} from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const sampleUsers: User[] = [
  {
    id: 'user_1',
    name: 'Amir',
    email: 'amir@brokerview.com',
    role: 'Admin',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user_2',
    name: 'Abdelhamed',
    email: 'abdelhamed@brokerview.com',
    role: 'Broker',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user_3',
    name: 'Islam',
    email: 'islam@brokerview.com',
    role: 'User',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];


export const sampleInsuranceCompanies: InsuranceCompany[] = [
    { id: 'insurer_1', companyName: 'EL-Misria Takaful', companyCode: 'EMT', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_2', companyName: 'Mohandes', companyCode: 'MOH', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_3', companyName: 'Misr Insurance', companyCode: 'MI', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_4', companyName: 'Wethaq', companyCode: 'WET', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_5', companyName: 'Royal', companyCode: 'ROY', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_6', companyName: 'Delta Insurance', companyCode: 'DEL', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_7', companyName: 'Labano-suisse', companyCode: 'LBS', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_8', companyName: 'Gig', companyCode: 'GIG', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_9', companyName: 'Arope', companyCode: 'ARO', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_10', companyName: 'Allianz', companyCode: 'ALZ', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_11', companyName: 'Orient takaful', companyCode: 'ORT', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_12', companyName: 'Bupa', companyCode: 'BUP', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_13', companyName: 'Chubb', companyCode: 'CHU', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_14', companyName: 'Sarwa Insurance', companyCode: 'SAR', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_15', companyName: 'Metlife', companyCode: 'MET', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_16', companyName: 'Axa', companyCode: 'AXA', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_17', companyName: 'Watania', companyCode: 'WAT', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_18', companyName: 'Salama', companyCode: 'SAL', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_19', companyName: 'Mada', companyCode: 'MAD', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_20', companyName: 'Sarwa General', companyCode: 'SGN', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_21', companyName: 'Kaf Life', companyCode: 'KFL', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_22', companyName: 'Misr Insurance Takful', companyCode: 'MIT', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_23', companyName: 'Wafa Life', companyCode: 'WFL', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_24', companyName: 'Suez Canal Insurance', companyCode: 'SCI', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_25', companyName: 'GIG Takaful', companyCode: 'GIGT', companyType: 'Takaful', status: 'Active' },
    { id: 'insurer_26', companyName: 'Iskan Insurance', companyCode: 'ISK', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_27', companyName: 'Misr Ins Life', companyCode: 'MIL', companyType: 'Investment', status: 'Active' },
    { id: 'insurer_28', companyName: 'Mohandes Life', companyCode: 'MOHL', companyType: 'Investment', status: 'Active' },
];


export const sampleTPAs: TPA[] = [
  { id: 'tpa_1', name: 'AlAhly', code: 'AHL', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_2', name: 'Almashreq', code: 'AMQ', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_3', name: 'EgyCare', code: 'EGY', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_4', name: 'Future', code: 'FUT', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_5', name: 'GlobeMed', code: 'GLB', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_6', name: 'Inaya', code: 'INY', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_7', name: 'LimitLess', code: 'LMT', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_8', name: 'Mashreq', code: 'MSQ', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_9', name: 'MedMisr', code: 'MDM', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_10', name: 'MedNet', code: 'MDN', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_11', name: 'Medright', code: 'MDR', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_12', name: 'MedSure', code: 'MDS', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_13', name: 'Misr Healthcare', code: 'MHC', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_14', name: 'NextCare', code: 'NXT', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_15', name: 'SehaOne', code: 'SEO', status: 'active', created_at: new Date().toISOString() },
  { id: 'tpa_16', name: 'Smart', code: 'SMR', status: 'active', created_at: new Date().toISOString() },
];

export const sampleCompanies: Company[] = [
  {
    id: 'comp_1',
    code: 'TC-001',
    name: 'TechCorp Solutions',
    name_ar: 'تيك كورب للحلول',
    status: 'client',
    industry: 'Technology',
    size_range: '201-500',
    hr_name: 'Alice Johnson',
    hr_email: 'alice@techcorp.com',
    priority: 'high',
    created_at: new Date('2022-01-15').toISOString(),
  },
  {
    id: 'comp_2',
    code: 'GMF-002',
    name: 'Global Manufacturing Inc',
    name_ar: 'العالمية للتصنيع',
    status: 'client',
    industry: 'Manufacturing',
    size_range: '1000+',
    hr_name: 'Bob Williams',
    hr_email: 'bob@globalmfg.com',
    priority: 'medium',
    created_at: new Date('2021-11-20').toISOString(),
  },
  {
    id: 'comp_3',
    code: 'HFH-003',
    name: 'HealthFirst Hospital Group',
    name_ar: 'مجموعة مستشفيات هيلث فيرست',
    status: 'client',
    industry: 'Healthcare',
    size_range: '501-1000',
    hr_name: 'Carol Davis',
    hr_email: 'carol@healthfirst.com',
    priority: 'high',
    created_at: new Date('2023-03-10').toISOString(),
  },
];

export const samplePolicies: Policy[] = [
  {
    id: 'pol_1',
    policy_number: 'TC-MED-2023',
    client_company_id: 'comp_1',
    client_company_name: 'TechCorp Solutions',
    insurer_id: 'insurer_1',
    insurer_name: 'MetLife Insurance',
    tpa_id: 'tpa_1',
    tpa_name: 'NextCare TPA',
    policy_type: 'medical',
    start_date: new Date('2023-02-01').toISOString(),
    end_date: new Date('2024-01-31').toISOString(),
    premium_total: 120000,
    member_count: 250,
    policy_status: 'active',
    created_at: new Date('2023-01-20').toISOString(),
  },
  {
    id: 'pol_2',
    policy_number: 'GM-LIFE-2022',
    client_company_id: 'comp_2',
    client_company_name: 'Global Manufacturing Inc',
    insurer_id: 'insurer_3',
    insurer_name: 'Allianz Global',
    policy_type: 'life',
    start_date: new Date('2022-12-01').toISOString(),
    end_date: new Date('2023-11-30').toISOString(),
    premium_total: 80000,
    member_count: 1200,
    policy_status: 'active',
    created_at: new Date('2022-11-15').toISOString(),
  },
];

export const sampleClaims: Claim[] = [
  {
    id: 'claim_1',
    claim_number: 'CLM-001',
    policy_id: 'pol_1',
    policy_number: 'TC-MED-2023',
    member_id: 'mem_1',
    member_name: 'John Employee',
    company_id: 'comp_1',
    company_name: 'TechCorp Solutions',
    tpa_name: 'NextCare TPA',
    insurer_name: 'MetLife Insurance',
    claim_type: 'medical',
    submission_date: new Date('2023-06-10').toISOString(),
    incident_date: new Date('2023-06-08').toISOString(),
    claim_amount: 1200,
    approved_amount: 1100,
    paid_amount: 1100,
    status: 'paid',
    created_at: new Date('2023-06-10').toISOString(),
  },
];

export const sampleLeads: Lead[] = [
  {
    id: 'lead_1',
    company_name: 'Innovate BioTech',
    status: 'new',
    priority: 'high',
    lead_source: 'Referral',
    estimated_premium: 50000,
    next_follow_up: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_user_name: 'John Smith',
    created_at: new Date().toISOString(),
  },
];

export const sampleProspects: Prospect[] = [
  {
    id: 'prospect_1',
    company_id: 'comp_4',
    company_name: 'Retail Dynamics',
    pipeline_stage: 'proposal',
    probability: 75,
    estimated_value: 200000,
    expected_close_date: new Date('2023-12-15').toISOString(),
    assigned_user_name: 'John Smith',
    requested_products: ['Medical', 'Life'],
    created_at: new Date('2023-08-01').toISOString(),
  },
];

export const sampleCommissions: Commission[] = [
  {
    id: 'comm_1',
    policy_id: 'pol_1',
    policy_number: 'TC-MED-2023',
    client_company_name: 'TechCorp Solutions',
    insurer_name: 'MetLife Insurance',
    commission_rate: 0.1,
    premium_amount: 120000,
    expected_commission: 12000,
    accrued_commission: 12000,
    paid_commission: 10000,
    commission_status: 'paid',
    period_start: new Date('2023-02-01').toISOString(),
    period_end: new Date('2024-01-31').toISOString(),
    created_at: new Date().toISOString(),
  },
];

export const sampleInvoices: Invoice[] = [
  {
    id: 'inv_1',
    invoice_number: 'INV-001',
    client_company_id: 'comp_1',
    client_company_name: 'TechCorp Solutions',
    policy_id: 'pol_1',
    invoice_type: 'premium',
    issue_date: new Date('2023-02-01').toISOString(),
    due_date: new Date('2023-03-01').toISOString(),
    amount_due: 120000,
    amount_paid: 120000,
    balance: 0,
    status: 'paid',
    created_at: new Date().toISOString(),
  },
];

export const sampleRenewals: Renewal[] = [
  {
    id: 'ren_1',
    policy_id: 'pol_2',
    policy_number: 'GM-LIFE-2022',
    client_company_name: 'Global Manufacturing Inc',
    renewal_term_start: new Date('2023-12-01').toISOString(),
    renewal_term_end: new Date('2024-11-30').toISOString(),
    current_premium: 80000,
    proposed_premium: 85000,
    renewal_status: 'preparing_proposal',
    days_until_expiry: 90,
    created_at: new Date().toISOString(),
  },
];

export const sampleProviders: Provider[] = [
  {
    id: 'prov_1',
    name: 'City Central Hospital',
    type: 'hospital',
    city: 'Metropolis',
    country: 'USA',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

export const sampleActivities: Activity[] = [
  {
    id: 'act_1',
    activity_type: 'call',
    subject: 'Follow up with Retail Dynamics',
    status: 'pending',
    priority: 'high',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    related_type: 'prospect',
    related_name: 'Retail Dynamics',
    assigned_to_name: 'John Smith',
    created_at: new Date().toISOString(),
  },
];

export const sampleContacts: Contact[] = [
    {
        id: 'contact_1',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@techcorp.com',
        phone: '123-456-7890',
        job_title: 'HR Manager',
        company_id: 'comp_1',
        company_name: 'TechCorp Solutions',
        is_primary: true,
        created_at: new Date('2022-01-15').toISOString(),
    },
];
