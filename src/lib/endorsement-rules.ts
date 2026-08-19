/**
 * Insurer-Configured Endorsement Engine — Calculations & Validation Rules
 */

export interface InsurerEndorsementRules {
  id?: string;
  insurer_id?: string;
  proration_method?: 'daily' | 'monthly' | null;
  late_addition_threshold_month?: number | null;
  minimum_premium_percentage_after_threshold?: number | null;
  refund_allowed_if_utilized?: boolean | null;
  refund_processing_delay_days?: number | null;
  dependent_termination_on_main_delete?: boolean | null;
  coverage_start_basis?: 'request_date' | 'effective_date' | null;
  refund_proration_method?: 'daily' | 'monthly' | null;
}

export interface EndorsementPolicyInfo {
  start_date: string;
  end_date: string;
  tax_type?: 'percentage' | 'amount' | null;
  tax_amount?: number | null;
}

/**
 * Validates whether all required insurer rules for the given actions are configured.
 * Returns the validation status and a list of missing configuration field labels.
 */
export function validateInsurerEndorsementConfig(
  rules: InsurerEndorsementRules | null | undefined,
  actions: ('add' | 'delete')[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!rules) {
    return {
      isValid: false,
      missingFields: [
        ...(actions.includes('add')
          ? ['Proration Method', 'Late Addition Threshold', 'Minimum Premium Percentage', 'Coverage Start Basis']
          : []),
        ...(actions.includes('delete')
          ? ['Refund Allowed If Utilized', 'Refund Processing Delay', 'Refund Proration Method']
          : [])
      ]
    };
  }

  if (actions.includes('add')) {
    if (!rules.proration_method || rules.proration_method === ('unconfigured' as any)) {
      missingFields.push('Proration Method');
    }
    if (rules.late_addition_threshold_month === null || rules.late_addition_threshold_month === undefined || rules.late_addition_threshold_month === ('unconfigured' as any)) {
      missingFields.push('Late Addition Threshold');
    }
    if (rules.minimum_premium_percentage_after_threshold === null || rules.minimum_premium_percentage_after_threshold === undefined || rules.minimum_premium_percentage_after_threshold === ('unconfigured' as any)) {
      missingFields.push('Minimum Premium Percentage');
    }
    if (!rules.coverage_start_basis || rules.coverage_start_basis === ('unconfigured' as any)) {
      missingFields.push('Coverage Start Basis');
    }
  }

  if (actions.includes('delete')) {
    if (rules.refund_allowed_if_utilized === null || rules.refund_allowed_if_utilized === undefined || rules.refund_allowed_if_utilized === ('unconfigured' as any)) {
      missingFields.push('Refund Allowed If Utilized');
    }
    if (rules.refund_processing_delay_days === null || rules.refund_processing_delay_days === undefined || rules.refund_processing_delay_days === ('unconfigured' as any)) {
      missingFields.push('Refund Processing Delay');
    }
    if (!rules.refund_proration_method || rules.refund_proration_method === ('unconfigured' as any)) {
      missingFields.push('Refund Proration Method');
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Calculates the proration factor based on daily or monthly methods.
 */
export function calculateProrationFactor(
  startDateStr: string,
  endDateStr: string,
  effectiveDateStr: string,
  method: 'daily' | 'monthly'
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const eff = new Date(effectiveDateStr);

  // Normalize dates to midnight to avoid timezone hour offsets
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  eff.setHours(0, 0, 0, 0);

  if (method === 'daily') {
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.round((end.getTime() - eff.getTime()) / (1000 * 60 * 60 * 24)));
    return remainingDays / totalDays;
  } else {
    // Monthly proration method: any part of a calendar month counts as a full month.
    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const remainingMonths = (end.getFullYear() - eff.getFullYear()) * 12 + (end.getMonth() - eff.getMonth()) + 1;
    
    const factor = Math.max(0, remainingMonths) / Math.max(1, totalMonths);
    return Math.min(1, factor);
  }
}

/**
 * Calculates the final addition premium impact after proration and late addition checks.
 */
export function calculateAdditionPremium(
  annualPremium: number,
  startDateStr: string,
  effectiveDateStr: string,
  prorationFactor: number,
  lateAdditionThresholdMonth: number,
  minPremiumPercent: number
): number {
  const start = new Date(startDateStr);
  const eff = new Date(effectiveDateStr);

  // Elapsed months calculation (0-indexed elapsed months in policy cycle)
  const elapsedMonths = (eff.getFullYear() - start.getFullYear()) * 12 + (eff.getMonth() - start.getMonth());

  let proratedPremium = annualPremium * prorationFactor;

  if (elapsedMonths >= lateAdditionThresholdMonth) {
    // Convert percentage factor safely (e.g. support both 25 and 0.25)
    const fraction = minPremiumPercent > 1 ? minPremiumPercent / 100 : minPremiumPercent;
    const minPremium = annualPremium * fraction;
    
    if (proratedPremium < minPremium) {
      proratedPremium = minPremium;
    }
  }

  return proratedPremium;
}

/**
 * Calculates the tax amount based on policy tax configuration.
 * Returns 0 if tax is not percentage-based or missing.
 */
export function calculateEndorsementTax(
  netPremium: number,
  policy: EndorsementPolicyInfo
): number {
  if (policy.tax_type === 'percentage') {
    return calculatePolicyTotalTax(netPremium, policy.tax_type, policy.tax_amount);
  }
  
  // Flat tax amounts apply to the main policy invoice, so they are 0 for incremental endorsement movements.
  return 0;
}

/**
 * Normalizes relation names and matches policy medical brackets to lookup member premium.
 */
export function lookupMedicalBracketPremium(
  policy: any,
  plan: string,
  relation: string,
  dob: string | null
): number {
  if (!policy || !policy.medical_brackets || !Array.isArray(policy.medical_brackets)) return 0;
  
  const calculateAge = (dobString: string): number => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = dob ? calculateAge(dob) : 0;
  const pPlan = String(plan || '').trim().toUpperCase();
  const pRelation = String(relation || '').trim().toLowerCase();

  const matchRelation = (ruleRel: string, memberRel: string) => {
    const r1 = ruleRel.toLowerCase().trim();
    const r2 = memberRel.toLowerCase().trim();
    if (r1 === r2) return true;
    const principals = ['principal', 'employee', 'member', 'holder'];
    if (principals.includes(r1) && principals.includes(r2)) return true;
    return false;
  };

  let bracket = policy.medical_brackets.find((b: any) => {
    const bPlan = String(b.plan || '').trim().toUpperCase();
    return bPlan === pPlan &&
      matchRelation(b.relation, pRelation) &&
      age >= Number(b.age_from || 0) &&
      age <= Number(b.age_to || 999);
  });

  // Fallback: If no exact plan match found, match by relation and age group
  if (!bracket) {
    bracket = policy.medical_brackets.find((b: any) => {
      return matchRelation(b.relation, pRelation) &&
        age >= Number(b.age_from || 0) &&
        age <= Number(b.age_to || 999);
    });
  }

  return bracket ? Number(bracket.net_premium || 0) : 0;
}

/**
 * Calculates the total tax for a policy based on type and amount.
 */
export function calculatePolicyTotalTax(
  netPremium: number,
  taxType: 'percentage' | 'amount' | null | undefined,
  taxAmount: number | null | undefined
): number {
  if (!taxType || taxAmount === null || taxAmount === undefined) {
    return 0;
  }
  if (taxType === 'percentage') {
    return netPremium * (taxAmount / 100);
  }
  return taxAmount;
}

/**
 * Calculates commission adjusted net premium by deducting TPA fees.
 */
export function calculateCommissionAdjustedNet(
  netPremium: number,
  tpaFee: { type: string; value: string | number } | null | undefined
): { adjustedNet: number; tpaFeeDeduction: number } {
  let adjustedNet = netPremium;
  let tpaFeeDeduction = 0;
  if (tpaFee) {
    if (tpaFee.type === 'percentage') {
      tpaFeeDeduction = netPremium * (Number(tpaFee.value) / 100);
    } else {
      tpaFeeDeduction = Number(tpaFee.value) || 0;
    }
    adjustedNet = Math.max(0, netPremium - tpaFeeDeduction);
  }
  return { adjustedNet, tpaFeeDeduction };
}

/**
 * Calculates insurance company tax amount on commissions.
 */
export function calculateInsurerCommissionTaxes(
  commissionAmount: number,
  insurerTaxPercent: number
): number {
  return commissionAmount * (insurerTaxPercent / 100);
}
