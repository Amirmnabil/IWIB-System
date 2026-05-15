
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

export const en: TranslationSchema = {
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
  crNumber: "CR Number",
  taxCard: "Tax Card",
  crnumber: "CR Number", // Legacy fallback
  taxcard: "Tax Card", // Legacy fallback
} as TranslationSchema;
