-- 1. Add missing translation columns to master_industries
ALTER TABLE public.master_industries
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS name_ar text,
ADD COLUMN IF NOT EXISTS subcategory_en text,
ADD COLUMN IF NOT EXISTS subcategory_ar text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS category_en text,
ADD COLUMN IF NOT EXISTS category_ar text,
ADD COLUMN IF NOT EXISTS code text;

-- 2. Insert the industries mapping subcategory_en to name to satisfy the UNIQUE NOT NULL constraint
INSERT INTO public.master_industries (name, name_en, name_ar, category_en, category_ar, subcategory_en, subcategory_ar)
VALUES 
-- Manufacturing & Industrial
('Automotive Manufacturing', 'Automotive Manufacturing', 'تصنيع السيارات', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Automotive Manufacturing', 'تصنيع السيارات'),
('Electronics Manufacturing', 'Electronics Manufacturing', 'تصنيع الإلكترونيات', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Electronics Manufacturing', 'تصنيع الإلكترونيات'),
('Textile & Apparel', 'Textile & Apparel', 'المنسوجات والملابس', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Textile & Apparel', 'المنسوجات والملابس'),
('Food & Beverage Manufacturing', 'Food & Beverage Manufacturing', 'تصنيع الأغذية والمشروبات', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Food & Beverage Manufacturing', 'تصنيع الأغذية والمشروبات'),
('Chemical Manufacturing', 'Chemical Manufacturing', 'الصناعات الكيماوية', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Chemical Manufacturing', 'الصناعات الكيماوية'),
('Pharmaceutical Manufacturing', 'Pharmaceutical Manufacturing', 'الصناعات الدوائية', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Pharmaceutical Manufacturing', 'الصناعات الدوائية'),
('Plastic & Rubber', 'Plastic & Rubber', 'البلاستيك والمطاط', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Plastic & Rubber', 'البلاستيك والمطاط'),
('Metal & Steel', 'Metal & Steel', 'الحديد والصلب', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Metal & Steel', 'الحديد والصلب'),
('Paper & Packaging', 'Paper & Packaging', 'الورق والتغليف', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Paper & Packaging', 'الورق والتغليف'),
('Furniture Manufacturing', 'Furniture Manufacturing', 'صناعة الأثاث', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Furniture Manufacturing', 'صناعة الأثاث'),
('Machinery & Equipment', 'Machinery & Equipment', 'المعدات والآلات', 'Manufacturing & Industrial', 'التصنيع والصناعة', 'Machinery & Equipment', 'المعدات والآلات'),

-- Construction & Real Estate
('Construction', 'Construction', 'المقاولات', 'Construction & Real Estate', 'التشييد والعقارات', 'Construction', 'المقاولات'),
('Real Estate Development', 'Real Estate Development', 'التطوير العقاري', 'Construction & Real Estate', 'التشييد والعقارات', 'Real Estate Development', 'التطوير العقاري'),
('Property Management', 'Property Management', 'إدارة العقارات', 'Construction & Real Estate', 'التشييد والعقارات', 'Property Management', 'إدارة العقارات'),
('Architecture & Design', 'Architecture & Design', 'الهندسة المعمارية والتصميم', 'Construction & Real Estate', 'التشييد والعقارات', 'Architecture & Design', 'الهندسة المعمارية والتصميم'),
('Civil Engineering', 'Civil Engineering', 'الهندسة المدنية', 'Construction & Real Estate', 'التشييد والعقارات', 'Civil Engineering', 'الهندسة المدنية'),
('Infrastructure Projects', 'Infrastructure Projects', 'مشاريع البنية التحتية', 'Construction & Real Estate', 'التشييد والعقارات', 'Infrastructure Projects', 'مشاريع البنية التحتية'),

-- Financial Services & Insurance
('Banking', 'Banking', 'البنوك', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'Banking', 'البنوك'),
('Insurance', 'Insurance', 'التأمين', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'Insurance', 'التأمين'),
('Investment Management', 'Investment Management', 'إدارة الاستثمارات', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'Investment Management', 'إدارة الاستثمارات'),
('FinTech', 'FinTech', 'التكنولوجيا المالية', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'FinTech', 'التكنولوجيا المالية'),
('Leasing & Microfinance', 'Leasing & Microfinance', 'التأجير التمويلي والتمويل متناهي الصغر', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'Leasing & Microfinance', 'التأجير التمويلي والتمويل متناهي الصغر'),
('Brokerage', 'Brokerage', 'الوساطة المالية', 'Financial Services & Insurance', 'الخدمات المالية والتأمين', 'Brokerage', 'الوساطة المالية'),

-- Healthcare
('Hospitals', 'Hospitals', 'المستشفيات', 'Healthcare', 'الرعاية الصحية', 'Hospitals', 'المستشفيات'),
('Clinics', 'Clinics', 'العيادات', 'Healthcare', 'الرعاية الصحية', 'Clinics', 'العيادات'),
('Pharmacies', 'Pharmacies', 'الصيدليات', 'Healthcare', 'الرعاية الصحية', 'Pharmacies', 'الصيدليات'),
('Laboratories', 'Laboratories', 'المعامل', 'Healthcare', 'الرعاية الصحية', 'Laboratories', 'المعامل'),
('Medical Providers', 'Medical Providers', 'مقدمي الخدمات الطبية', 'Healthcare', 'الرعاية الصحية', 'Medical Providers', 'مقدمي الخدمات الطبية'),
('Medical Supplies', 'Medical Supplies', 'المستلزمات الطبية', 'Healthcare', 'الرعاية الصحية', 'Medical Supplies', 'المستلزمات الطبية'),

-- Retail & E-commerce
('Retail', 'Retail', 'تجارة التجزئة', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'Retail', 'تجارة التجزئة'),
('Supermarkets', 'Supermarkets', 'السوبر ماركت', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'Supermarkets', 'السوبر ماركت'),
('Fashion Retail', 'Fashion Retail', 'تجارة الملابس', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'Fashion Retail', 'تجارة الملابس'),
('Electronics Retail', 'Electronics Retail', 'تجارة الإلكترونيات', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'Electronics Retail', 'تجارة الإلكترونيات'),
('E-commerce', 'E-commerce', 'التجارة الإلكترونية', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'E-commerce', 'التجارة الإلكترونية'),
('Wholesale', 'Wholesale', 'تجارة الجملة', 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 'Wholesale', 'تجارة الجملة'),

-- Food & Beverage
('Restaurants', 'Restaurants', 'المطاعم', 'Food & Beverage', 'الأغذية والمشروبات', 'Restaurants', 'المطاعم'),
('Cafés', 'Cafés', 'الكافيهات', 'Food & Beverage', 'الأغذية والمشروبات', 'Cafés', 'الكافيهات'),
('Catering', 'Catering', 'خدمات التموين', 'Food & Beverage', 'الأغذية والمشروبات', 'Catering', 'خدمات التموين'),
('Food Production', 'Food Production', 'إنتاج الأغذية', 'Food & Beverage', 'الأغذية والمشروبات', 'Food Production', 'إنتاج الأغذية'),
('Beverage Companies', 'Beverage Companies', 'شركات المشروبات', 'Food & Beverage', 'الأغذية والمشروبات', 'Beverage Companies', 'شركات المشروبات'),
('Food Delivery', 'Food Delivery', 'توصيل الطعام', 'Food & Beverage', 'الأغذية والمشروبات', 'Food Delivery', 'توصيل الطعام'),

-- Logistics & Transportation
('Logistics', 'Logistics', 'الخدمات اللوجستية', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Logistics', 'الخدمات اللوجستية'),
('Warehousing', 'Warehousing', 'التخزين', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Warehousing', 'التخزين'),
('Freight', 'Freight', 'الشحن', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Freight', 'الشحن'),
('Delivery', 'Delivery', 'التوصيل', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Delivery', 'التوصيل'),
('Aviation', 'Aviation', 'الطيران', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Aviation', 'الطيران'),
('Maritime', 'Maritime', 'النقل البحري', 'Logistics & Transportation', 'النقل والخدمات اللوجستية', 'Maritime', 'النقل البحري'),

-- Hospitality & Tourism
('Hotels', 'Hotels', 'الفنادق', 'Hospitality & Tourism', 'السياحة والضيافة', 'Hotels', 'الفنادق'),
('Resorts', 'Resorts', 'المنتجعات', 'Hospitality & Tourism', 'السياحة والضيافة', 'Resorts', 'المنتجعات'),
('Travel Agencies', 'Travel Agencies', 'شركات السياحة', 'Hospitality & Tourism', 'السياحة والضيافة', 'Travel Agencies', 'شركات السياحة'),
('Event Management', 'Event Management', 'تنظيم الفعاليات', 'Hospitality & Tourism', 'السياحة والضيافة', 'Event Management', 'تنظيم الفعاليات'),
('Entertainment', 'Entertainment', 'الترفيه', 'Hospitality & Tourism', 'السياحة والضيافة', 'Entertainment', 'الترفيه'),

-- Technology & IT
('Software Development', 'Software Development', 'تطوير البرمجيات', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'Software Development', 'تطوير البرمجيات'),
('IT Services', 'IT Services', 'خدمات تكنولوجيا المعلومات', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'IT Services', 'خدمات تكنولوجيا المعلومات'),
('Cybersecurity', 'Cybersecurity', 'الأمن السيبراني', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'Cybersecurity', 'الأمن السيبراني'),
('Cloud Computing', 'Cloud Computing', 'الحوسبة السحابية', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'Cloud Computing', 'الحوسبة السحابية'),
('AI', 'AI', 'الذكاء الاصطناعي', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'AI', 'الذكاء الاصطناعي'),
('Telecommunications', 'Telecommunications', 'الاتصالات', 'Technology & IT', 'التكنولوجيا وتقنية المعلومات', 'Telecommunications', 'الاتصالات'),

-- Marketing & Media
('Advertising', 'Advertising', 'الإعلانات', 'Marketing & Media', 'التسويق والإعلام', 'Advertising', 'الإعلانات'),
('Digital Marketing', 'Digital Marketing', 'التسويق الرقمي', 'Marketing & Media', 'التسويق والإعلام', 'Digital Marketing', 'التسويق الرقمي'),
('Media Production', 'Media Production', 'الإنتاج الإعلامي', 'Marketing & Media', 'التسويق والإعلام', 'Media Production', 'الإنتاج الإعلامي'),
('Public Relations', 'Public Relations', 'العلاقات العامة', 'Marketing & Media', 'التسويق والإعلام', 'Public Relations', 'العلاقات العامة'),
('Publishing', 'Publishing', 'النشر', 'Marketing & Media', 'التسويق والإعلام', 'Publishing', 'النشر'),

-- Education
('Schools', 'Schools', 'المدارس', 'Education', 'التعليم والتدريب', 'Schools', 'المدارس'),
('Universities', 'Universities', 'الجامعات', 'Education', 'التعليم والتدريب', 'Universities', 'الجامعات'),
('Training Centers', 'Training Centers', 'مراكز التدريب', 'Education', 'التعليم والتدريب', 'Training Centers', 'مراكز التدريب'),
('E-learning', 'E-learning', 'التعليم الإلكتروني', 'Education', 'التعليم والتدريب', 'E-learning', 'التعليم الإلكتروني'),

-- Energy & Utilities
('Oil & Gas', 'Oil & Gas', 'النفط والغاز', 'Energy & Utilities', 'الطاقة والمرافق', 'Oil & Gas', 'النفط والغاز'),
('Renewable Energy', 'Renewable Energy', 'الطاقة المتجددة', 'Energy & Utilities', 'الطاقة والمرافق', 'Renewable Energy', 'الطاقة المتجددة'),
('Electricity', 'Electricity', 'الكهرباء', 'Energy & Utilities', 'الطاقة والمرافق', 'Electricity', 'الكهرباء'),
('Water Utilities', 'Water Utilities', 'المياه', 'Energy & Utilities', 'الطاقة والمرافق', 'Water Utilities', 'المياه'),

-- Government & NGOs
('Government', 'Government', 'الجهات الحكومية', 'Government & NGOs', 'الحكومة والمنظمات', 'Government', 'الجهات الحكومية'),
('NGOs', 'NGOs', 'المنظمات غير الحكومية', 'Government & NGOs', 'الحكومة والمنظمات', 'NGOs', 'المنظمات غير الحكومية'),
('Non-Profit', 'Non-Profit', 'المؤسسات غير الربحية', 'Government & NGOs', 'الحكومة والمنظمات', 'Non-Profit', 'المؤسسات غير الربحية'),
('International Organizations', 'International Organizations', 'المنظمات الدولية', 'Government & NGOs', 'الحكومة والمنظمات', 'International Organizations', 'المنظمات الدولية'),

-- Professional Services
('Legal', 'Legal', 'الخدمات القانونية', 'Professional Services', 'الخدمات المهنية', 'Legal', 'الخدمات القانونية'),
('Accounting', 'Accounting', 'المحاسبة', 'Professional Services', 'الخدمات المهنية', 'Accounting', 'المحاسبة'),
('Consulting', 'Consulting', 'الاستشارات', 'Professional Services', 'الخدمات المهنية', 'Consulting', 'الاستشارات'),
('HR Services', 'HR Services', 'خدمات الموارد البشرية', 'Professional Services', 'الخدمات المهنية', 'HR Services', 'خدمات الموارد البشرية'),

-- Agriculture
('Agriculture', 'Agriculture', 'الزراعة', 'Agriculture', 'الزراعة', 'Agriculture', 'الزراعة'),
('Livestock', 'Livestock', 'الثروة الحيوانية', 'Agriculture', 'الزراعة', 'Livestock', 'الثروة الحيوانية'),
('Fisheries', 'Fisheries', 'الثروة السمكية', 'Agriculture', 'الزراعة', 'Fisheries', 'الثروة السمكية'),
('Agribusiness', 'Agribusiness', 'الأعمال الزراعية', 'Agriculture', 'الزراعة', 'Agribusiness', 'الأعمال الزراعية'),

-- Mining
('Mining', 'Mining', 'التعدين', 'Mining', 'التعدين', 'Mining', 'التعدين'),
('Quarrying', 'Quarrying', 'المحاجر', 'Mining', 'التعدين', 'Quarrying', 'المحاجر'),
('Natural Resources', 'Natural Resources', 'الموارد الطبيعية', 'Mining', 'التعدين', 'Natural Resources', 'الموارد الطبيعية'),

-- Sports & Fitness
('Gyms', 'Gyms', 'الجيم', 'Sports & Fitness', 'الرياضة واللياقة', 'Gyms', 'الجيم'),
('Sports Clubs', 'Sports Clubs', 'الأندية الرياضية', 'Sports & Fitness', 'الرياضة واللياقة', 'Sports Clubs', 'الأندية الرياضية'),
('Wellness', 'Wellness', 'العافية', 'Sports & Fitness', 'الرياضة واللياقة', 'Wellness', 'العافية'),

-- Personal Services
('Beauty', 'Beauty', 'التجميل', 'Personal Services', 'الخدمات الشخصية', 'Beauty', 'التجميل'),
('Cleaning', 'Cleaning', 'التنظيف', 'Personal Services', 'الخدمات الشخصية', 'Cleaning', 'التنظيف'),
('Laundry', 'Laundry', 'المغاسل', 'Personal Services', 'الخدمات الشخصية', 'Laundry', 'المغاسل'),
('Maintenance', 'Maintenance', 'الصيانة', 'Personal Services', 'الخدمات الشخصية', 'Maintenance', 'الصيانة'),

-- Other
('Holding Companies', 'Holding Companies', 'الشركات القابضة', 'Other', 'أخرى', 'Holding Companies', 'الشركات القابضة'),
('Startups', 'Startups', 'الشركات الناشئة', 'Other', 'أخرى', 'Startups', 'الشركات الناشئة'),
('Conglomerates', 'Conglomerates', 'التكتلات', 'Other', 'أخرى', 'Conglomerates', 'التكتلات'),
('Other Industries', 'Other', 'أخرى', 'Other', 'أخرى', 'Other', 'أخرى')
ON CONFLICT (name) DO UPDATE 
SET 
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  category_en = EXCLUDED.category_en,
  category_ar = EXCLUDED.category_ar,
  subcategory_en = EXCLUDED.subcategory_en,
  subcategory_ar = EXCLUDED.subcategory_ar;
