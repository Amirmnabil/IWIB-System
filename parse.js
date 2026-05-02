const fs = require('fs');
const path = require('path');

const plansTxt = fs.readFileSync(path.join('d:', 'IWIB', 'SME App 2026', 'insurance_plans_database (1).txt'), 'utf-8');
const premiumsTxt = fs.readFileSync(path.join('d:', 'IWIB', 'SME App 2026', 'age_premium_amounts (1).txt'), 'utf-8');

// Parse Plans
const planLines = plansTxt.split('\n').map(l => l.trim()).filter(l => l);
const planHeaders = planLines[0].split('\t').map(h => h.trim());

const plans = [];
for (let i = 1; i < planLines.length; i++) {
    const cols = planLines[i].split('\t').map(c => {
      // Remove surrounding quotes if exist
      let val = c.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val.replace(/\\n/g, ' ');
    });
    
    if (cols.length < 5) continue;
    
    const parseValue = (idx) => cols[idx] || '';
    
    // Annual Limit formatting
    let annualLimitStr = parseValue(4);
    let annualLimitValue = parseInt(annualLimitStr.replace(/[^0-9]/g, ''), 10) || 0;
    
    const plan = {
        id: parseValue(0),
        company: parseValue(1),
        name: parseValue(2),
        type: parseValue(2),
        lifeInsurance: parseValue(3),
        annualLimit: annualLimitStr,
        annualLimitValue: annualLimitValue,
        tpa: parseValue(5),
        network: parseValue(6),
        accommodation: parseValue(7),
        inpatient: parseValue(8),
        consultations: parseValue(9),
        radiologyLab: parseValue(10),
        medications: parseValue(11),
        dental: parseValue(12),
        optical: parseValue(13),
        maternity: parseValue(14),
        chronicPreExisting: parseValue(15),
        covid19: parseValue(16),
        outOfNetwork: parseValue(17),
        minMembers: parseInt(parseValue(18), 10) || 0,
        maxMembers: parseInt(parseValue(19), 10) || 0,
        paymentTerms: parseValue(20)
    };
    plans.push(plan);
}

const plansTs = `export interface SMEPlan {
  id: string;
  name: string;
  company: string;
  type: string;
  annualLimit: string;
  annualLimitValue: number;
  lifeInsurance: string;
  tpa: string;
  network: string;
  accommodation: string;
  inpatient: string;
  consultations: string;
  radiologyLab: string;
  medications: string;
  dental: string;
  optical: string;
  maternity: string;
  chronicPreExisting: string;
  covid19: string;
  outOfNetwork: string;
  minMembers: number;
  maxMembers: number;
  paymentTerms: string;
  basePremium?: number; 
}

export const SME_PLANS: SMEPlan[] = ${JSON.stringify(plans, null, 2)};
`;

fs.writeFileSync(path.join('d:', 'IWIB', 'IWIB System', 'SYSTEM', 'src', 'lib', 'plans-data.ts'), plansTs);

// Parse Premiums
const premiumLines = premiumsTxt.split('\n').map(l => l.trim()).filter(l => l);
const premiumData = {};

for (let i = 1; i < premiumLines.length; i++) {
    const cols = premiumLines[i].split('\t').map(c => {
        let val = c.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        return val.replace(/,/g, '');
    });
    
    if (cols.length < 2) continue;
    
    const planId = cols[0];
    const age = parseInt(cols[1], 10);
    const emp = parseFloat(cols[2]) || 0;
    const spouse = parseFloat(cols[3]) || emp;
    const child = parseFloat(cols[4]) || spouse || emp;
    
    if (!premiumData[planId]) {
        premiumData[planId] = {};
    }
    premiumData[planId][age] = { emp, spouse, child };
}

const pricingTs = `export const PLAN_PREMIUMS: Record<string, Record<number, {emp: number, spouse: number, child: number}>> = ${JSON.stringify(premiumData, null, 2)};

export const getPremium = (planId: string, age: number, type: 'Employee' | 'Spouse' | 'Child'): number => {
  const planData = PLAN_PREMIUMS[planId];
  if (!planData) return 0;
  
  // Find exact age or closest below
  let matchAge = age;
  if (!planData[matchAge]) {
     // fallback if exact age not found
     const ages = Object.keys(planData).map(Number).sort((a,b) => a-b);
     for (let i = ages.length - 1; i >= 0; i--) {
        if (age >= ages[i]) {
            matchAge = ages[i];
            break;
        }
     }
     // If still not found, use first
     if (!planData[matchAge]) matchAge = ages[0];
  }
  
  if (!planData[matchAge]) return 0;
  
  if (type === 'Employee') return planData[matchAge].emp;
  if (type === 'Spouse') return planData[matchAge].spouse;
  if (type === 'Child') return planData[matchAge].child;
  return 0;
};

// Fallback empty map for compatibility
export const PLAN_PRICING_STYLE_MAP: Record<string, string> = {};
`;

fs.writeFileSync(path.join('d:', 'IWIB', 'IWIB System', 'SYSTEM', 'src', 'lib', 'pricing-matrix.ts'), pricingTs);

console.log('Successfully updated plans and premiums!');
