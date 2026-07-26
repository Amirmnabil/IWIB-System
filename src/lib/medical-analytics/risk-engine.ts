import { getSupabaseAdmin } from '@/lib/supabase-admin';

const supabase = getSupabaseAdmin();

export async function runMemberRiskEngine(policyId: string) {
  console.log(`Running Member Risk Engine for Policy: ${policyId}`);

  // 1. Fetch claims and related data
  const { data: claims, error: claimsError } = await supabase
    .from('fact_claim_line_items')
    .select(`
      dim_member_id,
      net_amount,
      dim_diagnoses (is_chronic),
      dim_members!inner (date_of_birth)
    `)
    .eq('policy_id', policyId);

  if (claimsError || !claims) throw new Error('Failed to fetch claims for risk engine');

  // 2. Fetch FWA alerts for behavior penalty
  const { data: alerts, error: alertsError } = await supabase
    .from('fwa_alerts')
    .select('dim_member_id, risk_score')
    // We only want alerts related to this policy, but since fwa_alerts doesn't have policy_id directly,
    // we filter by members in the JS loop.
    .in('status', ['Pending', 'Investigating']); 

  if (alertsError) throw new Error('Failed to fetch alerts for risk engine');

  const memberStats: Record<string, { 
    cost: number, 
    freq: number, 
    chronicCount: number, 
    dob: string,
    fwaPenalty: number,
    chronicDiagnoses: Set<string>
  }> = {};

  let totalPolicyCost = 0;
  const uniqueMembers = new Set<string>();

  claims.forEach((c: any) => {
    const mId = c.dim_member_id;
    if (!mId) return;

    uniqueMembers.add(mId);
    totalPolicyCost += Number(c.net_amount || 0);

    if (!memberStats[mId]) {
      memberStats[mId] = {
        cost: 0,
        freq: 0,
        chronicCount: 0,
        dob: c.dim_members?.date_of_birth || null,
        fwaPenalty: 0,
        chronicDiagnoses: new Set()
      };
    }

    memberStats[mId].cost += Number(c.net_amount || 0);
    memberStats[mId].freq += 1;

    if (c.dim_diagnoses?.is_chronic) {
      memberStats[mId].chronicDiagnoses.add(c.dim_diagnoses.icd_code);
    }
  });

  const avgCostPerMember = uniqueMembers.size > 0 ? totalPolicyCost / uniqueMembers.size : 1;

  // Add behavior penalties from FWA Alerts
  alerts?.forEach((a: any) => {
    const mId = a.dim_member_id;
    if (mId && memberStats[mId]) {
      memberStats[mId].fwaPenalty += Number(a.risk_score || 0);
    }
  });

  const riskScoresToUpsert: any[] = [];

  const calculateAge = (dob: string | null) => {
    if (!dob) return 35; // default fallback
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  Object.entries(memberStats).forEach(([mId, stats]) => {
    // 1. Age Factor (Max 15)
    const age = calculateAge(stats.dob);
    let ageFactor = 0;
    if (age > 65) ageFactor = 15;
    else if (age > 50) ageFactor = 10;
    else if (age > 30) ageFactor = 5;

    // 2. Chronic Factor (Max 30)
    const chronicCount = stats.chronicDiagnoses.size;
    let chronicFactor = 0;
    if (chronicCount >= 2) chronicFactor = 30;
    else if (chronicCount === 1) chronicFactor = 20;

    // 3. Frequency Factor (Max 20)
    let freqFactor = 0;
    if (stats.freq > 10) freqFactor = 20;
    else if (stats.freq > 5) freqFactor = 15;
    else if (stats.freq > 2) freqFactor = 5;

    // 4. Cost Factor (Max 20)
    const costRatio = stats.cost / avgCostPerMember;
    let costFactor = 0;
    if (costRatio > 3.0) costFactor = 20;
    else if (costRatio > 1.5) costFactor = 15;
    else if (costRatio > 0.5) costFactor = 5;

    // 5. Behavior Factor (Max 15)
    let behaviorFactor = Math.min(15, (stats.fwaPenalty / 100) * 15);

    // Total Score
    const totalScore = Math.min(100, Math.round(ageFactor + chronicFactor + freqFactor + costFactor + behaviorFactor));

    // Category
    let category = 'Low';
    if (totalScore >= 81) category = 'Critical';
    else if (totalScore >= 51) category = 'High';
    else if (totalScore >= 21) category = 'Medium';

    riskScoresToUpsert.push({
      dim_member_id: mId,
      risk_score: totalScore,
      risk_category: category,
      age_factor: ageFactor,
      chronic_factor: chronicFactor,
      frequency_factor: freqFactor,
      cost_factor: costFactor,
      behavior_factor: Math.round(behaviorFactor)
    });
  });

  // Batch Upsert
  if (riskScoresToUpsert.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < riskScoresToUpsert.length; i += chunkSize) {
      const chunk = riskScoresToUpsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('member_risk_scores')
        .upsert(chunk, { onConflict: 'dim_member_id' }); // Assuming we added unique constraint or just use insert if fresh
        
      if (error) console.error('Error inserting member risk scores:', error);
    }
  }

  return {
    success: true,
    membersScored: riskScoresToUpsert.length
  };
}
