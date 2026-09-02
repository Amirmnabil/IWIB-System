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
 * Normalizes Excel date values (converts Date objects, Excel serial numbers, or string dates to YYYY-MM-DD)
 */
export function excelDateToISOString(val: any): string | null {
  if (!val) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    // Use UTC getters to preserve exact calendar date from SheetJS Date objects
    const year = val.getUTCFullYear();
    const month = String(val.getUTCMonth() + 1).padStart(2, '0');
    const day = String(val.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const s = String(val).trim();
  if (!s) return null;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.split(/[-/]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const year = parts[2];
    
    let month: string, day: string;
    if (p1 > 12) {
      day = String(p1).padStart(2, '0');
      month = String(p2).padStart(2, '0');
    } else if (p2 > 12) {
      month = String(p1).padStart(2, '0');
      day = String(p2).padStart(2, '0');
    } else {
      month = String(p1).padStart(2, '0');
      day = String(p2).padStart(2, '0');
    }
    return `${year}-${month}-${day}`;
  }

  const serial = Number(s);
  if (!isNaN(serial) && serial > 10000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  let nameEn = String(row["Full Name English"] || row["Member Name"] || row["Member Full Name"] || row["name"] || row["member_name"] || "").trim();
  if (!nameEn) {
    const fName = String(row["First Name"] || "").trim();
    const sName = String(row["Second Name"] || "").trim();
    const lName = String(row["Last Name"] || "").trim();
    nameEn = [fName, sName, lName].filter(Boolean).join(" ");
  }

  const staffId = String(row["Staff ID"] || row["Staff Code"] || row["staff_code"] || row["staff_id"] || "").trim();
  const nationalId = String(row["National ID"] || row["national_id"] || "").trim();
  
  // Extract DOB and Gender directly from valid Egyptian National ID if available
  let nidDob: string | null = null;
  let nidGender: string | null = null;
  if (/^\d{14}$/.test(nationalId)) {
    const cDigit = parseInt(nationalId.charAt(0));
    const century = cDigit === 2 ? "19" : cDigit === 3 ? "20" : cDigit === 4 ? "21" : "";
    if (century) {
      const yy = nationalId.substring(1, 3);
      const mm = nationalId.substring(3, 5);
      const dd = nationalId.substring(5, 7);
      nidDob = `${century}${yy}-${mm}-${dd}`;
      const gDigit = parseInt(nationalId.charAt(12));
      nidGender = (gDigit % 2 === 0) ? "Female" : "Male";
    }
  }

  const rawDob = excelDateToISOString(row["DOB"] || row["Date Of Birth"] || row["date_of_birth"] || null);
  const rawGender = String(row["Gender"] || row["gender"] || "").trim();

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
    date_of_birth: nidDob || rawDob,
    gender: nidGender || rawGender || "Male",
    relation: String(row["Relation"] || row["relation"] || "Employee").trim(),
    plan_category: String(row["PLAN"] || row["Plan Category"] || row["plan_category"] || "").trim(),
    mobile_number: String(row["Mobile NO."] || row["Mobile Number"] || row["Mobile"] || row["mobile_number"] || "").trim() || null,
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
    "Addition Date": "",
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

export const ADDITIONS_TEMPLATE_HEADERS = [
  "Serial",
  "Addition Date",
  "Member Name",
  "First Name",
  "Second Name",
  "Last Name",
  "DOB",
  "Gender",
  "Relation",
  "Staff ID",
  "Plan Category",
  "Principal ID",
  "Mobile",
  "Company Name",
  "National ID",
  "Nationality",
  "Bank Name",
  "Bank Account",
  "IBAN"
];

export function downloadAdditionsTemplateFile(fileName: string = "Add_Members_Template.xlsx", policy: any = null) {
  const sampleRow = {
    "Serial": 1,
    "Addition Date": excelDateToISOString(policy?.start_date || new Date().toISOString().split('T')[0]),
    "Member Name": "John Smith Doe",
    "First Name": "John",
    "Second Name": "Smith",
    "Last Name": "Doe",
    "DOB": "1990-05-15",
    "Gender": "Male",
    "Relation": "Employee",
    "Staff ID": "EMP-001",
    "Plan Category": "Platinum",
    "Principal ID": "",
    "Mobile": "01001234567",
    "Company Name": policy?.client_company_name || "ACME Corp",
    "National ID": "29005151234567",
    "Nationality": "Egyptian",
    "Bank Name": "CIB",
    "Bank Account": "100012345678",
    "IBAN": "EG123456789012345678901234567"
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  XLSX.utils.sheet_add_aoa(ws, [ADDITIONS_TEMPLATE_HEADERS], { origin: "A1" });
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Additions Census");
  XLSX.writeFile(wb, fileName);
}
