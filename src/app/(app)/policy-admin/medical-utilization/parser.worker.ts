import * as XLSX from 'xlsx';
import { differenceInDays } from "date-fns";

const parseNum = (val: any) => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const calculateAge = (dob: Date) => {
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  return Math.abs(age_dt.getUTCFullYear() - 1970);
};

const normalize = (s: string) => s.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

const getVal = (row: any, patterns: string[]) => {
  const keys = Object.keys(row);
  for (const p of patterns) {
    const match = keys.find(k => normalize(k) === normalize(p));
    if (match) return row[match];
  }
  for (const p of patterns) {
    const match = keys.find(k => {
      const nk = normalize(k);
      const np = normalize(p);
      return nk && np && (nk.includes(np) || np.includes(nk));
    });
    if (match) return row[match];
  }
  return undefined;
};

self.onmessage = async (e: MessageEvent) => {
  const { fileBuffer, policyMembers } = e.data;
  try {
    const wb = XLSX.read(fileBuffer, { type: 'binary', cellDates: true });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

    if (!rawJson.length) {
      self.postMessage({ success: false, error: "Empty File" });
      return;
    }

    let rejectedCount = 0;
    const validRecords: any[] = [];

    rawJson.forEach(row => {
      const status = String(getVal(row, ['approvalstatus', 'status', 'claimstatus', 'decision', 'approved', 'state']) || '').toLowerCase().trim();

      const isApproved = status.includes('approve') || status.includes('paid') || status.includes('pay') ||
        status.includes('settle') || status.includes('accept') || status.includes('valid') ||
        status.includes('done') || status.includes('clear') || status.includes('complete') ||
        status.includes('finish') || status.includes('authorize') || status.includes('success') ||
        status.includes('closed') || status.includes('final') || status.includes('ok') ||
        status.includes('passed') || status.includes('utiliz') || status.includes('process') ||
        status.includes('bill') || status.includes('claim') || status === 'yes' ||
        status === 'y' || status === '1' || status === 'true' || status === '';

      const isRejected = status.includes('reject') || status.includes('decline') || status.includes('cancel') || 
        status.includes('refuse') || status.includes('deny') || status.includes('void') || status.includes('fail');

      if (!isApproved || isRejected) {
        rejectedCount++;
        return;
      }

      validRecords.push(row);
    });

    if (!validRecords.length) {
      self.postMessage({ success: false, error: "No Valid Records Found" });
      return;
    }

    const parseDate = (d: any) => {
      if (d instanceof Date) return d;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    validRecords.sort((a, b) => parseDate(getVal(a, ['servicedate', 'date'])).getTime() - parseDate(getVal(b, ['servicedate', 'date'])).getTime());

    const memberHistory: Record<string, { lastDate: Date, lastDiag: string, episodeId: string, cumulativeSpend: number }> = {};

    const enriched = validRecords.map((row: any, index) => {
      const approvalNum = String(getVal(row, ['approvalnumber', 'claimid', 'vouchernumber']) || `TEMP-${Math.random()}`);
      const memberCode = String(getVal(row, ['membercode', 'memberid', 'employeeid', 'staffcode', 'memberno']) || '');
      const memberNameRaw = String(getVal(row, ['membername', 'patientname', 'employeename', 'beneficiary']) || '');

      const member = policyMembers.find((m: any) => {
        const mCode = String(m.member_id_tpa || m.staff_code || '').toLowerCase();
        const rCode = memberCode.toLowerCase();
        if (rCode && (mCode === rCode)) return true;

        if (memberNameRaw && m.member_name) {
          const n1 = m.member_name.toLowerCase().trim();
          const n2 = memberNameRaw.toLowerCase().trim();
          return n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1)));
        }
        return false;
      });

      const serviceDate = parseDate(getVal(row, ['servicedate', 'date']));
      const netAmount = Math.round(parseNum(getVal(row, ['netamount', 'net', 'paidamount'])));
      const diagnosis = getVal(row, ['diagnosisdescription', 'diagnosis', 'description', 'icddescription']) || 'Not Specified';

      const historyKey = memberCode || memberNameRaw || 'Unknown';
      let episodeId = `EP-${historyKey}-${index}`;
      const history = memberHistory[historyKey];
      
      if (history) {
        const daysSince = differenceInDays(serviceDate, history.lastDate);
        if (daysSince <= 14 && diagnosis === history.lastDiag) {
          episodeId = history.episodeId;
        }
        history.cumulativeSpend += netAmount;
        history.lastDate = serviceDate;
        history.lastDiag = diagnosis;
      } else {
        memberHistory[historyKey] = {
          lastDate: serviceDate,
          lastDiag: diagnosis,
          episodeId: episodeId,
          cumulativeSpend: netAmount
        };
      }

      const speciality = getVal(row, ['speciality', 'medicalspecialty', 'specialization', 'dept']) || 'General';
      const documentNumber = getVal(row, ['documentnumber', 'invoice_number', 'voucherno', 'referencenumber']) || approvalNum;
      const actionType = getVal(row, ['actiontype', 'claim_type', 'transactiontype', 'source']) || 'Claim';
      const serviceNameEn = getVal(row, ['servicename', 'servicenameen', 'itemname', 'description']) || 'Medical Service';
      const fob = getVal(row, ['fob', 'facility_outlet', 'pointofservice', 'outlettype']) || 'Unknown';
      const isRefund = String(getVal(row, ['refund', 'is_refund', 'recovery'])).toLowerCase().includes('true') || String(getVal(row, ['refund', 'is_refund', 'recovery'])).toLowerCase().includes('yes');
      const networkType = getVal(row, ['networktype', 'direct_indirect', 'access']) || 'Direct';
      const classCode = getVal(row, ['classcode', 'classname', 'benefitclass', 'plan']) || 'Standard';
      const isChronic = String(getVal(row, ['chronic', 'chroniccondition'])).toLowerCase().includes('yes');
      const icdDescription = getVal(row, ['icddescription', 'diagnosisdescription', 'icd_label', 'diagnosis']) || diagnosis;

      return {
        ...row,
        memberName: member?.member_name || memberNameRaw || `Member ${memberCode}`,
        gender: member?.gender || getVal(row, ['gender', 'sex']) || 'Unknown',
        age: member?.date_of_birth ? calculateAge(new Date(member.date_of_birth)) : (parseNum(getVal(row, ['age'])) || null),
        department: member?.department || getVal(row, ['department', 'dept', 'unit']) || 'Unknown',
        jobTitle: member?.job_title || getVal(row, ['jobtitle', 'title', 'position', 'grade']) || 'Unknown',
        location: member?.location || getVal(row, ['location', 'region', 'city', 'branch']) || 'Unknown',
        patientType: member?.relation || getVal(row, ['relation', 'patienttype', 'kinship']) || 'Principal',
        netAmount,
        approvalAmount: Math.round(parseNum(getVal(row, ['approvalamount', 'gross', 'billedamount']))),
        copayment: Math.round(parseNum(getVal(row, ['copayment', 'copay', 'deductible']))),
        serviceDate,
        isChronic,
        isPreExisting: String(getVal(row, ['preexisting', 'preexistingcondition'])).toLowerCase().includes('yes'),
        networkStatus: getVal(row, ['network', 'medicalnetwork', 'networkstatus']) || 'Unknown',
        caseType: getVal(row, ['casetype', 'servicetype', 'claimtype']) || 'Unknown',
        providerType: getVal(row, ['providertype', 'facilitytype']) || 'Other',
        diagnosis,
        icdCode: getVal(row, ['icdcode', 'icd', 'diagnosiscode']) || 'N/A',
        icdDescription,
        episodeId,
        cumulativeSpend: memberHistory[historyKey].cumulativeSpend,
        highCostFlag: netAmount > 50000,
        los: Number(getVal(row, ['lengthofstay', 'los', 'days'])) || 0,
        memberCode,
        providerName: getVal(row, ['providername', 'provider', 'facility']) || 'Unknown',
        speciality,
        documentNumber,
        actionType,
        serviceNameEn,
        fob,
        isRefund,
        networkType,
        classCode
      };
    });

    self.postMessage({ success: true, enriched });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
};
