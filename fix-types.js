const fs = require('fs');
let content = fs.readFileSync('src/lib/types.ts', 'utf8');

let firstIndex = content.indexOf('export interface Invoice {');
let secondIndex = content.indexOf('export interface Invoice {', firstIndex + 1);

if (secondIndex !== -1) {
  let endOfSecond = content.indexOf('}', secondIndex);
  content = content.substring(0, secondIndex) + content.substring(endOfSecond + 1);
}

content = content.replace(/export interface Invoice \{[\s\S]*?\n\}/, `export interface Invoice {
  id: string;
  invoice_number: string;
  client_company_id?: string;
  client_company_name?: string;
  insurer_id?: string;
  insurer_name?: string;
  policy_id?: string;
  policy_number?: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  amount_due: number;
  net_amount?: number;
  tax_amount?: number;
  gross_amount?: number;
  tax_percentage?: number;
  amount_paid: number;
  balance?: number;
  status: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
}`);

content = content.replace('taxes_percent?: number;', 'taxes_percent?: number;\n  tax_override?: number;');

if (!content.includes('export interface Installment')) {
  content += `

export interface Installment {
  id: string;
  policy_id: string;
  amount: number;
  settled_amount?: number;
  remaining_amount?: number;
  financial_direction?: string;
  due_date: string;
  issue_date?: string;
  status: string;
}

export interface InvoiceNetting {
  id: string;
  source_invoice_id: string;
  target_invoice_id: string;
  amount: number;
  created_at?: string;
}
`;
}

fs.writeFileSync('src/lib/types.ts', content);
console.log('Fixed types.ts successfully.');
