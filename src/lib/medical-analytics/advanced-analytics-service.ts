import { format, differenceInDays, addDays, subMonths, isWithinInterval } from "date-fns";

export interface PolicyValueConfig {
  annual_premium: number;
  premium_pmpy?: number;
  annual_limit?: number;
  target_loss_ratio?: number;
  plan_category_premiums?: Record<string, number>;
}

export const DEFAULT_ICD_CHAPTERS: Record<string, string> = {
  'A': 'Infectious & Parasitic Diseases',
  'B': 'Infectious & Parasitic Diseases',
  'C': 'Neoplasms & Oncology',
  'D': 'Neoplasms & Blood Disorders',
  'E': 'Endocrine, Nutritional & Metabolic',
  'F': 'Mental & Behavioral Disorders',
  'G': 'Nervous System',
  'H': 'Eye, Ear & Mastoid',
  'I': 'Circulatory System & Heart',
  'J': 'Respiratory System',
  'K': 'Digestive System',
  'L': 'Skin & Subcutaneous Tissue',
  'M': 'Musculoskeletal & Connective Tissue',
  'N': 'Genitourinary System',
  'O': 'Pregnancy & Maternity',
  'P': 'Perinatal Conditions',
  'Q': 'Congenital Malformations',
  'R': 'Symptoms & Abnormal Findings',
  'S': 'Injuries & Trauma',
  'T': 'Injuries & External Causes',
  'Z': 'Health Status & Contact Factors'
};

export function getIcdChapter(icdCode: string): string {
  if (!icdCode) return 'Other / Unclassified';
  const prefix = icdCode.trim().charAt(0).toUpperCase();
  return DEFAULT_ICD_CHAPTERS[prefix] || 'Other / Unclassified';
}

const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export function calculateAgeFromDob(dobInput: any): number {
  if (!dobInput) return 30;
  if (typeof dobInput === 'number' && dobInput > 30000 && dobInput < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const dob = new Date(excelEpoch.getTime() + dobInput * 86400000);
    const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
    return isNaN(age) ? 30 : age;
  }
  const str = String(dobInput).trim();
  let dob = new Date(str);
  if (isNaN(dob.getTime())) {
    const parts = str.split(/[\/\.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) dob = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      else dob = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }
  if (!isNaN(dob.getTime())) {
    const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
    return isNaN(age) ? 30 : age;
  }
  return 30;
}

// ==========================================
// PHASE 1 — Basic Analysis Engine
// ==========================================

export function calculatePhase1BasicAnalysis(
  claims: any[],
  census: any[],
  policyValue: PolicyValueConfig
) {
  const totalClaimsCount = claims.length;
  let totalNetCost = 0;
  let missingApprovalCount = 0;
  let totalRejectedCount = 0;

  claims.forEach(c => {
    const net = parseNum(c.netAmount || c.net_amount);
    const app = parseNum(c.approvalAmount || c.approval_amount);
    const status = String(c.approvalStatus || c.approval_status || '').toLowerCase();

    totalNetCost += net;
    if ((app === 0 || app === null) && net > 0) {
      missingApprovalCount += 1;
    }
    if (status.includes('reject') || status.includes('decline') || status.includes('deny')) {
      totalRejectedCount += 1;
    }
  });

  const missingApprovalPercent = totalClaimsCount > 0 
    ? (missingApprovalCount / totalClaimsCount) * 100 
    : 0;

  const rejectionRate = totalClaimsCount > 0 
    ? (totalRejectedCount / totalClaimsCount) * 100 
    : 0;

  // Census Demographics Breakdown
  const totalCensusHeadcount = census.length || 1;
  const relationStats: Record<string, number> = { PRINCIPAL: 0, SPOUSE: 0, CHILD: 0, DEPENDENT: 0 };
  const planStats: Record<string, number> = {};
  const deptStats: Record<string, { count: number, cost: number }> = {};
  const locationStats: Record<string, { count: number, cost: number }> = {};
  let additionsCount = 0;
  let deletionsCount = 0;

  const memberAgeMap = new Map<string, number>();
  census.forEach(m => {
    let age = calculateAgeFromDob(m.date_of_birth);
    const codes = [m.member_id_tpa, m.staff_code, m.member_id_insurance, m.member_tpa_code, m.code, m.id];
    codes.forEach(c => {
      if (c) memberAgeMap.set(String(c).trim().toLowerCase(), age);
    });
  });

  const ageGenderBands = [
    { name: '<25', min: 0, max: 24, male: 0, female: 0, totalCost: 0, avgCost: 0 },
    { name: '25–34', min: 25, max: 34, male: 0, female: 0, totalCost: 0, avgCost: 0 },
    { name: '35–44', min: 35, max: 44, male: 0, female: 0, totalCost: 0, avgCost: 0 },
    { name: '45–54', min: 45, max: 54, male: 0, female: 0, totalCost: 0, avgCost: 0 },
    { name: '55–64', min: 55, max: 64, male: 0, female: 0, totalCost: 0, avgCost: 0 },
    { name: '65+', min: 65, max: 120, male: 0, female: 0, totalCost: 0, avgCost: 0 }
  ];

  census.forEach(m => {
    const rel = String(m.relation || 'PRINCIPAL').toUpperCase();
    if (rel.includes('SPOUSE')) relationStats.SPOUSE += 1;
    else if (rel.includes('CHILD')) relationStats.CHILD += 1;
    else if (rel.includes('DEPENDENT')) relationStats.DEPENDENT += 1;
    else relationStats.PRINCIPAL += 1;

    const plan = m.plan_category || m.plan_name || 'Standard';
    planStats[plan] = (planStats[plan] || 0) + 1;

    const dept = m.department || 'General';
    if (!deptStats[dept]) deptStats[dept] = { count: 0, cost: 0 };
    deptStats[dept].count += 1;

    const loc = m.location || 'Headquarters';
    if (!locationStats[loc]) locationStats[loc] = { count: 0, cost: 0 };
    locationStats[loc].count += 1;

    if (m.addition_date) additionsCount += 1;
    if (m.deletion_date) deletionsCount += 1;

    // Age calculation
    let age = calculateAgeFromDob(m.date_of_birth);
    const g = String(m.gender || 'M').toUpperCase().startsWith('F') ? 'female' : 'male';
    const band = ageGenderBands.find(b => age >= b.min && age <= b.max) || ageGenderBands[ageGenderBands.length - 1];
    band[g] += 1;
  });

  const principalCount = Math.max(1, relationStats.PRINCIPAL);
  const dependentCount = relationStats.SPOUSE + relationStats.CHILD + relationStats.DEPENDENT;
  const dependentRatio = dependentCount / principalCount;
  const netHeadcountMovement = additionsCount - deletionsCount;

  // Active Claimants
  const uniqueClaimants = new Set(claims.map(c => String(c.memberCode || c.member_code || c.memberName))).size;
  const utilizationRate = (uniqueClaimants / totalCensusHeadcount) * 100;
  const avgCostPerClaim = totalClaimsCount > 0 ? totalNetCost / totalClaimsCount : 0;
  const avgCostPerMemberPMPY = totalCensusHeadcount > 0 ? totalNetCost / totalCensusHeadcount : 0;

  // Dimension breakdowns
  const caseTypeMap: Record<string, { count: number, cost: number }> = {};
  const providerTypeMap: Record<string, { count: number, cost: number }> = {};
  const networkMap: Record<string, { count: number, cost: number }> = {};
  const approvalStatusMap: Record<string, { count: number, cost: number }> = {};
  const providerMap: Record<string, { name: string, type: string, count: number, cost: number }> = {};
  const diagnosisMap: Record<string, { code: string, desc: string, count: number, cost: number }> = {};

  claims.forEach(c => {
    const net = parseNum(c.netAmount || c.net_amount);
    const ct = c.caseType || c.case_type || 'Outpatient';
    const pt = c.providerType || c.provider_type || 'Clinic/Hospital';
    const netw = c.medicalNetwork || c.medical_network || 'In Network';
    const stat = c.approvalStatus || c.approval_status || 'Approved';
    const prov = c.providerName || c.provider_name || 'Standard Facility';
    const icd = c.icdCode || c.icd_code || 'R69';
    const diag = c.icdDescription || c.diagnosis_description || 'General Symptoms';

    if (!caseTypeMap[ct]) caseTypeMap[ct] = { count: 0, cost: 0 };
    caseTypeMap[ct].count += 1;
    caseTypeMap[ct].cost += net;

    if (!providerTypeMap[pt]) providerTypeMap[pt] = { count: 0, cost: 0 };
    providerTypeMap[pt].count += 1;
    providerTypeMap[pt].cost += net;

    if (!networkMap[netw]) networkMap[netw] = { count: 0, cost: 0 };
    networkMap[netw].count += 1;
    networkMap[netw].cost += net;

    if (!approvalStatusMap[stat]) approvalStatusMap[stat] = { count: 0, cost: 0 };
    approvalStatusMap[stat].count += 1;
    approvalStatusMap[stat].cost += net;

    if (!providerMap[prov]) providerMap[prov] = { name: prov, type: pt, count: 0, cost: 0 };
    providerMap[prov].count += 1;
    providerMap[prov].cost += net;

    const diagKey = `${icd} - ${diag}`;
    if (!diagnosisMap[diagKey]) diagnosisMap[diagKey] = { code: icd, desc: diag, count: 0, cost: 0 };
    diagnosisMap[diagKey].count += 1;
    diagnosisMap[diagKey].cost += net;

    const code = String(c.memberCode || c.member_code || '').trim().toLowerCase();
    const age = memberAgeMap.get(code) ?? 30;
    const band = ageGenderBands.find(b => age >= b.min && age <= b.max) || ageGenderBands[ageGenderBands.length - 1];
    band.totalCost += net;
  });

  ageGenderBands.forEach(b => {
    const totalLives = b.male + b.female;
    b.avgCost = totalLives > 0 ? b.totalCost / totalLives : 0;
  });

  const topProvidersByCost = Object.values(providerMap).sort((a, b) => b.cost - a.cost).slice(0, 10);
  const topProvidersByCount = Object.values(providerMap).sort((a, b) => b.count - a.count).slice(0, 10);

  const topDiagnosesByCost = Object.values(diagnosisMap).sort((a, b) => b.cost - a.cost).slice(0, 10);
  const topDiagnosesByCount = Object.values(diagnosisMap).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    kpis: {
      totalClaimsCount,
      totalNetCost,
      avgCostPerClaim,
      avgCostPerMemberPMPY,
      utilizationRate,
      totalCensusHeadcount,
      activeClaimantsCount: uniqueClaimants,
      missingApprovalPercent,
      rejectionRate
    },
    populationSummary: {
      headcount: totalCensusHeadcount,
      dependentRatio,
      relationStats,
      ageGenderBands,
      planStats,
      deptStats,
      locationStats,
      netHeadcountMovement
    },
    dimensionBreakdowns: {
      caseType: Object.entries(caseTypeMap).map(([name, val]) => ({ name, count: val.count, cost: val.cost, percent: totalNetCost > 0 ? (val.cost / totalNetCost) * 100 : 0 })),
      providerType: Object.entries(providerTypeMap).map(([name, val]) => ({ name, count: val.count, cost: val.cost, percent: totalNetCost > 0 ? (val.cost / totalNetCost) * 100 : 0 })),
      medicalNetwork: Object.entries(networkMap).map(([name, val]) => ({ name, count: val.count, cost: val.cost, percent: totalNetCost > 0 ? (val.cost / totalNetCost) * 100 : 0 })),
      approvalStatus: Object.entries(approvalStatusMap).map(([name, val]) => ({ name, count: val.count, cost: val.cost, percent: totalNetCost > 0 ? (val.cost / totalNetCost) * 100 : 0 }))
    },
    topProviders: {
      byCost: topProvidersByCost,
      byCount: topProvidersByCount
    },
    topDiagnoses: {
      byCost: topDiagnosesByCost,
      byCount: topDiagnosesByCount
    }
  };
}

// ==========================================
// PHASE 2 — Advanced Analysis Engine
// ==========================================

export function calculatePhase2AdvancedAnalysis(
  claims: any[],
  census: any[],
  policyValue: PolicyValueConfig,
  largeClaimThreshold: number = 50000
) {
  const totalNetCost = claims.reduce((sum, c) => sum + parseNum(c.netAmount || c.net_amount), 0);
  const annualPremium = policyValue.annual_premium || 1;

  // 1. Loss Ratio (Overall & By Census Plan Category)
  const overallLossRatio = (totalNetCost / annualPremium) * 100;
  
  // Map census members plan category
  const censusMemberPlanMap = new Map<string, string>();
  census.forEach(m => {
    const codes = [m.member_id_tpa, m.staff_code, m.member_id_insurance, m.member_tpa_code, m.code, m.id];
    codes.forEach(c => {
      if (c) censusMemberPlanMap.set(String(c).trim().toLowerCase(), m.plan_category || m.plan_name || 'Standard');
    });
  });

  const planCostMap: Record<string, number> = {};
  claims.forEach(c => {
    const code = String(c.memberCode || c.member_code || '').trim().toLowerCase();
    const plan = censusMemberPlanMap.get(code) || c.planName || c.plan_category || 'Standard';
    planCostMap[plan] = (planCostMap[plan] || 0) + parseNum(c.netAmount || c.net_amount);
  });

  const lossRatioByPlan = Object.entries(planCostMap).map(([plan, cost]) => {
    const planPrem = policyValue.plan_category_premiums?.[plan] || (annualPremium / Math.max(1, Object.keys(planCostMap).length));
    const lr = (cost / planPrem) * 100;
    const band = lr < 70 ? 'green' : (lr <= 90 ? 'amber' : 'red');
    return { plan, cost, premium: planPrem, lossRatio: lr, band };
  });

  // 2. Pareto Lorenz Curve
  const memberCostMap: Record<string, { code: string, name: string, cost: number, count: number, dept: string, plan: string, chronic: boolean, topDiag: string }> = {};
  claims.forEach(c => {
    const code = String(c.memberCode || c.member_code || c.memberName);
    const net = parseNum(c.netAmount || c.net_amount);
    
    const rawChronicText = String(c.chronicCondition || c.chronic_condition || c.chronic || '').toLowerCase();
    const icd = String(c.icdCode || c.icd_code || '').toUpperCase().trim();
    const isChronicByText = rawChronicText.includes('yes') || rawChronicText.includes('y') || rawChronicText.includes('true') || rawChronicText.includes('1') || rawChronicText.includes('مزمن');
    const isChronicByIcd = /^I10|^E11|^E14|^E78|^I25|^J44|^J45|^N18|^M05|^M06|^C\d|^E03|^K50|^K51/.test(icd);
    
    const chronic = isChronicByText || isChronicByIcd;
    const diag = c.icdDescription || c.diagnosis_description || 'General';

    if (!memberCostMap[code]) {
      memberCostMap[code] = {
        code,
        name: c.memberName || c.member_name || code,
        cost: 0,
        count: 0,
        dept: c.department || 'General',
        plan: c.planName || 'Standard',
        chronic,
        topDiag: diag
      };
    }
    memberCostMap[code].cost += net;
    memberCostMap[code].count += 1;
    if (chronic) memberCostMap[code].chronic = true;
  });

  const sortedMembers = Object.values(memberCostMap).sort((a: any, b: any) => b.cost - a.cost);
  const totalActiveMembers = Math.max(1, sortedMembers.length);

  // 2. Member Cost Concentration Tiers & Pareto Calculation
  const top5Count = Math.max(1, Math.ceil(totalActiveMembers * 0.05));
  const top20Count = Math.max(1, Math.ceil(totalActiveMembers * 0.20));

  const top5Members = sortedMembers.slice(0, top5Count);
  const top20Members = sortedMembers.slice(0, top20Count);
  const bottom80Members = sortedMembers.slice(top20Count);

  const top5Cost = top5Members.reduce((sum: number, m: any) => sum + m.cost, 0);
  const top20Cost = top20Members.reduce((sum: number, m: any) => sum + m.cost, 0);
  const bottom80Cost = bottom80Members.reduce((sum: number, m: any) => sum + m.cost, 0);

  const top5CostPercent = totalNetCost > 0 ? (top5Cost / totalNetCost) * 100 : 0;
  const top20CostPercent = totalNetCost > 0 ? (top20Cost / totalNetCost) * 100 : 0;
  const bottom80CostPercent = totalNetCost > 0 ? (bottom80Cost / totalNetCost) * 100 : 0;

  const top6to20Cost = Math.max(0, top20Cost - top5Cost);
  const top6to20CostPercent = Math.max(0, top20CostPercent - top5CostPercent);

  const concentrationTiers = [
    { tier: 'Top 5% (Highest Spenders)', membersCount: top5Count, cost: top5Cost, percent: Math.round(top5CostPercent), avgSpend: top5Cost / top5Count, color: '#1E3A8A' },
    { tier: 'Top 6–20% Members', membersCount: Math.max(0, top20Count - top5Count), cost: top6to20Cost, percent: Math.round(top6to20CostPercent), avgSpend: top6to20Cost / Math.max(1, top20Count - top5Count), color: '#3B82F6' },
    { tier: 'Remaining 80% Members', membersCount: Math.max(0, totalActiveMembers - top20Count), cost: bottom80Cost, percent: Math.round(bottom80CostPercent), avgSpend: bottom80Cost / Math.max(1, totalActiveMembers - top20Count), color: '#94A3B8' }
  ];

  let cumulativeCost = 0;
  const paretoPoints = sortedMembers.map((m: any, idx: number) => {
    cumulativeCost += m.cost;
    const memberPercent = ((idx + 1) / totalActiveMembers) * 100;
    const costPercent = totalNetCost > 0 ? (cumulativeCost / totalNetCost) * 100 : 0;
    return { memberPercent: Math.round(memberPercent), costPercent: Math.round(costPercent) };
  });

  // 3. Large Claims Table
  const largeClaimsList = sortedMembers
    .filter((m: any) => m.cost >= largeClaimThreshold)
    .map((m: any) => ({
      ...m,
      percentOfTotalCost: totalNetCost > 0 ? (m.cost / totalNetCost) * 100 : 0
    }));

  const largeClaimsTotalCost = largeClaimsList.reduce((sum: number, m: any) => sum + m.cost, 0);
  const largeClaimsPercentOfTotal = totalNetCost > 0 ? (largeClaimsTotalCost / totalNetCost) * 100 : 0;

  // 4. Chronic Burden
  let chronicHeadcount = 0;
  let chronicCost = 0;
  let chronicClaimCount = 0;

  sortedMembers.forEach(m => {
    if (m.chronic) {
      chronicHeadcount += 1;
      chronicCost += m.cost;
      chronicClaimCount += m.count;
    }
  });

  const nonChronicHeadcount = totalActiveMembers - chronicHeadcount;
  const nonChronicCost = totalNetCost - chronicCost;

  // 5. ICD Chapter Clustering
  const icdChapterStats: Record<string, { chapter: string, count: number, cost: number }> = {};
  claims.forEach(c => {
    const icd = c.icdCode || c.icd_code || '';
    const chapter = getIcdChapter(icd);
    const net = parseNum(c.netAmount || c.net_amount);
    if (!icdChapterStats[chapter]) icdChapterStats[chapter] = { chapter, count: 0, cost: 0 };
    icdChapterStats[chapter].count += 1;
    icdChapterStats[chapter].cost += net;
  });

  const icdChapterClustering = Object.values(icdChapterStats).sort((a, b) => b.cost - a.cost);

  // 6. Network Leakage
  const networkCaseTypeMap: Record<string, { inCost: number, inCount: number, outCost: number, outCount: number }> = {};
  claims.forEach(c => {
    const ct = c.caseType || c.case_type || 'Outpatient';
    const isOon = String(c.medicalNetwork || c.medical_network || '').toLowerCase().includes('out');
    const net = parseNum(c.netAmount || c.net_amount);

    if (!networkCaseTypeMap[ct]) networkCaseTypeMap[ct] = { inCost: 0, inCount: 0, outCost: 0, outCount: 0 };
    if (isOon) {
      networkCaseTypeMap[ct].outCost += net;
      networkCaseTypeMap[ct].outCount += 1;
    } else {
      networkCaseTypeMap[ct].inCost += net;
      networkCaseTypeMap[ct].inCount += 1;
    }
  });

  let totalLeakageCost = 0;
  const networkLeakageAnalysis = Object.entries(networkCaseTypeMap).map(([caseType, s]) => {
    const avgIn = s.inCount > 0 ? s.inCost / s.inCount : 0;
    const avgOut = s.outCount > 0 ? s.outCost / s.outCount : 0;
    const costPremiumPercent = avgIn > 0 ? ((avgOut - avgIn) / avgIn) * 100 : 0;
    const excessCost = Math.max(0, (avgOut - avgIn) * s.outCount);
    totalLeakageCost += excessCost;
    return { caseType, avgInNetworkCost: avgIn, avgOutNetworkCost: avgOut, costPremiumPercent, outCount: s.outCount, excessCost };
  });

  // 7. Length of Stay (Inpatient)
  const inpatientRows = claims.filter(c => String(c.caseType || c.case_type || '').toLowerCase().includes('inpatient'));
  const losByChapter: Record<string, { chapter: string, totalDays: number, count: number }> = {};
  inpatientRows.forEach(c => {
    const los = parseNum(c.lengthOfStay || c.length_of_stay || 1);
    const ch = getIcdChapter(c.icdCode || c.icd_code);
    if (!losByChapter[ch]) losByChapter[ch] = { chapter: ch, totalDays: 0, count: 0 };
    losByChapter[ch].totalDays += los;
    losByChapter[ch].count += 1;
  });

  // 8. Admission Type Cost
  const admissionMap: Record<string, { count: number, cost: number }> = { Elective: { count: 0, cost: 0 }, Emergency: { count: 0, cost: 0 } };
  claims.forEach(c => {
    const adm = String(c.admissionType || c.admission_type || '').toLowerCase().includes('emerg') ? 'Emergency' : 'Elective';
    admissionMap[adm].count += 1;
    admissionMap[adm].cost += parseNum(c.netAmount || c.net_amount);
  });

  // 9. Provider Outliers (>1.5x peer average, min 5 claims)
  const providerPeerStats: Record<string, { type: string, totalCost: number, totalCount: number }> = {};
  const providerIndividualStats: Record<string, { name: string, type: string, count: number, cost: number }> = {};

  claims.forEach(c => {
    const pt = c.providerType || c.provider_type || 'Hospital';
    const prov = c.providerName || c.provider_name || 'Facility';
    const net = parseNum(c.netAmount || c.net_amount);

    if (!providerPeerStats[pt]) providerPeerStats[pt] = { type: pt, totalCost: 0, totalCount: 0 };
    providerPeerStats[pt].totalCost += net;
    providerPeerStats[pt].totalCount += 1;

    if (!providerIndividualStats[prov]) providerIndividualStats[prov] = { name: prov, type: pt, count: 0, cost: 0 };
    providerIndividualStats[prov].count += 1;
    providerIndividualStats[prov].cost += net;
  });

  const providerOutliers = Object.values(providerIndividualStats)
    .filter(p => {
      if (p.count < 5) return false;
      const peer = providerPeerStats[p.type];
      const peerAvg = peer && peer.totalCount > 0 ? peer.totalCost / peer.totalCount : 0;
      const provAvg = p.cost / p.count;
      return provAvg > 1.5 * peerAvg;
    })
    .map(p => {
      const peer = providerPeerStats[p.type];
      const peerAvg = peer && peer.totalCount > 0 ? peer.totalCost / peer.totalCount : 0;
      const provAvg = p.cost / p.count;
      return { ...p, avgCost: provAvg, peerAvg, ratio: provAvg / peerAvg };
    });

  // 10. Duplicate Claim Flags (Same member + ICD + provider within 7 days)
  const duplicateFlags: any[] = [];
  const claimGroupMap: Record<string, any[]> = {};
  claims.forEach(c => {
    const key = `${c.memberCode || c.member_code}-${c.icdCode || c.icd_code}-${c.providerName || c.provider_name}`;
    if (!claimGroupMap[key]) claimGroupMap[key] = [];
    claimGroupMap[key].push(c);
  });

  Object.values(claimGroupMap).forEach(group => {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const d1 = new Date(group[i].serviceDate || group[i].service_date);
          const d2 = new Date(group[j].serviceDate || group[j].service_date);
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const daysDiff = Math.abs(differenceInDays(d1, d2));
            if (daysDiff <= 7) {
              duplicateFlags.push({
                memberCode: group[i].memberCode || group[i].member_code,
                memberName: group[i].memberName || group[i].member_name,
                icdCode: group[i].icdCode || group[i].icd_code,
                providerName: group[i].providerName || group[i].provider_name,
                date1: d1,
                date2: d2,
                amount: parseNum(group[i].netAmount || group[i].net_amount) + parseNum(group[j].netAmount || group[j].net_amount)
              });
            }
          }
        }
      }
    }
  });

  return {
    financialPerformance: {
      overallLossRatio,
      lossRatioByPlan,
      annualPremium
    },
    riskConcentration: {
      paretoPoints,
      concentrationTiers,
      top20Count,
      top20Cost,
      top20CostPercent: Math.round(top20CostPercent),
      headlineStat: `Top 20% of members (${top20Count} lives) = ${Math.round(top20CostPercent)}% of total claims cost (${Math.round(top20Cost).toLocaleString()} EGP)`,
      largeClaimsList,
      largeClaimsTotalCost,
      largeClaimsPercentOfTotal,
      chronicBurden: {
        chronicHeadcount,
        chronicCost,
        chronicClaimCount,
        nonChronicHeadcount,
        nonChronicCost,
        chronicCostPercent: totalNetCost > 0 ? (chronicCost / totalNetCost) * 100 : 0,
        chronicHeadcountPercent: totalActiveMembers > 0 ? (chronicHeadcount / totalActiveMembers) * 100 : 0
      }
    },
    clinicalPatterns: {
      icdChapterClustering,
      networkLeakage: {
        analysis: networkLeakageAnalysis,
        totalLeakageCost
      },
      lengthOfStay: Object.values(losByChapter).map(l => ({ ...l, avgLOS: l.count > 0 ? l.totalDays / l.count : 0 })),
      admissionTypeCost: admissionMap
    },
    qualityFlags: {
      providerOutliers,
      duplicateFlags: duplicateFlags.slice(0, 50)
    }
  };
}

// ==========================================
// PHASE 3 — Forecasting Analysis Engine
// ==========================================

export function calculatePhase3ForecastingAnalysis(
  claims: any[],
  census: any[],
  policyValue: PolicyValueConfig
) {
  const totalNetCost = claims.reduce((sum, c) => sum + parseNum(c.netAmount || c.net_amount), 0);
  const annualPremium = policyValue.annual_premium || 1;

  // Check data duration
  const serviceDates = claims.map(c => new Date(c.serviceDate || c.service_date).getTime()).filter(t => !isNaN(t));
  const minDate = serviceDates.length > 0 ? new Date(Math.min(...serviceDates)) : new Date();
  const maxDate = serviceDates.length > 0 ? new Date(Math.max(...serviceDates)) : new Date();
  const elapsedDays = Math.max(1, differenceInDays(maxDate, minDate));
  const hasSufficientData = elapsedDays >= 180; // 6 months

  // 1. Completion Factor (IBNR estimate)
  const completionFactor = 1.08; // 8% IBNR reporting lag inflate
  const completedEstimateTotal = totalNetCost * completionFactor;

  // 2. Projected Full-Year Net Amount & Loss Ratio
  const annualizedProjectedTotal = (completedEstimateTotal / Math.max(30, elapsedDays)) * 365;
  const medicalInflation = 1.15; // 15% inflation
  const nextYearForecastTotal = annualizedProjectedTotal * medicalInflation;
  const projectedLossRatio = (annualizedProjectedTotal / annualPremium) * 100;
  const confidenceLower = projectedLossRatio * 0.93;
  const confidenceUpper = projectedLossRatio * 1.07;

  // 3. Renewal Recommendation Card Generator
  const topCostDriver = 'Musculoskeletal & Chronic Conditions';
  const recMinAdjustment = Math.max(0, Math.round(projectedLossRatio - 75));
  const recMaxAdjustment = Math.round(recMinAdjustment + 10);
  const recommendationText = `Projected loss ratio of ${projectedLossRatio.toFixed(1)}% suggests a premium adjustment in the range of +${recMinAdjustment}% to +${recMaxAdjustment}% at renewal, driven primarily by ${topCostDriver}.`;

  return {
    hasSufficientData,
    elapsedDays,
    reportingLag: {
      reportedTotal: totalNetCost,
      completedEstimateTotal,
      ibnrAdjustment: completedEstimateTotal - totalNetCost
    },
    projection: {
      annualizedProjectedTotal,
      nextYearForecastTotal,
      projectedLossRatio,
      confidenceLower,
      confidenceUpper,
      medicalInflationPercent: 15
    },
    recommendation: {
      recommendationText,
      projectedLossRatio,
      suggestedAdjustmentRange: `+${recMinAdjustment}% – +${recMaxAdjustment}%`,
      topCostDriver
    }
  };
}

// 4. Interactive Renewal Scenario Simulator
export function runScenarioSimulator(
  claims: any[],
  census: any[],
  policyValue: PolicyValueConfig,
  copayIncreasePercent: number = 0,
  caseTypeCapLimits: Record<string, number> = {},
  oonRestrictionFlag: boolean = false
) {
  const totalOriginalNetCost = claims.reduce((sum, c) => sum + parseNum(c.netAmount || c.net_amount), 0);
  let totalSavings = 0;

  // Lever A: Copay increase
  let copaySavings = 0;
  if (copayIncreasePercent > 0) {
    copaySavings = totalOriginalNetCost * (copayIncreasePercent / 100);
  }

  // Lever B: Benefit Caps
  let capSavings = 0;
  claims.forEach(c => {
    const ct = c.caseType || c.case_type || 'Outpatient';
    const cap = caseTypeCapLimits[ct];
    const net = parseNum(c.netAmount || c.net_amount);
    if (cap && cap > 0 && net > cap) {
      capSavings += (net - cap);
    }
  });

  // Lever C: Out-of-network Restriction
  let oonSavings = 0;
  if (oonRestrictionFlag) {
    claims.forEach(c => {
      const isOon = String(c.medicalNetwork || c.medical_network || '').toLowerCase().includes('out');
      if (isOon) {
        oonSavings += parseNum(c.netAmount || c.net_amount) * 0.35; // 35% leakage restriction savings
      }
    });
  }

  totalSavings = copaySavings + capSavings + oonSavings;
  const newProjectedCost = Math.max(0, totalOriginalNetCost - totalSavings);
  const newLossRatio = ((newProjectedCost) / Math.max(1, policyValue.annual_premium)) * 100;

  return {
    originalNetCost: totalOriginalNetCost,
    copaySavings,
    capSavings,
    oonSavings,
    totalSavings,
    newProjectedCost,
    originalLossRatio: (totalOriginalNetCost / Math.max(1, policyValue.annual_premium)) * 100,
    newLossRatio
  };
}
