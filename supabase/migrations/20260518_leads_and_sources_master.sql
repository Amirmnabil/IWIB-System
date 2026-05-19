-- Migration: Support bilingual master data for industries, lead sources, and lead scoring in Supabase
-- Drops and creates tables for master data with full bilingual categorization and lead scoring tables

-- 1. Upgrade master_industries for bilingual categorizations
DROP TABLE IF EXISTS public.master_industries CASCADE;

CREATE TABLE public.master_industries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_en text NOT NULL,
    category_ar text NOT NULL,
    subcategory_en text NOT NULL UNIQUE,
    subcategory_ar text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Create master_sources table for bilingual lead sources
CREATE TABLE IF NOT EXISTS public.master_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL UNIQUE,
    name_ar text NOT NULL UNIQUE,
    category text DEFAULT 'General',
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Create lead_scores table for CRM scoring metrics
CREATE TABLE IF NOT EXISTS public.lead_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    related_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    score numeric NOT NULL,
    grade text NOT NULL,
    factors jsonb DEFAULT '[]'::jsonb,
    last_calculated timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_lead_score_per_company UNIQUE (related_id)
);

-- Enable RLS for all tables
ALTER TABLE public.master_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

-- Standard authenticated select policies
DROP POLICY IF EXISTS "Authenticated users can select" ON public.master_industries;
CREATE POLICY "Authenticated users can select" ON public.master_industries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can select" ON public.master_sources;
CREATE POLICY "Authenticated users can select" ON public.master_sources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can select" ON public.lead_scores;
CREATE POLICY "Authenticated users can select" ON public.lead_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.lead_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.lead_scores FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete" ON public.lead_scores FOR DELETE USING (true);

-- 4. Seed bilingual industries data
INSERT INTO public.master_industries (category_en, category_ar, subcategory_en, subcategory_ar) VALUES
('Technology', 'التكنولوجيا', 'Software Development', 'تطوير البرمجيات'),
('Technology', 'التكنولوجيا', 'E-commerce', 'التجارة الإلكترونية'),
('Technology', 'التكنولوجيا', 'Telecommunications', 'الاتصالات'),
('Finance', 'المالية', 'Banking', 'الخدمات المصرفية'),
('Finance', 'المالية', 'Insurance', 'التأمين'),
('Healthcare', 'الرعاية الصحية', 'Hospitals & Clinics', 'المستشفيات والعيادات'),
('Healthcare', 'الرعاية الصحية', 'Pharmaceuticals', 'الأدوية والمستحضرات الطبية'),
('Manufacturing', 'التصنيع', 'Automotive', 'صناعة السيارات'),
('Manufacturing', 'التصنيع', 'Food & Beverage', 'الأغذية والمشروبات'),
('Services', 'الخدمات', 'Consulting', 'الخدمات الاستشارية'),
('Services', 'الخدمات', 'Education', 'التعليم'),
('Services', 'الخدمات', 'Tourism & Hospitality', 'السياحة والضيافة')
ON CONFLICT (subcategory_en) DO NOTHING;

-- 5. Seed bilingual sources data
INSERT INTO public.master_sources (name_en, name_ar, category) VALUES
('Referral', 'إحالة', 'Organic'),
('Cold Call', 'اتصال بارد', 'Outbound'),
('Website', 'الموقع الإلكتروني', 'Digital'),
('LinkedIn', 'لينكد إن', 'Social'),
('Facebook', 'فيسبوك', 'Social'),
('Partner', 'شريك', 'Partnership'),
('Trade Show', 'معرض تجاري', 'Events'),
('Other', 'أخرى', 'General')
ON CONFLICT (name_en) DO NOTHING;
