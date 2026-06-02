import { differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths, isValid } from "date-fns";

/**
 * Calculates the insured member's age based on a specific rounding rule:
 * If the member has passed 6 months and 1 day after their last birthday, 
 * their age should be rounded up to the next year.
 * 
 * Logic:
 * IF (months > 6) OR (months == 6 AND days >= 1)
 *     THEN age = years + 1
 * ELSE
 *     age = years
 */
export const calculateSMEAge = (birthDate: Date | null, referenceDate: Date | string): number => {
  if (!birthDate || !isValid(birthDate)) return -1;
  
  const refDate = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  if (!isValid(refDate)) return -1;

  // Exact years
  const years = differenceInYears(refDate, birthDate);
  
  // Date after full years
  const dateAfterYears = addYears(birthDate, years);
  
  // Remaining months
  const months = differenceInMonths(refDate, dateAfterYears);
  
  // Date after full months
  const dateAfterMonths = addMonths(dateAfterYears, months);
  
  // Remaining days
  const days = differenceInDays(refDate, dateAfterMonths);

  // Business Rule:
  // IF (months > 6) OR (months == 6 AND days >= 1) THEN age = years + 1
  if (months > 6 || (months === 6 && days >= 1)) {
    return years + 1;
  }
  
  return years;
};

/**
 * Parses a date string in dd/MM/yyyy format or other common formats
 */
export const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Try dd/MM/yyyy
  const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month - 1, day);
    if (isValid(date)) return date;
  }
  
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
};
