-- Migration: seed_required_documents
-- Seeds the initial required documents list per Line of Business (LOB) in reference_list table.

INSERT INTO public.reference_list (category, key, value, is_active)
VALUES
    ('required_docs', 'Medical', 'Member Census (Excel), Existing Table of Benefits, 3 Years Claims History, CR Copy, Tax Card', true),
    ('required_docs', 'Motor', 'Vehicle Census (Excel), Existing Policy Schedule, CR Copy, Tax Card', true),
    ('required_docs', 'Life', 'Employee Census (Excel), CR Copy, Tax Card', true),
    ('required_docs', 'Property', 'Asset List & Valuations, CR Copy, Tax Card', true),
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
