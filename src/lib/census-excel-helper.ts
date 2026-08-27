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
  "Insurer ID",
  "Staff ID",
  "Individual ID",
  "Principal ID",
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
  "Deletion Date",
  "Notes"
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
      "Insurer ID": m.member_id_insurance || "",
      "Staff ID": m.staff_code || "",
      "Individual ID": m.member_id_tpa || "",
      "Principal ID": m.principle_id || "",
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
      "Deletion Date": excelDateToISOString(m.deletion_date || ""),
      "Notes": m.notes || ""
    };
  });
}

/**
 * Parses a single row from Excel into a database member payload structure
 */
export function parseExcelRowToPayload(row: any) {
  const nameEn = String(row["Full Name English"] || row["Member Name"] || row["Member Full Name"] || row["name"] || row["member_name"] || "").trim();
  const staffId = String(row["Staff ID"] || row["Staff Code"] || row["staff_code"] || row["staff_id"] || "").trim();
  const nationalId = String(row["National ID"] || row["national_id"] || "").trim();
  
  return {
    member_name: nameEn,
    staff_code: staffId,
    national_id: nationalId,
    member_id_insurance: String(row["Insurer ID"] || row["Member Ins Code"] || row["Insurance ID"] || row["Member ID Insurance"] || row["member_id_insurance"] || "").trim() || null,
    principle_id: (() => {
      const pId = String(row["Principal ID"] || row["Princpical id"] || row["Head Family Code"] || row["Principle ID"] || row["principle_id"] || row["head_family_code"] || "").trim();
      if (pId) return pId;
      if (staffId) {
        const match = staffId.match(/^(.*?)(?:[-_]\d+)$/);
        if (match) return match[1];
      }
      return null;
    })(),
    member_id_tpa: String(row["Individual ID"] || row["Member TPA Code"] || row["TPA ID"] || row["Member ID TPA"] || row["member_id_tpa"] || "").trim() || null,
    date_of_birth: excelDateToISOString(row["DOB"] || row["Date Of Birth"] || row["date_of_birth"] || null),
    gender: String(row["Gender"] || row["gender"] || "Male").trim(),
    relation: String(row["Relation"] || row["relation"] || "Employee").trim(),
    plan_category: String(row["PLAN"] || row["Plan Category"] || row["plan_category"] || "").trim(),
    mobile_number: String(row["Mobile NO."] || row["Mobile Number"] || row["mobile_number"] || "").trim() || null,
    marital_status: String(row["Marital Status"] || row["marital_status"] || "").trim() || null,
    nationality: String(row["Nationality"] || row["nationality"] || "Egyptian").trim(),
    location: String(row["Location"] || row["Branch"] || row["Area"] || row["location"] || "").trim() || null,
    department: String(row["Department"] || row["department"] || "").trim() || null,
    job_title: String(row["Job Title"] || row["job_title"] || "").trim() || null,
    bank_name: String(row["Bank Name"] || row["bank_name"] || "").trim() || null,
    bank_account: String(row["Bank Account"] || row["bank_account"] || "").trim() || null,
    iban: String(row["IBAN"] || row["iban"] || "").trim() || null,
    addition_date: excelDateToISOString(row["Addition Date"] || row["addition_date"] || null),
    deletion_date: excelDateToISOString(row["Deletion Date"] || row["deletion_date"] || null),
    full_name_arabic: String(row["Full Name Arabic"] || row["full_name_arabic"] || "").trim() || null,
    premium: Number(row["Premium"] || row["premium"]) || 0,
    notes: String(row["Notes"] || row["notes"] || "").trim() || null
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
    "Insurer ID": "INS-001",
    "Staff ID": "EMP-001",
    "Individual ID": "TPA-001",
    "Principal ID": "",
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
    "Deletion Date": "",
    "Notes": "Standard cover"
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  // Set explicit header ordering
  XLSX.utils.sheet_add_aoa(ws, [CENSUS_HEADERS], { origin: "A1" });
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Census Master");
  XLSX.writeFile(wb, fileName);
}
