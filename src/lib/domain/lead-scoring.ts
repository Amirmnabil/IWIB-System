import type { Company } from "@/lib/types";

/**
 * Calculates a lead completeness and quality score out of 100.
 */
export function calculateLeadScore(company: Partial<Company>) {
  let score = 50; // Base score

  if (company.employee_count) {
    if (company.employee_count > 100) score += 20;
    else if (company.employee_count > 20) score += 10;
  }

  if (company.priority === 'high' || company.priority === 'critical') score += 15;
  if (company.primary_contact_email && company.primary_contact_phone) score += 10;
  if (company.industry) score += 5;

  return {
    related_id: (company as any).id,
    score: Math.min(score, 100),
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
    factors: [
      { factor: 'Initial Profile Completeness', points: score }
    ],
    last_calculated: new Date().toISOString()
  };
}
