
import { TranslationSchema } from "@/types/i18n";
import { core } from "./core";
import { crm } from "./crm";
import { claims } from "./claims";
import { finance } from "./finance";
import { analytics } from "./analytics";
import { settings } from "./settings";
import { insurance } from "./insurance";
import { masterData } from "./master-data";
import { enums } from "./enums";

export const ar: TranslationSchema = {
  ...core,
  ...crm,
  ...claims,
  ...finance,
  ...analytics,
  ...settings,
  ...insurance,
  ...masterData,
  ...enums,

  // Naming Fixes (Standardized camelCase)
  crnumber: "رقم السجل التجاري",
  taxcard: "رقم البطاقة الضريبية",
  createDeal: "إنشاء صفقة",
  direct: "مباشر",
  name: "الاسم",
  role: "الدور",
  dataManagement: "إدارة البيانات",
  members: "الأعضاء",
  memberName: "اسم العضو",
  providerName: "اسم المزود",
  exportEnrichedAnalysis: "تصدير التحليل المعزز",
  uploadConsumption: "رفع الاستهلاك",
  readyForDiagnostics: "جاهز للتشخيص",
  startAnalysisEngine: "بدء محرك التحليل",
  censusMissing: "التعداد مفقود",
  censusMissingDescription: "يرجى رفع تعداد السياسة لتمكين التحليل الديموغرافي الكامل.",
  crNumber: "رقم السجل التجاري",
  source: "المصدر",
  deleteConfirmationMessage: "هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.",
  selectInsuranceContract: "اختر عقد التأمين",
  value: "القيمة",
  appeals: "التظلمات",
  fraudDetection: "كشف الاحتيال",
  coreInformation: "المعلومات الأساسية",
  insuranceSalesTracking: "تتبع التأمين والمبيعات",
  primaryContact: "جهة الاتصال الأساسية",
  confirmDeletion: "تأكيد الحذف",
  member: "عضو",
  clientType: "نوع العميل",
  clientTypes: "أنواع العملاء",
  productSubtypes: "الأنواع الفرعية للمنتجات",
  subtype: "النوع الفرعي",
};
