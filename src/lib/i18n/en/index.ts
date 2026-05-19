
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

export const en: TranslationSchema = {
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
  taxcard: "Tax Card", // Legacy fallback
  crnumber: "CR Number",
  createDeal: "Create Deal",
  direct: "Direct",
  name: "Name",
  role: "Role",
  dataManagement: "Data Management",
  members: "Members",
  memberName: "Member Name",
  providerName: "Provider Name",
  exportEnrichedAnalysis: "Export Enriched Analysis",
  uploadConsumption: "Upload Consumption",
  readyForDiagnostics: "Ready for Diagnostics",
  startAnalysisEngine: "Start Analysis Engine",
  censusMissing: "Census Missing",
  censusMissingDescription: "Please upload the policy census to enable full demographic analysis.",
  crNumber: "CR Number",
  source: "Source",
  deleteConfirmationMessage: "Are you sure you want to delete this record? This action cannot be undone.",
  selectInsuranceContract: "Select Insurance Contract",
  value: "Value",
  appeals: "Appeals",
  fraudDetection: "Fraud Detection",
  coreInformation: "Core Information",
  insuranceSalesTracking: "Insurance & Sales Tracking",
  primaryContact: "Primary Contact",
  confirmDeletion: "Confirm Deletion",
  member: "Member",
};
