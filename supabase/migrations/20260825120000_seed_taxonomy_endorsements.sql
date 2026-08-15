-- Ensure name_ar and code columns exist
ALTER TABLE public.endorsement_types ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.endorsement_types ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- Clean up any un-coded types to avoid duplicates in the system dropdowns
DELETE FROM public.endorsement_types WHERE code IS NULL;

-- Insert/Upsert the complete bilingual taxonomy of endorsement types
INSERT INTO public.endorsement_types (code, name, name_ar, line_of_business, category, is_financial) VALUES
-- I. Corporate - Group Medical
('G-MED-ADD', 'Addition Endorsement (new member/s)', 'ملحق إضافة عضو/أعضاء جدد', 'Medical', 'Corporate', true),
('G-MED-DEL', 'Deletion Endorsement (member/s termination)', 'ملحق حذف عضو/أعضاء (إنهاء التغطية)', 'Medical', 'Corporate', true),
('G-MED-UPG', 'Plan Upgrade Endorsement', 'ملحق ترقية الخطة التأمينية', 'Medical', 'Corporate', true),
('G-MED-DWN', 'Plan Downgrade Endorsement', 'ملحق تخفيض الخطة التأمينية', 'Medical', 'Corporate', true),
('G-MED-HTU', 'Headcount True-up Endorsement', 'ملحق تسوية العدد الفعلي للمؤمن عليهم', 'Medical', 'Corporate', true),
('G-MED-BREC', 'Bordereau Reconciliation Endorsement', 'ملحق تسوية ومطابقة كشف المؤمن عليهم (Bordereau)', 'Medical', 'Corporate', true),
('G-MED-BLA', 'Benefit Limit Amendment', 'ملحق تعديل حدود المنافع', 'Medical', 'Corporate', true),
('G-MED-SIA', 'Sum Insured Amendment', 'ملحق تعديل مبلغ التأمين', 'Medical', 'Corporate', true),
('G-MED-TNA', 'TPA Network Tier Amendment', 'ملحق تعديل مستوى شبكة مقدمي الخدمة لدى TPA', 'Medical', 'Corporate', true),
('G-MED-DC', 'Data Correction Endorsement', 'ملحق تصحيح البيانات', 'Medical', 'Corporate', true),
('G-MED-REN', 'Renewal Endorsement', 'ملحق تجديد', 'Medical', 'Corporate', true),
('G-MED-TERM', 'Termination Endorsement', 'ملحق إنهاء التغطية/الوثيقة', 'Medical', 'Corporate', true),
('G-MED-REIN', 'Reinstatement Endorsement', 'ملحق إعادة التغطية/التفعيل', 'Medical', 'Corporate', true),

-- I. Corporate - Group Life & GPA
('G-LIFE-ADD', 'Addition of Insured Lives', 'إضافة أفراد مؤمن عليهم', 'Life', 'Corporate', true),
('G-LIFE-DEL', 'Deletion of Insured Lives', 'حذف أفراد مؤمن عليهم', 'Life', 'Corporate', true),
('G-LIFE-SAA', 'Sum Assured Amendment', 'تعديل مبلغ التأمين', 'Life', 'Corporate', true),
('G-LIFE-BC', 'Beneficiary Change', 'تغيير المستفيد', 'Life', 'Corporate', false),
('G-LIFE-AR', 'Age Reclassification', 'إعادة تصنيف العمر', 'Life', 'Corporate', true),
('G-LIFE-OR', 'Occupation Reclassification', 'إعادة تصنيف المهنة', 'Life', 'Corporate', true),
('G-LIFE-EXT', 'Extension of Cover', 'تمديد التغطية', 'Life', 'Corporate', true),
('G-LIFE-REN', 'Renewal Endorsement', 'ملحق تجديد', 'Life', 'Corporate', true),
('G-LIFE-CANC', 'Cancellation Endorsement', 'ملحق إلغاء', 'Life', 'Corporate', true),

-- I. Corporate - Property / Fire & Perils
('PROP-SII', 'Sum Insured Increase', 'زيادة مبلغ التأمين', 'Property', 'Corporate', true),
('PROP-SID', 'Sum Insured Decrease', 'تخفيض مبلغ التأمين', 'Property', 'Corporate', true),
('PROP-LOC-ADD', 'Location Addition', 'إضافة موقع', 'Property', 'Corporate', true),
('PROP-LOC-DEL', 'Location Deletion', 'حذف موقع', 'Property', 'Corporate', true),
('PROP-SVA', 'Stock Value Adjustment', 'تعديل قيمة المخزون', 'Property', 'Corporate', true),
('PROP-PEXT', 'Peril Extension', 'إضافة/توسيع الأخطار المؤمن عليها', 'Property', 'Corporate', true),
('PROP-FLLA', 'First Loss Limit Amendment', 'تعديل حد الخسارة الأولى', 'Property', 'Corporate', true),
('PROP-CIA', 'Co-insurance Amendment', 'تعديل نسبة التأمين المشترك', 'Property', 'Corporate', true),
('PROP-REN', 'Renewal Endorsement', 'ملحق تجديد', 'Property', 'Corporate', true),
('PROP-CANC', 'Cancellation Endorsement', 'ملحق إلغاء', 'Property', 'Corporate', true),

-- I. Corporate - Motor (Fleet)
('FLEET-VEH-ADD', 'Vehicle Addition', 'إضافة مركبة', 'Motor', 'Corporate', true),
('FLEET-VEH-DEL', 'Vehicle Deletion', 'حذف مركبة', 'Motor', 'Corporate', true),
('FLEET-VEH-REP', 'Vehicle Replacement', 'استبدال مركبة', 'Motor', 'Corporate', true),
('FLEET-SIA', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Motor', 'Corporate', true),
('FLEET-NDA', 'Named Driver Addition', 'إضافة سائق مسمى', 'Motor', 'Corporate', true),
('FLEET-NDD', 'Named Driver Deletion', 'حذف سائق مسمى', 'Motor', 'Corporate', true),
('FLEET-NCD', 'NCD Adjustment', 'تعديل خصم عدم المطالبات (NCD)', 'Motor', 'Corporate', true),
('FLEET-TEXT', 'Territorial Extension', 'تمديد النطاق الجغرافي للتغطية', 'Motor', 'Corporate', true),
('FLEET-REN', 'Renewal Endorsement', 'ملحق تجديد', 'Motor', 'Corporate', true),
('FLEET-CANC', 'Cancellation Endorsement', 'ملحق إلغاء', 'Motor', 'Corporate', true),

-- I. Corporate - Liability
('LIAB-LIA', 'Limit of Indemnity Amendment', 'تعديل حد التعويض', 'Liability', 'Corporate', true),
('LIAB-AIE', 'Additional Insured Endorsement', 'إضافة مؤمن له إضافي', 'Liability', 'Corporate', true),
('LIAB-RDA', 'Retroactive Date Amendment (claims-made, PI)', 'تعديل التاريخ بأثر رجعي (وثائق Claims-Made وPI)', 'Liability', 'Corporate', true),
('LIAB-TEXT', 'Territory Extension', 'تمديد النطاق الجغرافي', 'Liability', 'Corporate', true),
('LIAB-DA', 'Deductible Amendment', 'تعديل مبلغ/نسبة التحمل', 'Liability', 'Corporate', true),
('LIAB-REN', 'Renewal Endorsement', 'ملحق تجديد', 'Liability', 'Corporate', true),
('LIAB-CANC', 'Cancellation Endorsement', 'ملحق إلغاء', 'Liability', 'Corporate', true),

-- I. Corporate - Engineering
('ENG-SIA', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Engineering', 'Corporate', true),
('ENG-PTE', 'Project Time Extension', 'تمديد مدة المشروع', 'Engineering', 'Corporate', true),
('ENG-MPE', 'Maintenance Period Extension', 'تمديد فترة الصيانة', 'Engineering', 'Corporate', true),
('ENG-RC', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Engineering', 'Corporate', true),

-- I. Corporate - Marine
('MAR-VDA', 'Voyage/Declaration Addition (open cover)', 'إضافة رحلة/إقرار (في وثائق Open Cover)', 'Marine', 'Corporate', true),
('MAR-SIA', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Marine', 'Corporate', true),
('MAR-RC', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Marine', 'Corporate', true),

-- II. Individual - Individual Medical
('IND-MED-UD', 'Plan Upgrade/Downgrade Endorsement', 'ملحق ترقية/تخفيض الخطة التأمينية', 'Medical', 'Individual', true),
('IND-MED-DEP-ADD', 'Dependent Addition (spouse/newborn)', 'إضافة تابع (زوج/زوجة/مولود جديد)', 'Medical', 'Individual', true),
('IND-MED-DEP-DEL', 'Dependent Deletion', 'حذف تابع', 'Medical', 'Individual', true),
('IND-MED-BLA', 'Benefit Limit Amendment', 'تعديل حدود المنافع', 'Medical', 'Individual', true),
('IND-MED-REN', 'Renewal Endorsement (often age-band re-rated)', 'ملحق تجديد (غالباً مع إعادة التسعير حسب شريحة العمر)', 'Medical', 'Individual', true),
('IND-MED-CANC', 'Cancellation/Refund Endorsement', 'ملحق إلغاء/رد قسط', 'Medical', 'Individual', true),

-- II. Individual - Individual Life
('IND-LIFE-SAID', 'Sum Assured Increase/Decrease', 'زيادة/تخفيض مبلغ التأمين', 'Life', 'Individual', true),
('IND-LIFE-RAD', 'Rider Addition/Deletion (CI, PA rider, waiver of premium)', 'إضافة/حذف ملحقات التأمين (الأمراض الحرجة، الحوادث الشخصية، الإعفاء من القسط)', 'Life', 'Individual', true),
('IND-LIFE-BC', 'Beneficiary Change (nil premium)', 'تغيير المستفيد (بدون تأثير على القسط)', 'Life', 'Individual', false),
('IND-LIFE-PMC', 'Payment Mode Change', 'تغيير طريقة السداد', 'Life', 'Individual', true),
('IND-LIFE-REIN', 'Reinstatement after Lapse', 'إعادة التفعيل بعد توقف الوثيقة', 'Life', 'Individual', true),
('IND-LIFE-SURR', 'Surrender/Cancellation Endorsement', 'ملحق استرداد/إلغاء الوثيقة', 'Life', 'Individual', true),

-- II. Individual - Individual Motor
('IND-MOT-VVA', 'Vehicle Value Amendment', 'تعديل قيمة المركبة', 'Motor', 'Individual', true),
('IND-MOT-NDA', 'Named Driver Addition/Deletion', 'إضافة/حذف سائق مسمى', 'Motor', 'Individual', true),
('IND-MOT-NCD', 'NCD Adjustment', 'تعديل خصم عدم المطالبات (NCD)', 'Motor', 'Individual', true),
('IND-MOT-VEH-REP', 'Vehicle Replacement', 'استبدال المركبة', 'Motor', 'Individual', true),
('IND-MOT-RC', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Motor', 'Individual', true),

-- II. Individual - Individual Property/Home
('IND-PROP-SIA', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Property', 'Individual', true),
('IND-PROP-BVC', 'Building vs Contents Value Amendment', 'تعديل قيمة المبنى مقابل المحتويات', 'Property', 'Individual', true),
('IND-PROP-PEXT', 'Peril Extension', 'إضافة/توسيع الأخطار المؤمن عليها', 'Property', 'Individual', true),
('IND-PROP-RC', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Property', 'Individual', true),

-- II. Individual - Personal Accident / Travel
('PA-SIA', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'PA/Travel', 'Individual', true),
('PA-TEXT', 'Trip Extension (Travel)', 'تمديد الرحلة (تأمين السفر)', 'PA/Travel', 'Individual', true),
('PA-TERR-EXT', 'Territory Extension', 'تمديد النطاق الجغرافي', 'PA/Travel', 'Individual', true),
('PA-RC', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'PA/Travel', 'Individual', true),

-- III. Over Ceiling
('OC-ALE', 'Annual Limit Exceeded', 'تجاوز الحد السنوي — تجاوز تكلفة المطالبة/العضو للحد السنوي للوثيقة', 'Medical', 'Over Ceiling', true),
('OC-SLE', 'Sub-limit Exceeded', 'تجاوز الحد الفرعي — تجاوز الحد الخاص بالبصريات/الأسنان/الولادة', 'Medical', 'Over Ceiling', true),
('OC-PDLE', 'Per-Case / Per-Diem Limit Exceeded', 'تجاوز حد الحالة/اليوم — مثل الحد اليومي للإقامة والطعام', 'Medical', 'Over Ceiling', true),
('OC-CMLE', 'Chronic Medication Limit Exceeded', 'تجاوز حد الأدوية المزمنة', 'Medical', 'Over Ceiling', true),
('OC-MLOC', 'Member Liability Over Ceiling', 'مسؤولية العضو فوق الحد — المبلغ الذي يتحمله العضو من ماله الخاص بعد تجاوز الحد', 'Medical', 'Over Ceiling', true),
('OC-CBD', 'Corporate Buy-down', 'تحمل الشركة للزيادة (Buy-down) — تتحمل الشركة المبلغ الزائد عن حد العضو', 'Medical', 'Over Ceiling', true),

-- III. Recovery
('REC-TPR', 'Third-Party Recovery / Subrogation', 'استرداد من طرف ثالث / الحلول', 'Medical', 'Recovery', true),
('REC-COB', 'Coordination of Benefits (COB) Recovery', 'استرداد نتيجة تنسيق المنافع (COB)', 'Medical', 'Recovery', true),
('REC-OPR', 'Overpayment Recovery', 'استرداد مبالغ زائدة تم سدادها بالخطأ', 'Medical', 'Recovery', true),
('REC-FR', 'Fraud Recovery', 'استرداد مبالغ متعلقة بالاحتيال', 'Medical', 'Recovery', true),
('REC-IMR', 'Ineligible Member Recovery', 'استرداد مطالبات عضو غير مؤهل — مطالبة تم سدادها بعد تاريخ الحذف', 'Medical', 'Recovery', true),
('REC-ESR', 'End-of-Service Recovery', 'استرداد عند انتهاء الخدمة/العقد', 'Medical', 'Recovery', true),

-- III. Exception
('EXC-OON', 'Out-of-Network Exception', 'استثناء خارج الشبكة — اعتماد الخدمة بسعر الشبكة أو بموافقة خاصة', 'Medical', 'Exception', true),
('EXC-PEC', 'Pre-existing Condition Exception', 'استثناء حالة سابقة — موافقة استثنائية لمرة واحدة رغم الاستبعاد', 'Medical', 'Exception', true),
('EXC-WPW', 'Waiting Period Waiver Exception', 'استثناء/إعفاء من فترة الانتظار', 'Medical', 'Exception', true),
('EXC-NCS', 'Non-Covered Service Exception', 'استثناء خدمة غير مغطاة — اعتماد خدمة مستبعدة عادةً لمرة واحدة', 'Medical', 'Exception', true),
('EXC-VIP', 'VIP/Management Discretion Exception', 'استثناء بتقدير الإدارة/VIP — اعتماد يتجاوز مصفوفة الصلاحيات القياسية', 'Medical', 'Exception', true),
('EXC-RA', 'Retroactive Approval Exception', 'استثناء موافقة بأثر رجعي — اعتماد المطالبة بعد العلاج دون موافقة مسبقة', 'Medical', 'Exception', true),
('EXC-ALE', 'Age Limit Exception', 'استثناء حد العمر — اعتماد تابع يتجاوز الحد العمري القياسي كاستثناء', 'Medical', 'Exception', true)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  line_of_business = EXCLUDED.line_of_business,
  category = EXCLUDED.category,
  is_financial = EXCLUDED.is_financial;
