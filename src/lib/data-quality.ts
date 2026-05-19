/**
 * Enterprise-Grade Data Quality and Validation Utilities
 */

/**
 * Normalizes a phone number to a unified format.
 * - Removes all spaces, brackets, hyphens, and non-numeric characters (except optional leading '+').
 * - Handles Egyptian phone number variations:
 *   - +2010... -> 010...
 *   - 002010... -> 010...
 *   - 2010... -> 010...
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Keep only digits and leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, "");
  
  // If it starts with 00, convert to +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  
  // Normalization logic for Egyptian numbers (+201..., 201...)
  // Egyptian mobile codes are usually 10, 11, 12, 15 followed by 8 digits (11 total digits including leading 0)
  if (cleaned.startsWith("+201")) {
    cleaned = "0" + cleaned.slice(3); // e.g. +201012345678 -> 01012345678
  } else if (cleaned.startsWith("201") && cleaned.length === 11) {
    cleaned = "0" + cleaned.slice(2); // e.g. 201012345678 -> 01012345678
  } else if (cleaned.startsWith("1") && cleaned.length === 10) {
    cleaned = "0" + cleaned; // e.g. 1012345678 -> 01012345678
  }
  
  return cleaned;
}

/**
 * Normalizes a company name for case-insensitive duplicate checks.
 * - Trims leading and trailing spaces.
 * - Converts to lowercase.
 * - Collapses consecutive spaces into a single space.
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Validates whether an email format is correct.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Normalizes an email address to lowercase and trimmed format.
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Computes the Levenshtein Distance between two strings.
 * Used for fuzzy/similarity duplicate checks.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + 1   // Substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Computes string similarity between two names (0.0 to 1.0)
 */
export function getStringSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim().replace(/\s+/g, " ");
  const str2 = s2.toLowerCase().trim().replace(/\s+/g, " ");
  
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  
  return 1.0 - distance / maxLen;
}

/**
 * Interface representing a Data Cleanliness Score break-down.
 */
export interface QualityBreakdown {
  score: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasCompany: boolean;
  hasJobTitle: boolean;
  hasRoleType: boolean;
}

/**
 * Calculates a Data Quality Score out of 100 for a Contact profile.
 */
export function calculateQualityScore(contact: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  company_id?: string;
  job_title?: string;
  role_type?: string;
}): QualityBreakdown {
  let score = 0;
  
  // Base name fields are essential
  const hasName = !!(contact.first_name?.trim() && contact.last_name?.trim());
  if (hasName) score += 20;
  
  const hasPhone = !!(contact.phone?.trim() || contact.mobile?.trim());
  if (hasPhone) score += 30; // Phone contactability is key
  
  const hasEmail = !!(contact.email?.trim() && isValidEmail(contact.email));
  if (hasEmail) score += 25; // Email contactability is highly rated
  
  const hasCompany = !!contact.company_id?.trim();
  if (hasCompany) score += 15; // Essential for CRM mapping
  
  const hasJobTitle = !!contact.job_title?.trim();
  if (hasJobTitle) score += 5;
  
  const hasRoleType = !!contact.role_type?.trim();
  if (hasRoleType) score += 5;
  
  return {
    score,
    hasPhone,
    hasEmail,
    hasCompany,
    hasJobTitle,
    hasRoleType
  };
}
