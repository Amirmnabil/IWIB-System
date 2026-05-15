
import { TranslationSchema } from "../types";
import { core, navigation, months } from "./core";
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
  ...navigation,
  ...months,
  ...crm,
  ...claims,
  ...finance,
  ...analytics,
  ...settings,
  ...insurance,
  ...masterData,
  ...enums,

  // Naming Fixes (Standardized camelCase)
  crNumber: "رجل السجل التجاري",
  taxCard: "رقم البطاقة الضريبية",
  crnumber: "سجل تجاري", // Legacy fallback
  taxcard: "بطاقة ضريبية", // Legacy fallback
} as TranslationSchema;
