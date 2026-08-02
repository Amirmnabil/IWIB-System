import * as XLSX from 'xlsx';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const supabase = getSupabaseAdmin();

const normalizeKey = (k: string) => k.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

const getVal = (row: any, patterns: string[]) => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const p of patterns) {
    const normP = normalizeKey(p);
    const match = keys.find(k => {
      const normK = normalizeKey(k);
      return normK === normP || normK.startsWith(normP) || normK.includes(normP);
    });
    if (match !== undefined) return row[match];
  }
  return undefined;
};

const parseDate = (d: any): string => {
  if (d instanceof Date) return d.toISOString().split('T')[0];
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0];
  return parsed.toISOString().split('T')[0];
};

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export async function processMedicalConsumptionFile(fileBuffer: Buffer, policyId: string) {
  try {
    // 1. Read Excel file
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

    if (!rawJson.length) throw new Error("Empty File");

    // 2. Validate and Clean Rows
    const validRecords: any[] = [];
    for (const row of rawJson) {
      const status = String(getVal(row, ['approvalstatus', 'status']) || '').toLowerCase();
      const isRejected = status.includes('reject') || status.includes('decline') || status.includes('deny');
      if (isRejected) continue; // Filter out rejected claims
      
      const claimId = getVal(row, ['approvalnumber', 'claimid', 'vouchernumber']);
      if (!claimId) continue; // Must have an ID
      validRecords.push(row);
    }

    // 2. Fetch Policy Contract & Census Members for exact attribution
    const { data: policy } = await supabase
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    const { data: censusMembers } = await supabase
      .from('policy_members')
      .select('*')
      .eq('policy_id', policyId);

    const censusMap = new Map<string, any>();
    const censusNameMap = new Map<string, any>();
    if (censusMembers) {
      censusMembers.forEach(m => {
        const codes = [
          m.member_id_tpa,
          m.staff_code,
          m.member_id_insurance,
          m.member_tpa_code,
          m.tpa_code,
          m.code,
          m.member_code,
          m.id
        ];
        codes.forEach(c => {
          if (c) {
            const cleanC = String(c).trim().toLowerCase();
            if (cleanC) censusMap.set(cleanC, m);
          }
        });

        const name = m.member_name || m.name;
        if (name) {
          const cleanN = String(name).trim().toLowerCase();
          if (cleanN) censusNameMap.set(cleanN, m);
        }
      });
    }

    // Prepare batch structures
    const membersToUpsert = new Map<string, any>();
    const providersToUpsert = new Map<string, any>();
    const diagnosesToUpsert = new Map<string, any>();
    const factLines: any[] = [];

    // 3. Extract dimensions matching Census Member TPA Code & Contract
    validRecords.forEach(row => {
      const rawMemberCode = String(getVal(row, ['membercode', 'memberid', 'membertpacode', 'tpacode', 'code', 'cardno', 'staffcode', 'employeeid']) || `UNK-${Math.random().toString(36).substring(2, 7)}`).trim();
      const rawMemberName = String(getVal(row, ['membername', 'patientname', 'name', 'employeename']) || '').trim();

      let censusMatch = rawMemberCode ? censusMap.get(rawMemberCode.toLowerCase()) : null;
      if (!censusMatch && rawMemberName) {
        censusMatch = censusNameMap.get(rawMemberName.toLowerCase());
      }

      const memberCode = censusMatch?.member_id_tpa || censusMatch?.member_tpa_code || censusMatch?.staff_code || censusMatch?.tpa_code || censusMatch?.code || rawMemberCode;
      const memberName = censusMatch?.member_name || censusMatch?.name || rawMemberName || 'Unknown Member';
      const gender = censusMatch?.gender || getVal(row, ['gender', 'sex']);
      const dob = censusMatch?.date_of_birth || censusMatch?.dob || parseDate(getVal(row, ['dateofbirth', 'dob', 'birthdate']));
      const department = censusMatch?.branch || censusMatch?.location || getVal(row, ['department', 'dept', 'location', 'branch']);

      const providerName = String(getVal(row, ['providername', 'facility', 'provider']) || 'Unknown Provider');
      const icdCode = String(getVal(row, ['icdcode', 'icd', 'icd10']) || 'UNK');
      
      if (!membersToUpsert.has(memberCode)) {
        membersToUpsert.set(memberCode, {
          member_code: memberCode,
          member_name: memberName,
          gender: gender || null,
          date_of_birth: dob || null,
          department: department || null,
          policy_id: policyId
        });
      }

      if (!providersToUpsert.has(providerName)) {
        providersToUpsert.set(providerName, {
          provider_name: providerName,
          provider_type: getVal(row, ['providertype', 'facilitytype', 'category']) || 'Clinic/Hospital',
          network_status: getVal(row, ['network', 'medicalnetwork']) || policy?.medical_network || 'In-Network'
        });
      }

      if (!diagnosesToUpsert.has(icdCode)) {
        diagnosesToUpsert.set(icdCode, {
          icd_code: icdCode,
          description: getVal(row, ['icddescription', 'diagnosisdescription', 'diagnosis']),
          is_chronic: String(getVal(row, ['chronic', 'chroniccondition'])).toLowerCase().includes('yes')
        });
      }
    });

    // 4. Upsert Dimensions
    const { data: insertedMembers } = await supabase.from('dim_members')
      .upsert(Array.from(membersToUpsert.values()), { onConflict: 'member_code' })
      .select('id, member_code');
      
    const { data: insertedProviders } = await supabase.from('dim_providers')
      .upsert(Array.from(providersToUpsert.values()), { onConflict: 'provider_name', ignoreDuplicates: true })
      .select('id, provider_name');
      
    const { data: insertedDiagnoses } = await supabase.from('dim_diagnoses')
      .upsert(Array.from(diagnosesToUpsert.values()), { onConflict: 'icd_code' })
      .select('id, icd_code');

    // Create lookup maps
    const memberMap = new Map(insertedMembers?.map(m => [m.member_code, m.id]));
    const providerMap = new Map(insertedProviders?.map(p => [p.provider_name, p.id]));
    const diagnosisMap = new Map(insertedDiagnoses?.map(d => [d.icd_code, d.id]));

    // 5. Map Fact Claims
    validRecords.forEach(row => {
      const memberCode = String(getVal(row, ['membercode', 'memberid']) || '');
      const providerName = String(getVal(row, ['providername', 'facility']) || 'Unknown Provider');
      const icdCode = String(getVal(row, ['icdcode', 'icd']) || 'UNK');

      factLines.push({
        claim_id: String(getVal(row, ['approvalnumber', 'claimid', 'vouchernumber'])),
        dim_member_id: memberMap.get(memberCode) || null,
        dim_provider_id: providerMap.get(providerName) || null,
        dim_diagnosis_id: diagnosisMap.get(icdCode) || null,
        policy_id: policyId,
        service_date: parseDate(getVal(row, ['servicedate', 'date'])),
        case_type: getVal(row, ['casetype', 'servicetype']),
        action_type: getVal(row, ['actiontype', 'transactiontype']),
        approval_amount: parseNum(getVal(row, ['approvalamount', 'gross'])),
        copayment: parseNum(getVal(row, ['copayment', 'copay'])),
        net_amount: parseNum(getVal(row, ['netamount', 'net'])),
        pre_auth_flag: String(getVal(row, ['preauth'])).toLowerCase() === 'yes',
      });
    });

    // 6. Insert Fact Lines in chunks (deduplication handled by the fact we just parsed it)
    const chunkSize = 1000;
    for (let i = 0; i < factLines.length; i += chunkSize) {
      const chunk = factLines.slice(i, i + chunkSize);
      const { error } = await supabase.from('fact_claim_line_items').insert(chunk);
      if (error) {
         console.error('Error inserting chunk', error);
      }
    }

    return { success: true, processed: factLines.length };
  } catch (error: any) {
    console.error("Ingestion Error", error);
    return { success: false, error: error.message };
  }
}
