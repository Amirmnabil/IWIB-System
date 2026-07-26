import { getSupabaseAdmin } from '@/lib/supabase-admin';

const supabase = getSupabaseAdmin();

// Helper to save results
async function saveEngineResult(policyId: string, engineName: string, data: any) {
  const { error } = await supabase
    .from('medical_analytics_results')
    .upsert({
      policy_id: policyId,
      engine_name: engineName,
      data: data,
      calculated_at: new Date().toISOString()
    }, { onConflict: 'policy_id, engine_name' });
    
  if (error) console.error(`Error saving ${engineName} result:`, error);
}

// 1. Cost & Utilization Engine
export async function runCostAndUtilizationEngine(policyId: string) {
  console.log(`Running Cost & Utilization Engine for Policy: ${policyId}`);
  
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select('net_amount, approval_amount, copayment, dim_member_id, case_type, dim_members (date_of_birth)')
    .eq('policy_id', policyId);

  if (error || !claims) throw new Error('Failed to fetch claims');

  let totalCost = 0;
  let totalCopay = 0;
  const uniqueMembers = new Set<string>();
  const costByCaseType: Record<string, number> = {};

  const bands = [
    { name: '<18', min: 0, max: 17 },
    { name: '18–29', min: 18, max: 29 },
    { name: '30–39', min: 30, max: 39 },
    { name: '40–49', min: 40, max: 49 },
    { name: '50–59', min: 50, max: 59 },
    { name: '60–69', min: 60, max: 69 },
    { name: '70+', min: 70, max: 150 }
  ];
  
  const ageBandStats: Record<string, any> = {};
  bands.forEach(b => ageBandStats[b.name] = { name: b.name, cost: 0, count: 0, members: new Set(), serviceTypes: {} });

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const diff_ms = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff_ms).getUTCFullYear() - 1970);
  };

  claims.forEach((claim: any) => {
    const amt = Number(claim.net_amount || 0);
    totalCost += amt;
    totalCopay += Number(claim.copayment || 0);
    if (claim.dim_member_id) uniqueMembers.add(claim.dim_member_id);
    
    const cType = claim.case_type || 'Unknown';
    costByCaseType[cType] = (costByCaseType[cType] || 0) + amt;

    const dob = claim.dim_members?.date_of_birth;
    const age = calculateAge(dob);
    if (age !== null) {
      const band = bands.find(b => age >= b.min && age <= b.max);
      if (band) {
        const stats = ageBandStats[band.name];
        stats.cost += amt;
        stats.count += 1;
        if (claim.dim_member_id) stats.members.add(claim.dim_member_id);
        stats.serviceTypes[cType] = (stats.serviceTypes[cType] || 0) + amt;
      }
    }
  });

  const activeClaimants = uniqueMembers.size;
  const totalTransactions = claims.length;
  const averageCostPerClaim = totalTransactions > 0 ? totalCost / totalTransactions : 0;
  const averageCostPerMember = activeClaimants > 0 ? totalCost / activeClaimants : 0;

  const ageAnalysis = Object.values(ageBandStats).map(s => ({
    name: s.name,
    cost: s.cost,
    count: s.count,
    uniqueMembers: s.members.size,
    avgCostPerMember: s.members.size > 0 ? s.cost / s.members.size : 0,
    percentOfCost: totalCost > 0 ? (s.cost / totalCost) * 100 : 0
  }));

  const resultData = {
    totalCost,
    totalCopay,
    totalTransactions,
    activeClaimants,
    averageCostPerClaim,
    averageCostPerMember,
    costByCaseType,
    ageAnalysis
  };

  await saveEngineResult(policyId, 'cost_utilization', resultData);
  return resultData;
}

// 2. Episode Grouping Logic (14-day rule)
export async function runEpisodeGroupingEngine(policyId: string) {
  console.log(`Running Episode Grouping Engine for Policy: ${policyId}`);
  
  // Fetch claims sorted by member and service date
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select('id, dim_member_id, dim_diagnosis_id, service_date')
    .eq('policy_id', policyId)
    .order('dim_member_id')
    .order('service_date');

  if (error || !claims) throw new Error('Failed to fetch claims for episodes');

  const updates: { id: string, episode_id: string }[] = [];
  
  // Track last seen diagnosis date per member + diagnosis
  // key: memberId_diagnosisId, value: { date, episodeId }
  const history = new Map<string, { date: Date, episodeId: string }>();

  claims.forEach((claim, index) => {
    if (!claim.dim_member_id || !claim.dim_diagnosis_id) return;
    
    const key = `${claim.dim_member_id}_${claim.dim_diagnosis_id}`;
    const currentDate = new Date(claim.service_date);
    let episodeId = `EP-${claim.dim_member_id.substring(0,8)}-${index}`;

    if (history.has(key)) {
      const lastRec = history.get(key)!;
      const daysDiff = (currentDate.getTime() - lastRec.date.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff <= 14) {
        episodeId = lastRec.episodeId; // Group into same episode
      }
    }

    history.set(key, { date: currentDate, episodeId });
    updates.push({ id: claim.id, episode_id: episodeId });
  });

  // Batch update episode_ids (chunked)
  const chunkSize = 1000;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    // Supabase upsert requires the whole row or just the PK + updated columns
    // We'll update iteratively or via a custom RPC if too slow. 
    // Using upsert with just id and episode_id might not work without other NOT NULL columns,
    // so we'll do an update loop (optimized for backend script)
    await Promise.all(chunk.map(c => 
      supabase.from('fact_claim_line_items').update({ episode_id: c.episode_id }).eq('id', c.id)
    ));
  }

  const resultData = {
    totalProcessed: claims.length,
    totalEpisodesIdentified: new Set(updates.map(u => u.episode_id)).size
  };
  
  await saveEngineResult(policyId, 'episode_grouping', resultData);
  return resultData;
}

// 3. Provider Analytics Engine
export async function runProviderAnalyticsEngine(policyId: string) {
  console.log(`Running Provider Analytics Engine for Policy: ${policyId}`);
  
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select(`
      net_amount,
      dim_provider_id,
      dim_providers (provider_name, provider_type, network_status)
    `)
    .eq('policy_id', policyId);

  if (error || !claims) throw new Error('Failed to fetch provider claims');

  const providerStats: Record<string, any> = {};

  claims.forEach((claim: any) => {
    if (!claim.dim_provider_id || !claim.dim_providers) return;
    const pid = claim.dim_provider_id;
    const pname = claim.dim_providers.provider_name;
    const ptype = claim.dim_providers.provider_type || 'Unknown';
    const network = claim.dim_providers.network_status || 'Unknown';
    
    if (!providerStats[pid]) {
      providerStats[pid] = { name: pname, type: ptype, network, cost: 0, count: 0 };
    }
    providerStats[pid].cost += Number(claim.net_amount || 0);
    providerStats[pid].count += 1;
  });

  const sortedProviders = Object.values(providerStats)
    .sort((a: any, b: any) => b.cost - a.cost)
    .slice(0, 50); // Top 50

  const resultData = { topProviders: sortedProviders };
  await saveEngineResult(policyId, 'provider_analytics', resultData);
  return resultData;
}

// 4. Pharmacy Analytics Engine
export async function runPharmacyAnalyticsEngine(policyId: string) {
  console.log(`Running Pharmacy Analytics Engine for Policy: ${policyId}`);
  
  // Filter claims matching drug action type
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select(`
      net_amount,
      action_type,
      drug_code,
      dim_member_id
    `)
    .eq('policy_id', policyId)
    .ilike('action_type', '%drug%');

  if (error || !claims) throw new Error('Failed to fetch pharmacy claims');

  let totalDrugCost = 0;
  const polypharmacyMap: Record<string, Set<string>> = {};

  claims.forEach((claim: any) => {
    totalDrugCost += Number(claim.net_amount || 0);
    
    const memberId = claim.dim_member_id;
    const drugCode = claim.drug_code || 'Unknown';
    if (memberId) {
      if (!polypharmacyMap[memberId]) polypharmacyMap[memberId] = new Set();
      polypharmacyMap[memberId].add(drugCode);
    }
  });

  // Polypharmacy detection (> 5 distinct drugs)
  let polypharmacyMembersCount = 0;
  Object.values(polypharmacyMap).forEach(drugs => {
    if (drugs.size >= 5) polypharmacyMembersCount++;
  });

  const resultData = {
    totalDrugCost,
    totalPrescriptions: claims.length,
    polypharmacyMembersCount
  };

  await saveEngineResult(policyId, 'pharmacy_analytics', resultData);
  return resultData;
}

// 5. Chronic Disease Engine
export async function runChronicDiseaseEngine(policyId: string) {
  console.log(`Running Chronic Disease Engine for Policy: ${policyId}`);
  
  const { data: claims, error } = await supabase
    .from('fact_claim_line_items')
    .select(`
      net_amount,
      dim_member_id,
      dim_diagnoses!inner (icd_code, description, is_chronic)
    `)
    .eq('policy_id', policyId)
    .eq('dim_diagnoses.is_chronic', true);

  if (error || !claims) throw new Error('Failed to fetch chronic claims');

  let totalChronicCost = 0;
  const uniqueChronicMembers = new Set<string>();
  const chronicDiseaseCost: Record<string, number> = {};

  claims.forEach((claim: any) => {
    totalChronicCost += Number(claim.net_amount || 0);
    if (claim.dim_member_id) uniqueChronicMembers.add(claim.dim_member_id);
    
    const icd = claim.dim_diagnoses.icd_code;
    chronicDiseaseCost[icd] = (chronicDiseaseCost[icd] || 0) + Number(claim.net_amount || 0);
  });

  const resultData = {
    totalChronicCost,
    activeChronicMembers: uniqueChronicMembers.size,
    chronicDiseaseCost
  };

  await saveEngineResult(policyId, 'chronic_disease', resultData);
  return resultData;
}

// Orchestrator
export async function runAllAnalyticsEngines(policyId: string) {
  try {
    console.log(`Starting Phase 2 Core Analytics for policy ${policyId}`);
    
    // Run Episode Grouping first since it modifies fact_claim_line_items
    await runEpisodeGroupingEngine(policyId);
    
    // Run the rest in parallel
    await Promise.all([
      runCostAndUtilizationEngine(policyId),
      runProviderAnalyticsEngine(policyId),
      runPharmacyAnalyticsEngine(policyId),
      runChronicDiseaseEngine(policyId)
    ]);
    
    console.log(`Completed all analytics engines for policy ${policyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error in Core Analytics Orchestrator', err);
    return { success: false, error: err.message };
  }
}
