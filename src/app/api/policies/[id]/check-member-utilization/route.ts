import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as XLSX from 'xlsx';

const parseNum = (val: any) => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Robust helper to check if a row in a utilization spreadsheet matches the member
function matchesMember(row: any, name: string, nationalId: string, staffCode: string, memberIdTpa: string) {
  const keys = Object.keys(row);
  const rowValues = keys.map(k => String(row[k] || '').trim().toLowerCase());

  // Strict matches by codes
  if (nationalId && rowValues.includes(nationalId.trim().toLowerCase())) return true;
  if (staffCode && rowValues.includes(staffCode.trim().toLowerCase())) return true;
  if (memberIdTpa && rowValues.includes(memberIdTpa.trim().toLowerCase())) return true;

  // Pattern check inside row keys
  for (const k of keys) {
    const nk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const val = String(row[k] || '').trim().toLowerCase();

    // ID checks in column values
    if (nk.includes('nationalid') || nk.includes('nid') || nk.includes('nationalno') || nk.includes('nationalnumber')) {
      if (nationalId && val === nationalId.trim().toLowerCase()) return true;
    }
    if (nk.includes('staffcode') || nk.includes('staffid') || nk.includes('employeeid') || nk.includes('empcode')) {
      if (staffCode && val === staffCode.trim().toLowerCase()) return true;
    }
    if (nk.includes('membercode') || nk.includes('memberid') || nk.includes('tpacode') || nk.includes('individualid')) {
      if (memberIdTpa && val === memberIdTpa.trim().toLowerCase()) return true;
    }

    // Name check
    if (nk.includes('membername') || nk.includes('patientname') || nk.includes('employeename') || nk.includes('beneficiary') || nk === 'name') {
      if (name) {
        const n1 = name.trim().toLowerCase();
        const n2 = val;
        if (n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1)))) {
          return true;
        }
      }
    }
  }
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || '';
    const nationalId = searchParams.get('national_id') || '';
    const staffCode = searchParams.get('staff_code') || '';
    const memberIdTpa = searchParams.get('member_id_tpa') || '';

    if (!policyId) {
      return NextResponse.json({ error: 'Missing policy ID' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check claims table in the database
    let dbClaimsQuery = supabaseAdmin
      .from('claims')
      .select('id')
      .eq('policy_id', policyId);

    if (nationalId) {
      dbClaimsQuery = dbClaimsQuery.or(`national_id.eq.${nationalId.trim()},member_name.eq.${name.trim()}`);
    } else {
      dbClaimsQuery = dbClaimsQuery.eq('member_name', name.trim());
    }

    const { data: dbClaims, error: dbError } = await dbClaimsQuery.limit(1);

    if (!dbError && dbClaims && dbClaims.length > 0) {
      return NextResponse.json({ hasClaims: true, source: 'database' });
    }

    // 2. Fetch all uploaded utilization report files for this policy
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('policy_utilization_reports')
      .select('file_url, file_name, period')
      .eq('policy_id', policyId);

    if (!reportsError && reports && reports.length > 0) {
      for (const report of reports) {
        if (!report.file_url) continue;

        try {
          // Fetch the file from storage
          const fileRes = await fetch(report.file_url);
          if (!fileRes.ok) continue;

          const arrayBuffer = await fileRes.arrayBuffer();
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

          for (const row of rawData) {
            if (matchesMember(row, name, nationalId, staffCode, memberIdTpa)) {
              // Found member! Now check if there is non-zero claim amount
              const netAmount = parseNum(row.netamount || row.Net || row.net || row.net_amount || row.paidamount || row.paid || 0);
              if (netAmount > 0) {
                return NextResponse.json({ 
                  hasClaims: true, 
                  source: 'file', 
                  fileName: report.file_name, 
                  period: report.period,
                  amount: netAmount
                });
              }
            }
          }
        } catch (fileErr) {
          console.error(`Failed to parse utilization report ${report.file_name}:`, fileErr);
        }
      }
    }

    return NextResponse.json({ hasClaims: false });
  } catch (err: any) {
    console.error('Error in check-member-utilization:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
