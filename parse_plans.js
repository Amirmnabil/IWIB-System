const fs = require('fs');

const plansText = fs.readFileSync('c:\\Users\\Amir\\OneDrive\\Desktop\\life\\New folder\\insurance_plans_database (1).txt', 'utf8');
const premiumsText = fs.readFileSync('c:\\Users\\Amir\\OneDrive\\Desktop\\life\\New folder\\age_premium_amounts (1).txt', 'utf8');

const plansLines = plansText.split('\n').map(l => l.trim()).filter(l => l);
const plansHeaders = plansLines[0].split('\t');
const plans = [];

// Handle multiline quoted fields in TSV (basic approach)
// Since the TSV might have quotes for multiline, let's just parse it simply
// Wait, the data has literal quotes and newlines in some cells.
// Let's use a proper CSV parser if needed, or simple regex if possible.
// Actually, I can just use string splitting but handle quotes.

function parseTSVLine(line) {
  const fields = [];
  let inQuotes = false;
  let currentField = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '\t' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField);
  return fields;
}

// But some fields are spread across lines! For example:
// "1,000 EGP\n(20% copayment)"
// We need a proper tokenizer for the whole string.

function parseTSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\t' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

const planRows = parseTSV(plansText);
const header = planRows[0];

const parsedPlans = planRows.slice(1).map(row => {
  if (row.length < 5) return null;
  return {
    id: row[0],
    company: row[1],
    name: row[2],
    type: row[2],
    lifeInsurance: row[3],
    annualLimit: row[4],
    annualLimitValue: parseInt((row[4]||'').replace(/[^0-9]/g, '')) || 0,
    tpa: row[5],
    network: row[6],
    accommodation: row[7],
    inpatient: row[8],
    consultations: row[9],
    radiologyLab: row[10],
    medications: row[11],
    dental: row[12] ? row[12].replace(/\n/g, ' ') : '',
    optical: row[13] ? row[13].replace(/\n/g, ' ') : '',
    maternity: row[14] ? row[14].replace(/\n/g, ' ') : '',
    chronicPreExisting: row[15] ? row[15].replace(/\n/g, ' ') : '',
    covid19: row[16] ? row[16].replace(/\n/g, ' ') : '',
    outOfNetwork: row[17] ? row[17].replace(/\n/g, ' ') : '',
    minMembers: parseInt(row[18]) || 0,
    maxMembers: parseInt(row[19]) || 0,
    paymentTerms: row[20] ? row[20].replace(/\n/g, ' ') : ''
  };
}).filter(p => p && p.id);


const premRows = parseTSV(premiumsText);
const premiums = {};

premRows.slice(1).forEach(row => {
  if (row.length < 2) return;
  const planId = row[0];
  const age = parseInt(row[1]);
  if (!planId || isNaN(age)) return;
  
  const emp = parseFloat((row[2] || '').replace(/[^0-9.]/g, '')) || 0;
  const spouse = parseFloat((row[3] || '').replace(/[^0-9.]/g, '')) || 0;
  const child = parseFloat((row[4] || '').replace(/[^0-9.]/g, '')) || 0;
  
  if (!premiums[planId]) premiums[planId] = {};
  premiums[planId][age] = { emp, spouse, child };
});


const out = `import { SMEPlan } from './types';

export const SME_PLANS: SMEPlan[] = ${JSON.stringify(parsedPlans, null, 2)};

export const SME_PREMIUMS: Record<string, Record<number, {emp: number, spouse: number, child: number}>> = ${JSON.stringify(premiums, null, 2)};
`;

fs.writeFileSync('d:\\IWIB\\IWIB System\\SYSTEM\\src\\lib\\plans-data.ts', out, 'utf8');
console.log('Successfully written plans-data.ts');
