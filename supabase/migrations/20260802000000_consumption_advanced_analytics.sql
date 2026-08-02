-- Phase 1, 2, 3: Consumption Advanced Analysis Schema

-- 1. policy_values table (for premium & policy financial targets)
CREATE TABLE IF NOT EXISTS public.policy_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) NOT NULL UNIQUE,
    plan_category VARCHAR(50) DEFAULT 'Standard',
    annual_premium NUMERIC(15, 2) DEFAULT 0,
    premium_pmpy NUMERIC(15, 2) DEFAULT 0,
    annual_limit NUMERIC(15, 2) DEFAULT 100000,
    target_loss_ratio NUMERIC(5, 2) DEFAULT 75.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. icd_chapter_categories table (admin editable ICD-10 chapters)
CREATE TABLE IF NOT EXISTS public.icd_chapter_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prefix_code VARCHAR(10) NOT NULL UNIQUE,
    chapter_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed default ICD-10 Chapter mappings
INSERT INTO public.icd_chapter_categories (prefix_code, chapter_name, description) VALUES
('A', 'Infectious & Parasitic Diseases', 'Certain infectious and parasitic diseases (A00-B99)'),
('B', 'Infectious & Parasitic Diseases', 'Certain infectious and parasitic diseases (A00-B99)'),
('C', 'Neoplasms & Oncology', 'Neoplasms and tumors (C00-D48)'),
('D', 'Neoplasms & Blood Disorders', 'Blood-forming organs and immune mechanisms'),
('E', 'Endocrine, Nutritional & Metabolic', 'Diabetes, thyroid, and metabolic disorders (E00-E90)'),
('F', 'Mental & Behavioral Disorders', 'Mental and behavioral disorders (F00-F99)'),
('G', 'Nervous System', 'Diseases of the nervous system (G00-G99)'),
('H', 'Eye, Ear & Mastoid', 'Diseases of eye, adnexa, ear and mastoid process (H00-H95)'),
('I', 'Circulatory System & Heart', 'Cardiovascular and circulatory diseases (I00-I99)'),
('J', 'Respiratory System', 'Asthma, bronchitis, respiratory infections (J00-J99)'),
('K', 'Digestive System', 'Gastrointestinal, liver and stomach disorders (K00-K95)'),
('L', 'Skin & Subcutaneous Tissue', 'Dermatological conditions (L00-L99)'),
('M', 'Musculoskeletal & Connective Tissue', 'Arthritis, joint pain, spine disorders (M00-M99)'),
('N', 'Genitourinary System', 'Kidney, urinary tract and reproductive organs (N00-N99)'),
('O', 'Pregnancy & Maternity', 'Pregnancy, childbirth and the puerperium (O00-O99)'),
('P', 'Perinatal Conditions', 'Certain conditions originating in the perinatal period'),
('Q', 'Congenital Malformations', 'Congenital malformations and chromosomal abnormalities'),
('R', 'Symptoms & Abnormal Findings', 'Symptoms, signs and abnormal clinical findings (R00-R99)'),
('S', 'Injuries & Trauma', 'Injuries, poisoning and external causes (S00-T98)'),
('T', 'Injuries & External Causes', 'Injuries, poisoning and external causes (S00-T98)'),
('Z', 'Health Status & Contact Factors', 'Factors influencing health status and contact with health services (Z00-Z99)')
ON CONFLICT (prefix_code) DO UPDATE SET chapter_name = EXCLUDED.chapter_name;

-- Indexes for fast analytics query execution
CREATE INDEX IF NOT EXISTS idx_policy_values_policy_id ON public.policy_values(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_values_policy_number ON public.policy_values(policy_number);
