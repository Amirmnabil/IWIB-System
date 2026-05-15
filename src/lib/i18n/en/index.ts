
import { TranslationSchema } from "@/types/i18n";
import { core, navigation, months } from "./core";
import { crm } from "./crm";
import { claims } from "./claims";
import { finance } from "./finance";
import { analytics } from "./analytics";
import { settings } from "./settings";
import { insurance } from "./insurance";
import { masterData } from "./master-data";
import { enums } from "./enums";

export const en = {
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
  taxcard: "Tax Card", // Legacy fallback
} as TranslationSchema;
