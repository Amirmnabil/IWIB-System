-- Migration: seed_lob_subtype_required_docs
-- Seeds the LOB + Subtype specific required documents lists in the reference_list table.

INSERT INTO public.reference_list (category, key, value, is_active)
VALUES
    ('required_docs', 'Medical', 'Member Census (Excel), Existing Table of Benefits, 3 Years Claims History, CR Copy, Tax Card', true),
    ('required_docs', 'Medical_SME', 'Member Census (Excel), CR Copy, Tax Card, Existing Policy (if any)', true),
    ('required_docs', 'Medical_Corporate', 'Member Census (Excel), Existing Table of Benefits, 3 Years Claims History, CR Copy, Tax Card', true),
    ('required_docs', 'Motor', 'Vehicle Census (Excel), Existing Policy Schedule, CR Copy, Tax Card', true),
    ('required_docs', 'Motor_SME', 'Vehicle Census (Excel), CR Copy, Tax Card', true),
    ('required_docs', 'Motor_Corporate', 'Vehicle Census (Excel), Existing Policy Schedule, CR Copy, Tax Card', true),
    ('required_docs', 'Life', 'Employee Census (Excel), CR Copy, Tax Card', true),
    ('required_docs', 'Life_SME', 'Employee Census (Excel), CR Copy, Tax Card', true),
    ('required_docs', 'Life_Corporate', 'Employee Census (Excel), Existing Table of Benefits, CR Copy, Tax Card', true),
    ('required_docs', 'Property', 'Asset List & Valuations, CR Copy, Tax Card', true),
    ('required_docs', 'Property_SME', 'Asset List, CR Copy, Tax Card', true),
    ('required_docs', 'Property_Corporate', 'Asset List & Valuations, Fire Safety Report, CR Copy, Tax Card', true),
    ('required_docs', 'Liability', 'CR Copy, Tax Card', true),
    ('required_docs', 'Marine', 'Cargo Valuations, CR Copy, Tax Card', true),
    ('required_docs', 'Engineering', 'Project Details, CR Copy, Tax Card', true),
    ('required_docs', 'Financial Lines', 'Financial Statements, CR Copy, Tax Card', true),
    ('required_docs', 'Cyber', 'Security Audits, CR Copy, Tax Card', true),
    ('required_docs', 'Travel', 'Traveler Details, CR Copy, Tax Card', true),
    ('required_docs', 'Personal Accident', 'Employee List, CR Copy, Tax Card', true),
    ('required_docs', 'default', 'CR Copy, Tax Card, Existing Policy (if any)', true)
ON CONFLICT (category, key) DO UPDATE 
SET value = EXCLUDED.value, is_active = EXCLUDED.is_active;
