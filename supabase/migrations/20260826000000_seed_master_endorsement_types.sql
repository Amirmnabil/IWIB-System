-- Ensure unique constraint on code exists for master_endorsement_types
ALTER TABLE public.master_endorsement_types ADD CONSTRAINT master_endorsement_types_code_key UNIQUE (code);

-- Clean up any uncoded rows
DELETE FROM public.master_endorsement_types WHERE code IS NULL OR code IN ('ADD', 'DEL', 'MOD', 'CAN');

-- Insert/Upsert the complete bilingual taxonomy of master endorsement types
INSERT INTO public.master_endorsement_types (code, name, name_en, name_ar, category, category_en) VALUES
-- I. Corporate - Group Medical
('G-MED-ADD', 'Addition Endorsement (new member/s)', 'Addition Endorsement (new member/s)', 'ملحق إضافة عضو/أعضاء جدد', 'Corporate', 'Corporate'),
('G-MED-DEL', 'Deletion Endorsement (member/s termination)', 'Deletion Endorsement (member/s termination)', 'ملحق حذف عضو/أعضاء (إنهاء التغطية)', 'Corporate', 'Corporate'),
('G-MED-UPG', 'Plan Upgrade Endorsement', 'Plan Upgrade Endorsement', 'ملحق ترقية الخطة التأمينية', 'Corporate', 'Corporate'),
('G-MED-DWN', 'Plan Downgrade Endorsement', 'Plan Downgrade Endorsement', 'ملحق تخفيض الخطة التأمينية', 'Corporate', 'Corporate'),
('G-MED-HTU', 'Headcount True-up Endorsement', 'Headcount True-up Endorsement', 'ملحق تسوية العدد الفعلي للمؤمن عليهم', 'Corporate', 'Corporate'),
('G-MED-BREC', 'Bordereau Reconciliation Endorsement', 'Bordereau Reconciliation Endorsement', 'ملحق تسوية ومطابقة كشف المؤمن عليهم (Bordereau)', 'Corporate', 'Corporate'),
('G-MED-BLA', 'Benefit Limit Amendment', 'Benefit Limit Amendment', 'ملحق تعديل حدود المنافع', 'Corporate', 'Corporate'),
('G-MED-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'ملحق تعديل مبلغ التأمين', 'Corporate', 'Corporate'),
('G-MED-TNA', 'TPA Network Tier Amendment', 'TPA Network Tier Amendment', 'ملحق تعديل مستوى شبكة مقدمي الخدمة لدى TPA', 'Corporate', 'Corporate'),
('G-MED-DC', 'Data Correction Endorsement', 'Data Correction Endorsement', 'ملحق تصحيح البيانات', 'Corporate', 'Corporate'),
('G-MED-REN', 'Renewal Endorsement', 'Renewal Endorsement', 'ملحق تجديد', 'Corporate', 'Corporate'),
('G-MED-TERM', 'Termination Endorsement', 'Termination Endorsement', 'ملحق إنهاء التغطية/الوثيقة', 'Corporate', 'Corporate'),
('G-MED-REIN', 'Reinstatement Endorsement', 'Reinstatement Endorsement', 'ملحق إعادة التغطية/التفعيل', 'Corporate', 'Corporate'),

-- I. Corporate - Group Life & GPA
('G-LIFE-ADD', 'Addition of Insured Lives', 'Addition of Insured Lives', 'إضافة أفراد مؤمن عليهم', 'Corporate', 'Corporate'),
('G-LIFE-DEL', 'Deletion of Insured Lives', 'Deletion of Insured Lives', 'حذف أفراد مؤمن عليهم', 'Corporate', 'Corporate'),
('G-LIFE-SAA', 'Sum Assured Amendment', 'Sum Assured Amendment', 'تعديل مبلغ التأمين', 'Corporate', 'Corporate'),
('G-LIFE-BC', 'Beneficiary Change', 'Beneficiary Change', 'تغيير المستفيد', 'Corporate', 'Corporate'),
('G-LIFE-AR', 'Age Reclassification', 'Age Reclassification', 'إعادة تصنيف العمر', 'Corporate', 'Corporate'),
('G-LIFE-OR', 'Occupation Reclassification', 'Occupation Reclassification', 'إعادة تصنيف المهنة', 'Corporate', 'Corporate'),
('G-LIFE-EXT', 'Extension of Cover', 'Extension of Cover', 'تمديد التغطية', 'Corporate', 'Corporate'),
('G-LIFE-REN', 'Renewal Endorsement', 'Renewal Endorsement', 'ملحق تجديد', 'Corporate', 'Corporate'),
('G-LIFE-CANC', 'Cancellation Endorsement', 'Cancellation Endorsement', 'ملحق إلغاء', 'Corporate', 'Corporate'),

-- I. Corporate - Property / Fire & Perils
('PROP-SII', 'Sum Insured Increase', 'Sum Insured Increase', 'زيادة مبلغ التأمين', 'Corporate', 'Corporate'),
('PROP-SID', 'Sum Insured Decrease', 'Sum Insured Decrease', 'تخفيض مبلغ التأمين', 'Corporate', 'Corporate'),
('PROP-LOC-ADD', 'Location Addition', 'Location Addition', 'إضافة موقع', 'Corporate', 'Corporate'),
('PROP-LOC-DEL', 'Location Deletion', 'Location Deletion', 'حذف موقع', 'Corporate', 'Corporate'),
('PROP-SVA', 'Stock Value Adjustment', 'Stock Value Adjustment', 'تعديل قيمة المخزون', 'Corporate', 'Corporate'),
('PROP-PEXT', 'Peril Extension', 'Peril Extension', 'إضافة/توسيع الأخطار المؤمن عليها', 'Corporate', 'Corporate'),
('PROP-FLLA', 'First Loss Limit Amendment', 'First Loss Limit Amendment', 'تعديل حد الخسارة الأولى', 'Corporate', 'Corporate'),
('PROP-CIA', 'Co-insurance Amendment', 'Co-insurance Amendment', 'تعديل نسبة التأمين المشترك', 'Corporate', 'Corporate'),
('PROP-REN', 'Renewal Endorsement', 'Renewal Endorsement', 'ملحق تجديد', 'Corporate', 'Corporate'),
('PROP-CANC', 'Cancellation Endorsement', 'Cancellation Endorsement', 'ملحق إلغاء', 'Corporate', 'Corporate'),

-- I. Corporate - Motor (Fleet)
('FLEET-VEH-ADD', 'Vehicle Addition', 'Vehicle Addition', 'إضافة مركبة', 'Corporate', 'Corporate'),
('FLEET-VEH-DEL', 'Vehicle Deletion', 'Vehicle Deletion', 'حذف مركبة', 'Corporate', 'Corporate'),
('FLEET-VEH-REP', 'Vehicle Replacement', 'Vehicle Replacement', 'استبدال مركبة', 'Corporate', 'Corporate'),
('FLEET-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Corporate', 'Corporate'),
('FLEET-NDA', 'Named Driver Addition', 'Named Driver Addition', 'إضافة سائق مسمى', 'Corporate', 'Corporate'),
('FLEET-NDD', 'Named Driver Deletion', 'Named Driver Deletion', 'حذف سائق مسمى', 'Corporate', 'Corporate'),
('FLEET-NCD', 'NCD Adjustment', 'NCD Adjustment', 'تعديل خصم عدم المطالبات (NCD)', 'Corporate', 'Corporate'),
('FLEET-TEXT', 'Territorial Extension', 'Territorial Extension', 'تمديد النطاق الجغرافي للتغطية', 'Corporate', 'Corporate'),
('FLEET-REN', 'Renewal Endorsement', 'Renewal Endorsement', 'ملحق تجديد', 'Corporate', 'Corporate'),
('FLEET-CANC', 'Cancellation Endorsement', 'Cancellation Endorsement', 'ملحق إلغاء', 'Corporate', 'Corporate'),

-- I. Corporate - Liability
('LIAB-LIA', 'Limit of Indemnity Amendment', 'Limit of Indemnity Amendment', 'تعديل حد التعويض', 'Corporate', 'Corporate'),
('LIAB-AIE', 'Additional Insured Endorsement', 'Additional Insured Endorsement', 'إضافة مؤمن له إضافي', 'Corporate', 'Corporate'),
('LIAB-RDA', 'Retroactive Date Amendment (claims-made, PI)', 'Retroactive Date Amendment (claims-made, PI)', 'تعديل التاريخ بأثر رجعي (وثائق Claims-Made وPI)', 'Corporate', 'Corporate'),
('LIAB-TEXT', 'Territory Extension', 'Territory Extension', 'تمديد النطاق الجغرافي', 'Corporate', 'Corporate'),
('LIAB-DA', 'Deductible Amendment', 'Deductible Amendment', 'تعديل مبلغ/نسبة التحمل', 'Corporate', 'Corporate'),
('LIAB-REN', 'Renewal Endorsement', 'Renewal Endorsement', 'ملحق تجديد', 'Corporate', 'Corporate'),
('LIAB-CANC', 'Cancellation Endorsement', 'Cancellation Endorsement', 'ملحق إلغاء', 'Corporate', 'Corporate'),

-- I. Corporate - Engineering
('ENG-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Corporate', 'Corporate'),
('ENG-PTE', 'Project Time Extension', 'Project Time Extension', 'تمديد مدة المشروع', 'Corporate', 'Corporate'),
('ENG-MPE', 'Maintenance Period Extension', 'Maintenance Period Extension', 'تمديد فترة الصيانة', 'Corporate', 'Corporate'),
('ENG-RC', 'Renewal/Cancellation Endorsement', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Corporate', 'Corporate'),

-- I. Corporate - Marine
('MAR-VDA', 'Voyage/Declaration Addition (open cover)', 'Voyage/Declaration Addition (open cover)', 'إضافة رحلة/إقرار (في وثائق Open Cover)', 'Corporate', 'Corporate'),
('MAR-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Corporate', 'Corporate'),
('MAR-RC', 'Renewal/Cancellation Endorsement', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Corporate', 'Corporate'),

-- II. Individual - Individual Medical
('IND-MED-UD', 'Plan Upgrade/Downgrade Endorsement', 'Plan Upgrade/Downgrade Endorsement', 'ملحق ترقية/تخفيض الخطة التأمينية', 'Individual', 'Individual'),
('IND-MED-DEP-ADD', 'Dependent Addition (spouse/newborn)', 'Dependent Addition (spouse/newborn)', 'إضافة تابع (زوج/زوجة/مولود جديد)', 'Individual', 'Individual'),
('IND-MED-DEP-DEL', 'Dependent Deletion', 'Dependent Deletion', 'حذف تابع', 'Individual', 'Individual'),
('IND-MED-BLA', 'Benefit Limit Amendment', 'Benefit Limit Amendment', 'تعديل حدود المنافع', 'Individual', 'Individual'),
('IND-MED-REN', 'Renewal Endorsement (often age-band re-rated)', 'Renewal Endorsement (often age-band re-rated)', 'ملحق تجديد (غالباً مع إعادة التسعير حسب شريحة العمر)', 'Individual', 'Individual'),
('IND-MED-CANC', 'Cancellation/Refund Endorsement', 'Cancellation/Refund Endorsement', 'ملحق إلغاء/رد قسط', 'Individual', 'Individual'),

-- II. Individual - Individual Life
('IND-LIFE-SAID', 'Sum Assured Increase/Decrease', 'Sum Assured Increase/Decrease', 'زيادة/تخفيض مبلغ التأمين', 'Individual', 'Individual'),
('IND-LIFE-RAD', 'Rider Addition/Deletion (CI, PA rider, waiver of premium)', 'Rider Addition/Deletion (CI, PA rider, waiver of premium)', 'إضافة/حذف ملحقات التأمين (الأمراض الحرجة، الحوادث الشخصية، الإعفاء من القسط)', 'Individual', 'Individual'),
('IND-LIFE-BC', 'Beneficiary Change (nil premium)', 'Beneficiary Change (nil premium)', 'تغيير المستفيد (بدون تأثير على القسط)', 'Individual', 'Individual'),
('IND-LIFE-PMC', 'Payment Mode Change', 'Payment Mode Change', 'تغيير طريقة السداد', 'Individual', 'Individual'),
('IND-LIFE-REIN', 'Reinstatement after Lapse', 'Reinstatement after Lapse', 'إعادة التفعيل بعد توقف الوثيقة', 'Individual', 'Individual'),
('IND-LIFE-SURR', 'Surrender/Cancellation Endorsement', 'Surrender/Cancellation Endorsement', 'ملحق استرداد/إلغاء الوثيقة', 'Individual', 'Individual'),

-- II. Individual - Individual Motor
('IND-MOT-VVA', 'Vehicle Value Amendment', 'Vehicle Value Amendment', 'تعديل قيمة المركبة', 'Individual', 'Individual'),
('IND-MOT-NDA', 'Named Driver Addition/Deletion', 'Named Driver Addition/Deletion', 'إضافة/حذف سائق مسمى', 'Individual', 'Individual'),
('IND-MOT-NCD', 'NCD Adjustment', 'NCD Adjustment', 'تعديل خصم عدم المطالبات (NCD)', 'Individual', 'Individual'),
('IND-MOT-VEH-REP', 'Vehicle Replacement', 'Vehicle Replacement', 'استبدال المركبة', 'Individual', 'Individual'),
('IND-MOT-RC', 'Renewal/Cancellation Endorsement', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Individual', 'Individual'),

-- II. Individual - Individual Property/Home
('IND-PROP-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Individual', 'Individual'),
('IND-PROP-BVC', 'Building vs Contents Value Amendment', 'Building vs Contents Value Amendment', 'تعديل قيمة المبنى مقابل المحتويات', 'Individual', 'Individual'),
('IND-PROP-PEXT', 'Peril Extension', 'Peril Extension', 'إضافة/توسيع الأخطار المؤمن عليها', 'Individual', 'Individual'),
('IND-PROP-RC', 'Renewal/Cancellation Endorsement', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Individual', 'Individual'),

-- II. Individual - Personal Accident / Travel
('PA-SIA', 'Sum Insured Amendment', 'Sum Insured Amendment', 'تعديل مبلغ التأمين', 'Individual', 'Individual'),
('PA-TEXT', 'Trip Extension (Travel)', 'Trip Extension (Travel)', 'تمديد الرحلة (تأمين السفر)', 'Individual', 'Individual'),
('PA-TERR-EXT', 'Territory Extension', 'Territory Extension', 'تمديد النطاق الجغرافي', 'Individual', 'Individual'),
('PA-RC', 'Renewal/Cancellation Endorsement', 'Renewal/Cancellation Endorsement', 'ملحق تجديد/إلغاء', 'Individual', 'Individual'),

-- III. Over Ceiling
('OC-ALE', 'Annual Limit Exceeded', 'Annual Limit Exceeded', 'تجاوز الحد السنوي — تجاوز تكلفة المطالبة/العضو للحد السنوي للوثيقة', 'Over Ceiling', 'Over Ceiling'),
('OC-SLE', 'Sub-limit Exceeded', 'Sub-limit Exceeded', 'تجاوز الحد الفرعي — تجاوز الحد الخاص بالبصريات/الأسنان/الولادة', 'Over Ceiling', 'Over Ceiling'),
('OC-PDLE', 'Per-Case / Per-Diem Limit Exceeded', 'Per-Case / Per-Diem Limit Exceeded', 'تجاوز حد الحالة/اليوم — مثل الحد اليومي للإقامة والطعام', 'Over Ceiling', 'Over Ceiling'),
('OC-CMLE', 'Chronic Medication Limit Exceeded', 'Chronic Medication Limit Exceeded', 'تجاوز حد الأدوية المزمنة', 'Over Ceiling', 'Over Ceiling'),
('OC-MLOC', 'Member Liability Over Ceiling', 'Member Liability Over Ceiling', 'مسؤولية العضو فوق الحد — المبلغ الذي يتحمله العضو من ماله الخاص بعد تجاوز الحد', 'Over Ceiling', 'Over Ceiling'),
('OC-CBD', 'Corporate Buy-down', 'Corporate Buy-down', 'تحمل الشركة للزيادة (Buy-down) — تتحمل الشركة المبلغ الزائد عن حد العضو', 'Over Ceiling', 'Over Ceiling'),

-- III. Recovery
('REC-TPR', 'Third-Party Recovery / Subrogation', 'Third-Party Recovery / Subrogation', 'استرداد من طرف ثالث / الحلول', 'Recovery', 'Recovery'),
('REC-COB', 'Coordination of Benefits (COB) Recovery', 'Coordination of Benefits (COB) Recovery', 'استرداد نتيجة تنسيق المنافع (COB)', 'Recovery', 'Recovery'),
('REC-OPR', 'Overpayment Recovery', 'Overpayment Recovery', 'استرداد مبالغ زائدة تم سدادها بالخطأ', 'Recovery', 'Recovery'),
('REC-FR', 'Fraud Recovery', 'Fraud Recovery', 'استرداد مبالغ متعلقة بالاحتيال', 'Recovery', 'Recovery'),
('REC-IMR', 'Ineligible Member Recovery', 'Ineligible Member Recovery', 'استرداد مطالبات عضو غير مؤهل — مطالبة تم سدادها بعد تاريخ الحذف', 'Recovery', 'Recovery'),
('REC-ESR', 'End-of-Service Recovery', 'End-of-Service Recovery', 'استرداد عند انتهاء الخدمة/العقد', 'Recovery', 'Recovery'),

-- III. Exception
('EXC-OON', 'Out-of-Network Exception', 'Out-of-Network Exception', 'استثناء خارج الشبكة — اعتماد الخدمة بسعر الشبكة أو بموافقة خاصة', 'Exception', 'Exception'),
('EXC-PEC', 'Pre-existing Condition Exception', 'Pre-existing Condition Exception', 'استثناء حالة سابقة — موافقة استثنائية لمرة واحدة رغم الاستبعاد', 'Exception', 'Exception'),
('EXC-WPW', 'Waiting Period Waiver Exception', 'Waiting Period Waiver Exception', 'استثناء/إعفاء من فترة الانتظار', 'Exception', 'Exception'),
('EXC-NCS', 'Non-Covered Service Exception', 'Non-Covered Service Exception', 'استثناء خدمة غير مغطاة — اعتماد خدمة مستبعدة عادةً لمرة واحدة', 'Exception', 'Exception'),
('EXC-VIP', 'VIP/Management Discretion Exception', 'VIP/Management Discretion Exception', 'استثناء بتقدير الإدارة/VIP — اعتماد يتجاوز مصفوفة الصلاحيات القياسية', 'Exception', 'Exception'),
('EXC-RA', 'Retroactive Approval Exception', 'Retroactive Approval Exception', 'استثناء موافقة بأثر رجعي — اعتماد المطالبة بعد العلاج دون موافقة مسبقة', 'Exception', 'Exception'),
('EXC-ALE', 'Age Limit Exception', 'Age Limit Exception', 'استثناء حد العمر — اعتماد تابع يتجاوز الحد العمري القياسي كاستثناء', 'Exception', 'Exception')

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  category = EXCLUDED.category,
  category_en = EXCLUDED.category_en,
  updated_at = NOW();
