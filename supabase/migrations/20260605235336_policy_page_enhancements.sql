-- Add fields to policies table
ALTER TABLE policies ADD COLUMN IF NOT EXISTS insurer_policy_number TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_value NUMERIC;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS rate NUMERIC;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS tax_amount NUMERIC;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS tax_type TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS tpa_fee NUMERIC;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS tpa_fee_type TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS medical_brackets JSONB;

-- Modify policy_members table
ALTER TABLE policy_members ADD COLUMN IF NOT EXISTS member_id_insurance TEXT;
ALTER TABLE policy_members RENAME COLUMN member_code TO member_id_tpa;
ALTER TABLE policy_members DROP COLUMN IF EXISTS premium;
ALTER TABLE policy_members DROP COLUMN IF EXISTS status;

-- Modify commission_agreements table
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id) ON DELETE CASCADE;
