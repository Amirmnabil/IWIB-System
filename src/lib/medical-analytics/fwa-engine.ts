import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function runFWAEngine(policyId: string) {
  console.log(`Running Fraud, Waste & Abuse (FWA) Engine for Policy: ${policyId}`);
  
  // 1. Fetch all claims for the policy to analyze in memory (for speed in Phase 3 MVP)
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select(`
      id,
      dim_member_id,
      dim_provider_id,
      dim_diagnosis_id,
      service_date,
      net_amount,
      approval_amount
    `)
    .eq('policy_id', policyId)
    .order('service_date');

  if (error || !claims || claims.length === 0) throw new Error('Failed to fetch claims for FWA');

  const alertsToInsert: any[] = [];
  const claimScores: Record<string, number> = {};

  const addAlert = (claimId: string, memberId: string, providerId: string, alertType: string, severity: string, score: number, desc: string) => {
    alertsToInsert.push({
      fact_claim_id: claimId,
      dim_member_id: memberId,
      dim_provider_id: providerId,
      alert_type: alertType,
      severity,
      risk_score: score,
      description: desc,
      status: 'Pending'
    });
    claimScores[claimId] = (claimScores[claimId] || 0) + score;
  };

  // Pre-calculate statistics for dynamic thresholds
  const amounts = claims.map(c => Number(c.net_amount || 0));
  const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDevAmount = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - meanAmount, 2), 0) / amounts.length);
  const highCostThreshold = meanAmount + (3 * stdDevAmount); // Dynamic high-cost outlier threshold

  const memberFrequency: Record<string, number> = {};
  const providerCosts: Record<string, number[]> = {};

  // Rule 1: Duplicate Claims Detection
  const duplicateMap = new Map<string, string[]>();

  claims.forEach((c) => {
    // Collect frequencies
    if (c.dim_member_id) {
      memberFrequency[c.dim_member_id] = (memberFrequency[c.dim_member_id] || 0) + 1;
    }
    
    // Collect provider costs
    if (c.dim_provider_id) {
      if (!providerCosts[c.dim_provider_id]) providerCosts[c.dim_provider_id] = [];
      providerCosts[c.dim_provider_id].push(Number(c.net_amount || 0));
    }

    // Duplicate Key: member + date + provider + amount
    const dupKey = `${c.dim_member_id}_${c.service_date}_${c.dim_provider_id}_${c.net_amount}`;
    if (!duplicateMap.has(dupKey)) duplicateMap.set(dupKey, []);
    duplicateMap.get(dupKey)!.push(c.id);

    // Rule 3: High-Cost Outlier (Dynamic)
    if (Number(c.net_amount) > highCostThreshold && c.net_amount > 0) {
      addAlert(c.id, c.dim_member_id, c.dim_provider_id, 'High-Cost Outlier', 'High', 30, `Amount ${c.net_amount} exceeds dynamic threshold of ${Math.round(highCostThreshold)}`);
    }
  });

  // Process Duplicates
  duplicateMap.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach(id => {
        const c = claims.find(cl => cl.id === id)!;
        addAlert(id, c.dim_member_id, c.dim_provider_id, 'Exact Duplicate Claim', 'Critical', 40, `Identical claim submitted ${ids.length} times`);
      });
    }
  });

  // Rule 2: High Frequency Member Flag (Dynamic: > Mean + 2 StdDev)
  const frequencies = Object.values(memberFrequency);
  const meanFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
  const stdDevFreq = Math.sqrt(frequencies.reduce((a, b) => a + Math.pow(b - meanFreq, 2), 0) / frequencies.length);
  const highFreqThreshold = Math.max(5, meanFreq + (2 * stdDevFreq));

  const highFreqMembers = new Set(Object.entries(memberFrequency).filter(([_, count]) => count > highFreqThreshold).map(([id]) => id));

  // Rule 4: Same diagnosis repeated within short interval (e.g. 3 days)
  const history = new Map<string, Date>();
  claims.forEach((c) => {
    if (!c.dim_member_id || !c.dim_diagnosis_id) return;

    if (highFreqMembers.has(c.dim_member_id)) {
      addAlert(c.id, c.dim_member_id, c.dim_provider_id, 'High Frequency Member', 'Medium', 20, `Member has ${memberFrequency[c.dim_member_id]} claims (threshold ${Math.round(highFreqThreshold)})`);
    }

    const key = `${c.dim_member_id}_${c.dim_diagnosis_id}`;
    const currentDate = new Date(c.service_date);
    
    if (history.has(key)) {
      const lastDate = history.get(key)!;
      const diffDays = (currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > 0 && diffDays <= 3) {
        addAlert(c.id, c.dim_member_id, c.dim_provider_id, 'Short Interval Repeat', 'Medium', 20, `Diagnosis repeated within ${Math.round(diffDays)} days`);
      }
    }
    history.set(key, currentDate);
  });

  // Rule 5: Provider Abnormal Cost vs Network Average
  const providerAverages: Record<string, number> = {};
  Object.entries(providerCosts).forEach(([pid, costs]) => {
    providerAverages[pid] = costs.reduce((a, b) => a + b, 0) / costs.length;
  });
  
  const avgArray = Object.values(providerAverages);
  const meanProvAvg = avgArray.reduce((a, b) => a + b, 0) / avgArray.length;
  const stdDevProvAvg = Math.sqrt(avgArray.reduce((a, b) => a + Math.pow(b - meanProvAvg, 2), 0) / avgArray.length);
  const abnormalProvThreshold = meanProvAvg + (2 * stdDevProvAvg);

  const abnormalProviders = new Set(Object.entries(providerAverages).filter(([_, avg]) => avg > abnormalProvThreshold).map(([id]) => id));

  claims.forEach(c => {
    if (c.dim_provider_id && abnormalProviders.has(c.dim_provider_id)) {
      addAlert(c.id, c.dim_member_id, c.dim_provider_id, 'Abnormal Provider Cost', 'High', 30, `Provider avg cost ${Math.round(providerAverages[c.dim_provider_id])} exceeds network normal ${Math.round(abnormalProvThreshold)}`);
    }
  });

  // Insert Alerts Batch
  if (alertsToInsert.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < alertsToInsert.length; i += chunkSize) {
      const chunk = alertsToInsert.slice(i, i + chunkSize);
      await supabase.from('fwa_alerts').insert(chunk);
    }
  }

  return { 
    success: true, 
    alertsGenerated: alertsToInsert.length,
    highCostThreshold,
    abnormalProvThreshold
  };
}
