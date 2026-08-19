import * as XLSX from "xlsx";

export const CENSUS_HEADERS = [
  "Contract NO.",
  "Policy NO.",
  "Company Name",
  "Insurer Name",
  "TPA Name",
  "Effective Date",
  "Expiration Date",
  "Full Name English",
  "Full Name Arabic",
  "Staff ID",
  "DOB",
  "Gender",
  "Relation",
  "PLAN",
  "Mobile NO.",
  "Marital Status",
  "Nationality",
  "National ID",
  "Location",
  "Department",
  "Job Title",
  "Bank Name",
  "Bank Account",
  "IBAN",
  "Addition Date",
  "Deletion Date"
];

/**
 * Normalizes Excel date values (converts Date objects or string dates to YYYY-MM-DD)
 */
export function excelDateToISOString(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/**
 * Maps database members to Excel rows according to the strict 26-column census layout
 */
export function mapMembersToExcelRows(members: any[], policy: any) {
  return members.map(m => {
    return {
      "Contract NO.": policy?.policy_number || m.policy_number || "",
      "Policy NO.": policy?.insurer_policy_number || m.insurance_company_code || m.insurer_policy_number || "",
      "Company Name": policy?.client_company_name || m.company_name || "",
      "Insurer Name": policy?.insurer_name || m.insurance_company_name || "",
      "TPA Name": policy?.tpa_name || m.tpa_name || "",
      "Effective Date": excelDateToISOString(policy?.start_date || m.start_date || ""),
      "Expiration Date": excelDateToISOString(policy?.end_date || m.expiry_date || m.end_date || ""),
      "Full Name English": m.member_name || m.member_full_name || "",
      "Full Name Arabic": m.full_name_arabic || m.member_full_name_ar || "",
      "Staff ID": m.staff_code || "",
      "DOB": excelDateToISOString(m.date_of_birth || ""),
      "Gender": m.gender || "Male",
      "Relation": m.relation || "Employee",
      "PLAN": m.plan_category || m.category || "",
      "Mobile NO.": m.mobile_number || "",
      "Marital Status": m.marital_status || "",
      "Nationality": m.nationality || "",
      "National ID": m.national_id || "",
      "Location": m.location || m.branch || m.area || "",
      "Department": m.department || "",
      "Job Title": m.job_title || "",
      "Bank Name": m.bank_name || "",
      "Bank Account": m.bank_account || "",
      "IBAN": m.iban || "",
      "Addition Date": excelDateToISOString(m.addition_date || ""),
      "Deletion Date": excelDateToISOString(m.deletion_date || "")
    };
  });
}

/**
 * Parses a single row from Excel into a database member payload structure
 */
export function parseExcelRowToPayload(row: any) {
  const nameEn = String(row["Full Name English"] || row["Member Name"] || "").trim();
  const staffId = String(row["Staff ID"] || row["Staff Code"] || "").trim();
  const nationalId = String(row["National ID"] || "").trim();
  
  return {
    member_name: nameEn,
    staff_code: staffId,
    national_id: nationalId,
    member_id_insurance: null,
    principle_id: null,
    member_id_tpa: null,
    date_of_birth: excelDateToISOString(row["DOB"] || row["Date Of Birth"] || null),
    gender: String(row["Gender"] || "Male").trim(),
    relation: String(row["Relation"] || "Employee").trim(),
    plan_category: String(row["PLAN"] || row["Plan Category"] || "").trim(),
    mobile_number: String(row["Mobile NO."] || row["Mobile Number"] || "").trim() || null,
    marital_status: String(row["Marital Status"] || "").trim() || null,
    nationality: String(row["Nationality"] || "Egyptian").trim(),
    location: String(row["Location"] || row["Branch"] || row["Area"] || "").trim() || null,
    department: String(row["Department"] || "").trim() || null,
    job_title: String(row["Job Title"] || "").trim() || null,
    bank_name: String(row["Bank Name"] || "").trim() || null,
    bank_account: String(row["Bank Account"] || "").trim() || null,
    iban: String(row["IBAN"] || "").trim() || null,
    addition_date: excelDateToISOString(row["Addition Date"] || null),
    deletion_date: excelDateToISOString(row["Deletion Date"] || null),
    full_name_arabic: String(row["Full Name Arabic"] || "").trim() || null
  };
}

/**
 * Downloads a blank Excel template sheet matching the census arrange
 */
export function downloadCensusTemplateFile(fileName: string = "Policy_Members_Template.xlsx", policy: any = null) {
  const sampleRow = {
    "Contract NO.": policy?.policy_number || "CNT-SAMPLE-01",
    "Policy NO.": policy?.insurer_policy_number || "POL-12345",
    "Company Name": policy?.client_company_name || "ACME Corp",
    "Insurer Name": policy?.insurer_name || "AXA Insurance",
    "TPA Name": policy?.tpa_name || "MedNet",
    "Effective Date": excelDateToISOString(policy?.start_date || "2026-01-01"),
    "Expiration Date": excelDateToISOString(policy?.end_date || "2026-12-31"),
    "Full Name English": "John Smith Doe",
    "Full Name Arabic": "جون سميث دو",
    "Staff ID": "EMP-001",
    "DOB": "1990-05-15",
    "Gender": "Male",
    "Relation": "Employee",
    "PLAN": "Platinum",
    "Mobile NO.": "01001234567",
    "Marital Status": "Married",
    "Nationality": "Egyptian",
    "National ID": "29005151234567",
    "Location": "Cairo",
    "Department": "Engineering",
    "Job Title": "Software Engineer",
    "Bank Name": "CIB",
    "Bank Account": "100012345678",
    "IBAN": "EG123456789012345678901234567",
    "Addition Date": "2026-01-01",
    "Deletion Date": ""
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  // Set explicit header ordering
  XLSX.utils.sheet_add_aoa(ws, [CENSUS_HEADERS], { origin: "A1" });
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Census Master");
  XLSX.writeFile(wb, fileName);
}
