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

function isValidDateComponents(y: number, m: number, d: number): boolean {
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const testDate = new Date(Date.UTC(y, m - 1, d));
  return testDate.getUTCFullYear() === y && (testDate.getUTCMonth() + 1) === m && testDate.getUTCDate() === d;
}

/**
 * Normalizes Excel date values (converts Date objects, Excel serial numbers, or string dates to YYYY-MM-DD)
 */
export function excelDateToISOString(val: any): string | null {
  if (!val) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    // Use UTC getters to preserve exact calendar date from SheetJS Date objects
    const year = val.getUTCFullYear();
    const month = val.getUTCMonth() + 1;
    const day = val.getUTCDate();
    if (!isValidDateComponents(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const s = String(val).trim();
  if (!s) return null;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isValidDateComponents(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    let month: number, day: number;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      month = p1;
      day = p2;
    }
    if (!isValidDateComponents(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const serial = Number(s);
  if (!isNaN(serial) && serial > 10000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) {
      const y = parsed.y;
      const m = parsed.m;
      const d = parsed.d;
      if (isValidDateComponents(y, m, d)) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (!isValidDateComponents(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
      const yy = parseInt(nationalId.substring(1, 3), 10);
      const mm = parseInt(nationalId.substring(3, 5), 10);
      const dd = parseInt(nationalId.substring(5, 7), 10);
      const year = parseInt(`${century}${String(yy).padStart(2, '0')}`, 10);
      
      if (isValidDateComponents(year, mm, dd)) {
        nidDob = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
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
  XLSX.utils.book_append_sheet(wb, ws, "Additions Master");
  XLSX.writeFile(wb, fileName);
}

/**
 * Evaluates whether a member is canceled.
 * A member is considered canceled if:
 * 1. status is 'canceled', 'cancelled', 'terminated', or 'inactive' (case-insensitive)
 * 2. deletion_date is set (truthy non-empty string)
 * 3. is_active is explicitly false or is_canceled is explicitly true
 */
export function isMemberCanceled(member: any): boolean {
  if (!member) return false;

  if (member.deletion_date && String(member.deletion_date).trim() !== '') {
    return true;
  }

  const st = String(member.status || member.raw_status || '').toLowerCase().trim();
  if (st === 'canceled' || st === 'cancelled' || st === 'terminated' || st === 'inactive') {
    return true;
  }

  if (member.is_active === false || member.is_canceled === true) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether a member is active.
 * Includes: All main members (principals) and added members (dependents / later additions).
 * Excludes: Any member marked as canceled.
 * Active Beneficiaries = All policy members – Canceled members
 */
export function isActiveInsuredMember(member: any): boolean {
  return !isMemberCanceled(member);
}

/**
 * Dynamic Active Beneficiaries Evaluator
 * Computes true active members as of a reference date (defaults to today).
 * Rules:
 * 1. Evaluates base member rows and approved endorsement items chronologically.
 * 2. Included: base members with addition_date <= refDate (or no addition_date) and no deletion_date <= refDate,
 *    PLUS members added via addition endorsements with effective_date <= refDate and no later deletion.
 * 3. Excluded: members whose deletion_date or deletion-endorsement effective_date is <= refDate.
 * 4. Re-added members count as 1 active person once their new addition endorsement effective_date <= refDate occurs (no double-counting).
 */
export function getActiveMembersAsOfDate(
  members: any[] = [],
  endorsements: any[] = [],
  refDateStr?: string | Date
): { activeMembers: any[]; activeCount: number; canceledMembers: any[]; canceledCount: number } {
  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  refDate.setHours(23, 59, 59, 999);
  const refIso = refDate.toISOString().split('T')[0];

  const personTimelineMap = new Map<string, { member: any; events: { date: string; action: 'add' | 'delete'; item?: any }[] }>();

  const getPersonKey = (m: any): string => {
    const natId = String(m.national_id || m.nationalId || m.NationalID || '').trim();
    if (natId && natId.length > 5) return `NID:${natId}`;
    const staffId = String(m.staff_code || m.staffCode || m.staff_id || '').trim();
    if (staffId && staffId !== '-') return `STAFF:${staffId}`;
    const tpaId = String(m.member_id_tpa || m.member_tpa_code || '').trim();
    if (tpaId && tpaId !== '-') return `TPA:${tpaId}`;
    const insId = String(m.member_id_insurance || m.member_code || '').trim();
    if (insId && insId !== '-') return `INS:${insId}`;
    const name = String(m.member_name || m.name || m.member_full_name || '').trim().toLowerCase();
    const dob = String(m.date_of_birth || m.dob || '').trim();
    if (name) return `NAME:${name}_${dob}`;
    return `ID:${m.id || Math.random()}`;
  };

  // 1. Process Base/Current Policy Members
  for (const m of members) {
    if (!m) continue;
    const key = getPersonKey(m);
    const timeline = personTimelineMap.get(key) || { member: m, events: [] };
    timeline.member = { ...timeline.member, ...m };

    const addDate = m.addition_date ? excelDateToISOString(m.addition_date) : null;
    timeline.events.push({
      date: addDate || '1970-01-01',
      action: 'add',
      item: m
    });

    const delDate = m.deletion_date ? excelDateToISOString(m.deletion_date) : null;
    if (delDate || isMemberCanceled(m)) {
      timeline.events.push({
        date: delDate || addDate || '1970-01-01',
        action: 'delete',
        item: m
      });
    }

    personTimelineMap.set(key, timeline);
  }

  // 2. Process Endorsements & Endorsement Items
  const validEndorsements = (endorsements || []).filter((e: any) => {
    if (!e) return false;
    const st = (e.status || e.parent_endorsement?.status || '').toLowerCase();
    return st !== 'rejected' && st !== 'cancelled';
  });

  for (const end of validEndorsements) {
    const effDate: string = (end.effective_date
      ? excelDateToISOString(end.effective_date)
      : end.created_at
        ? excelDateToISOString(end.created_at)
        : '1970-01-01') || '1970-01-01';

    const rawItems = end.endorsement_items || end.items;
    const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : (end.action_type || end.action ? [end] : []);

    for (const item of items) {
      if (!item) continue;
      const details = item.details || item;
      const memberObj = {
        id: item.id || details.id || `end-${Math.random()}`,
        member_name: item.member_name || item.name || details.member_name || details.name || details.member_full_name || 'Unnamed Member',
        member_id_insurance: details.member_id_insurance || item.member_id_insurance || details.member_code || "-",
        member_id_tpa: details.member_id_tpa || item.member_id_tpa || "-",
        national_id: item.national_id || details.national_id || "-",
        staff_code: details.staff_code || item.staff_code || "-",
        plan_category: details.plan_category || item.plan_category || details.category || "-",
        relation: details.relation || item.relation || "Employee",
        gender: details.gender || item.gender || "Male",
        date_of_birth: details.date_of_birth || item.date_of_birth || "",
        nationality: details.nationality || item.nationality || "-",
        department: details.department || item.department || "-",
        location: details.location || item.location || "-",
        job_title: details.job_title || item.job_title || "-",
        mobile_number: details.mobile_number || item.mobile_number || "",
        addition_date: effDate,
        deletion_date: (item.action_type || item.action || '').toLowerCase() === 'delete' ? effDate : undefined,
        status: (item.action_type || item.action || '').toLowerCase() === 'delete' ? 'Cancelled' : 'Active',
        source: 'endorsement',
        parent_endorsement: end.parent_endorsement || end
      };

      const key = getPersonKey(memberObj);
      const timeline = personTimelineMap.get(key) || { member: memberObj, events: [] };
      timeline.member = { ...timeline.member, ...memberObj };

      const action = (item.action_type || item.action || 'add').toLowerCase() === 'delete' ? 'delete' : 'add';
      timeline.events.push({
        date: effDate,
        action,
        item: memberObj
      });

      personTimelineMap.set(key, timeline);
    }
  }

  // 3. Evaluate active vs canceled state as of refIso for each unique person
  const activeMembers: any[] = [];
  const canceledMembers: any[] = [];

  for (const [key, { member, events }] of personTimelineMap.entries()) {
    const eligibleEvents = events
      .filter(e => e.date <= refIso)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (eligibleEvents.length > 0) {
      const lastEvent = eligibleEvents[eligibleEvents.length - 1];
      if (lastEvent.action === 'add') {
        activeMembers.push({
          ...member,
          ...lastEvent.item,
          person_key: key,
          active_as_of: refIso
        });
      } else {
        canceledMembers.push({
          ...member,
          ...lastEvent.item,
          person_key: key,
          canceled_as_of: refIso
        });
      }
    }
  }

  return {
    activeMembers,
    activeCount: activeMembers.length,
    canceledMembers,
    canceledCount: canceledMembers.length
  };
}

/**
 * Checks if a candidate member being added to a policy was previously deleted on that policy
 * (either via deletion_date on base members or via a past deletion endorsement).
 */
export function checkPreviousDeletionStatus(
  members: any[],
  endorsements: any[],
  candidate: any
): { wasDeleted: boolean; deletionDate: string | null; note: string | null } {
  const getPersonKey = (m: any): string => {
    const natId = String(m.national_id || m.nationalId || m.NationalID || '').trim();
    if (natId && natId.length > 5) return `NID:${natId}`;
    const staffId = String(m.staff_code || m.staffCode || m.staff_id || '').trim();
    if (staffId) return `STAFF:${staffId}`;
    const tpaId = String(m.member_id_tpa || m.member_tpa_code || '').trim();
    if (tpaId) return `TPA:${tpaId}`;
    const insId = String(m.member_id_insurance || m.member_code || '').trim();
    if (insId) return `INS:${insId}`;
    const name = String(m.member_name || m.name || m.member_full_name || '').trim().toLowerCase();
    const dob = String(m.date_of_birth || m.dob || '').trim();
    return `NAME:${name}_${dob}`;
  };

  const targetKey = getPersonKey(candidate);
  let latestDeletionDate: string | null = null;

  // Check base roster members
  for (const m of members || []) {
    if (getPersonKey(m) === targetKey) {
      const delDate = m.deletion_date ? excelDateToISOString(m.deletion_date) : null;
      if (delDate) {
        latestDeletionDate = delDate;
      }
    }
  }

  // Check past endorsements
  for (const end of endorsements || []) {
    const effDate = end.effective_date ? excelDateToISOString(end.effective_date) : null;
    const items = end.endorsement_items || end.items || [];
    for (const item of items) {
      const details = item.details || item;
      const key = getPersonKey(details.member_name ? details : item);
      const action = (item.action_type || item.action || 'add').toLowerCase();
      if (key === targetKey && action === 'delete') {
        if (effDate && (!latestDeletionDate || effDate > latestDeletionDate)) {
          latestDeletionDate = effDate;
        } else if (!latestDeletionDate) {
          latestDeletionDate = 'earlier date';
        }
      }
    }
  }

  if (latestDeletionDate) {
    const name = candidate.member_name || candidate.name || candidate.member_full_name || 'Member';
    return {
      wasDeleted: true,
      deletionDate: latestDeletionDate,
      note: `This member (${name}) was previously deleted on ${latestDeletionDate}; this is a new addition, not a reactivation.`
    };
  }

  return {
    wasDeleted: false,
    deletionDate: null,
    note: null
  };
}

