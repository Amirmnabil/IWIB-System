import { differenceInYears } from "date-fns";

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  derived?: {
    age?: number;
    extractedDob?: string;
    extractedGender?: "Male" | "Female";
  };
}

/**
 * Normalizes a date string to YYYY-MM-DD format for strict comparison
 */
export function normalizeDate(d: string | null): string {
  if (!d) return "";
  const clean = d.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validates Egyptian National ID format and extracts DOB/gender
 */
export function validateNationalID(nationalId: string, enteredDob: string | null, enteredGender: string): {
  isValid: boolean;
  error?: string;
  dob?: string;
  gender?: "Male" | "Female";
} {
  if (!/^\d{14}$/.test(nationalId)) {
    return { isValid: false, error: "National ID must be exactly 14 digits." };
  }

  const centuryDigit = parseInt(nationalId.charAt(0));
  let century = "";
  if (centuryDigit === 2) {
    century = "19";
  } else if (centuryDigit === 3) {
    century = "20";
  } else if (centuryDigit === 4) {
    century = "21";
  } else {
    return { isValid: false, error: "Invalid National ID: First digit must be 2, 3, or 4." };
  }

  const yy = nationalId.substring(1, 3);
  const mm = nationalId.substring(3, 5);
  const dd = nationalId.substring(5, 7);
  const extractedDob = `${century}${yy}-${mm}-${dd}`;

  // Check if date is valid
  const dateObj = new Date(extractedDob);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: "Invalid birth date encoded in National ID." };
  }

  // Mismatch checks using normalized dates
  const normEnteredDob = normalizeDate(enteredDob);
  if (normEnteredDob && normEnteredDob !== extractedDob) {
    return { isValid: false, error: `Birth date mismatch. Extracted: ${extractedDob}, entered: ${normEnteredDob}.` };
  }

  const genderDigit = parseInt(nationalId.charAt(12));
  const extractedGender = (genderDigit % 2 === 0) ? "Female" : "Male";

  if (enteredGender && enteredGender.toLowerCase() !== extractedGender.toLowerCase()) {
    return { isValid: false, error: `Gender mismatch. Extracted: ${extractedGender}, entered: ${enteredGender}.` };
  }

  return { isValid: true, dob: extractedDob, gender: extractedGender };
}

/**
 * Validates Egyptian Mobile format (11 digits starting with 01)
 */
export function validateMobile(mobile: string): boolean {
  return /^01[0125]\d{8}$/.test(mobile);
}

/**
 * Calculates age in years from DOB string (YYYY-MM-DD)
 */
export function calculateAge(dobString: string | null): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export interface ValidationConfig {
  plan?: {
    min_age?: number;
    max_age?: number;
  };
  policy?: {
    max_allowed_age?: number;
  };
  dependentRules?: {
    child_max_age?: number;
  };
  existingNationalIds?: string[];
  activeEmployees?: { id: string; member_name: string; staff_code?: string }[];
  uploadedEmployees?: string[]; // Array of employee staff_codes in same upload
  medicalBrackets?: { plan: string; relation: string; age_from: number; age_to: number; net_premium?: number }[];
}

/**
 * Fully validates member credentials against master data configuration rules
 */
export function validateMemberAddition(
  member: {
    member_name: string;
    national_id: string;
    date_of_birth: string | null;
    gender: string;
    relation: string;
    plan_category: string;
    staff_code?: string | null;
    nationality?: string | null;
    addition_date?: string | null;
    linked_main_member_id?: string | null;
    principle_id?: string | null;
    mobile_number?: string | null;
    [key: string]: any;
  },
  config: ValidationConfig
): ValidationResult {
  const errors: Record<string, string> = {};
  const derived: any = {};

  // 1. Mandatory Fields Check for Additions
  if (!member.member_name?.trim()) errors.member_name = "Full Name English is required.";
  if (!member.staff_code?.trim()) errors.staff_code = "Staff ID is required.";
  if (!member.date_of_birth) errors.date_of_birth = "Date of Birth is required.";
  if (!member.gender) errors.gender = "Gender is required.";
  if (!member.relation) errors.relation = "Relation is required.";
  if (!member.plan_category) errors.plan_category = "PLAN is required.";
  if (!member.nationality?.trim()) errors.nationality = "Nationality is required.";
  if (!member.national_id?.trim()) errors.national_id = "National ID is required.";

  // If any required field is missing, stop here
  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  // 2. National ID & Gender/DOB Checks
  const nidVal = validateNationalID(member.national_id, member.date_of_birth, member.gender);
  if (!nidVal.isValid) {
    errors.national_id = nidVal.error || "Invalid National ID.";
  } else {
    derived.extractedDob = nidVal.dob;
    derived.extractedGender = nidVal.gender;
  }

  // 3. Mobile Number Checks (optional, but if filled must be valid)
  if (member.mobile_number && member.mobile_number.trim() !== "" && !validateMobile(member.mobile_number)) {
    errors.mobile_number = "Mobile must be 11 digits starting with 01 (e.g. 010, 011, 012, 015).";
  }

  // 4. Age Calculations
  const age = calculateAge(member.date_of_birth);
  derived.age = age;

  // 5. Plan Age Eligibility Limits
  if (config.plan) {
    const minAge = config.plan.min_age ?? 0;
    const maxAge = config.plan.max_age ?? 65;
    if (age < minAge || age > maxAge) {
      errors.plan_category = `Member not eligible for selected plan based on age (allowed: ${minAge}-${maxAge} years, actual: ${age} years).`;
    }
  }

  // 6. Policy High Age Block
  if (config.policy) {
    const maxAllowedAge = config.policy.max_allowed_age ?? 65;
    if (age > maxAllowedAge) {
      errors.date_of_birth = `Age exceeds policy limit of ${maxAllowedAge} years (actual: ${age} years).`;
    }
  }

  // 7. Child Max Age checks
  if (member.relation === "Child") {
    const childMaxAge = config.dependentRules?.child_max_age ?? 23;
    if (age > childMaxAge) {
      errors.date_of_birth = `Child exceeds maximum allowed age of ${childMaxAge} years (actual: ${age} years).`;
    }
  }

  // 8. Relation Specific Gender Rules (e.g. Spouse = Female)
  if (member.relation === "Spouse" && member.gender !== "Female") {
    errors.gender = "Invalid gender for selected relation: Spouse must be Female.";
  }

  // 9. Main Member Linkage (A primary employee must exist before adding any dependent)
  const isEmployee = member.relation === "Employee" || member.relation === "Principal";
  if (!isEmployee) {
    const parentCode = member.principle_id || member.linked_main_member_id;
    if (!parentCode) {
      errors.linked_main_member_id = "Dependent must be linked to a primary employee (enter Principle ID or parent's staff code).";
    } else {
      const existsInActive = config.activeEmployees?.some(
        (emp) =>
          emp.id === parentCode ||
          (emp.staff_code && emp.staff_code.trim().toLowerCase() === String(parentCode).trim().toLowerCase())
      );
      const existsInUploaded = config.uploadedEmployees?.some(
        (code) => String(code).trim().toLowerCase() === String(parentCode).trim().toLowerCase()
      );
      if (!existsInActive && !existsInUploaded) {
        errors.linked_main_member_id = `Linked primary employee (Principle ID: "${parentCode}") was not found in active roster or the current upload list.`;
      }
    }
  }

  // 10. Plan Eligibility based on Policy Medical Brackets (Age Bands)
  if (config.medicalBrackets && config.medicalBrackets.length > 0) {
    const normRel = isEmployee ? 'employee' : member.relation.toLowerCase();
    const matchingBracket = config.medicalBrackets.find(
      (b) =>
        b.plan?.toLowerCase() === member.plan_category?.toLowerCase() &&
        (b.relation?.toLowerCase() === normRel || (b.relation?.toLowerCase() === 'principal' && normRel === 'employee')) &&
        age >= Number(b.age_from || 0) &&
        age <= Number(b.age_to || 999)
    );
    if (!matchingBracket) {
      errors.plan_category = `Member is not eligible for selected plan "${member.plan_category}" based on the policy age bands (age: ${age} years, relation: ${member.relation}).`;
    }
  }

  // 11. Duplication checks
  if (config.existingNationalIds && config.existingNationalIds.includes(member.national_id)) {
    errors.national_id = "A member with this National ID is already active under this policy.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    derived,
  };
}

/**
 * Validates member deletion rules: a spouse or child cannot be deleted unless the principal member is already deleted or being deleted in the same request.
 */
export function validateMemberDeletion(
  member: {
    id?: string;
    relation: string;
    linked_main_member_id?: string | null;
    principle_id?: string | null;
    [key: string]: any;
  },
  activeMembers: any[],
  batchDeleteMemberIds: string[] = []
): { isValid: boolean; error?: string } {
  const rel = (member.relation || '').toLowerCase();
  if (rel === 'spouse' || rel === 'child') {
    const parentId = member.linked_main_member_id || member.principle_id;
    if (parentId) {
      // Find the principal member in the active members list
      const principal = activeMembers.find((m: any) => 
        m.id === parentId || 
        (m.staff_code && String(m.staff_code).trim().toLowerCase() === String(parentId).trim().toLowerCase())
      );
      
      if (principal) {
        const isPrincipalDeleted = !!principal.deletion_date;
        const isPrincipalInBatch = batchDeleteMemberIds.includes(principal.id);
        
        if (!isPrincipalDeleted && !isPrincipalInBatch) {
          return {
            isValid: false,
            error: `Cannot delete dependent: You must delete the principal member (${principal.member_name || 'Principal'}) first.`
          };
        }
      }
    }
  }
  return { isValid: true };
}

