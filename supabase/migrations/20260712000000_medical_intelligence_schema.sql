-- Phase 1.1: Database Schema for Medical Intelligence Platform

-- 1. dim_providers
CREATE TABLE IF NOT EXISTS public.dim_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(100),
    specialty VARCHAR(100),
    location VARCHAR(255),
    network_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. dim_diagnoses
CREATE TABLE IF NOT EXISTS public.dim_diagnoses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    icd_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_chronic BOOLEAN DEFAULT false,
    disease_category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. dim_members
CREATE TABLE IF NOT EXISTS public.dim_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_code VARCHAR(100) NOT NULL UNIQUE,
    member_name VARCHAR(255),
    gender VARCHAR(20),
    date_of_birth DATE,
    department VARCHAR(100),
    location VARCHAR(100),
    policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. member_risk_scores
CREATE TABLE IF NOT EXISTS public.member_risk_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dim_member_id UUID NOT NULL REFERENCES public.dim_members(id) ON DELETE CASCADE,
    risk_score NUMERIC(5, 2) NOT NULL,
    risk_category VARCHAR(50) NOT NULL, -- Low, Medium, High, Critical
    age_factor NUMERIC(5, 2) DEFAULT 0,
    chronic_factor NUMERIC(5, 2) DEFAULT 0,
    frequency_factor NUMERIC(5, 2) DEFAULT 0,
    cost_factor NUMERIC(5, 2) DEFAULT 0,
    behavior_factor NUMERIC(5, 2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. fact_claim_line_items
CREATE TABLE IF NOT EXISTS public.fact_claim_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id VARCHAR(100) NOT NULL,
    dim_member_id UUID NOT NULL REFERENCES public.dim_members(id) ON DELETE CASCADE,
    dim_provider_id UUID REFERENCES public.dim_providers(id) ON DELETE SET NULL,
    dim_diagnosis_id UUID REFERENCES public.dim_diagnoses(id) ON DELETE SET NULL,
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
    
    service_date DATE NOT NULL,
    case_type VARCHAR(100), -- Inpatient, Outpatient, etc.
    action_type VARCHAR(100), -- Claim, Drug, etc.
    procedure_code VARCHAR(50),
    drug_code VARCHAR(50),
    
    approval_amount NUMERIC(15, 2) DEFAULT 0,
    copayment NUMERIC(15, 2) DEFAULT 0,
    net_amount NUMERIC(15, 2) DEFAULT 0,
    
    episode_id VARCHAR(100),
    pre_auth_flag BOOLEAN DEFAULT false,
    is_rejected BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. fwa_alerts
CREATE TABLE IF NOT EXISTS public.fwa_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fact_claim_id UUID REFERENCES public.fact_claim_line_items(id) ON DELETE CASCADE,
    dim_member_id UUID REFERENCES public.dim_members(id) ON DELETE CASCADE,
    dim_provider_id UUID REFERENCES public.dim_providers(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(100) NOT NULL, -- Duplicate Claim, Doctor Shopping, Upcoding, etc.
    severity VARCHAR(50) NOT NULL, -- Low, Medium, High
    risk_score NUMERIC(5, 2),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Investigating, Resolved, False Positive
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create necessary indexes for performance
CREATE INDEX idx_fact_claims_member ON public.fact_claim_line_items(dim_member_id);
CREATE INDEX idx_fact_claims_provider ON public.fact_claim_line_items(dim_provider_id);
CREATE INDEX idx_fact_claims_diagnosis ON public.fact_claim_line_items(dim_diagnosis_id);
CREATE INDEX idx_fact_claims_policy ON public.fact_claim_line_items(policy_id);
CREATE INDEX idx_fact_claims_date ON public.fact_claim_line_items(service_date);
CREATE INDEX idx_fwa_alerts_status ON public.fwa_alerts(status);
CREATE INDEX idx_fwa_alerts_severity ON public.fwa_alerts(severity);
