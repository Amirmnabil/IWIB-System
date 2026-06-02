'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";

import React, { useState, useMemo, useRef } from "react";
import { format, differenceInDays, differenceInMonths, parseISO, isValid } from "date-fns";
import * as XLSX from "xlsx";
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, 
  AlertCircle, ChevronRight, Calculator, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface CreateEndorsementWizardProps {
  policy: any;
  insurer: any;
  onClose: () => void;
  onSuccess: () => void;
}

type ParsedMember = {
  id: string; // temp id
  name: string;
  nationalId: string;
  actionType: 'add' | 'delete';
  annualPremium: number;
  dob?: string;
  error?: string;
  // calculated
  proratedFactor: number;
  calculatedPremium: number;
};

export default function CreateEndorsementWizard({ policy, insurer, onClose, onSuccess }: CreateEndorsementWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<ParsedMember[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const prorationMethod = insurer?.proration_method;
  const policyEnd = policy?.end_date ? new Date(policy.end_date) : null;
  const policyStart = policy?.start_date ? new Date(policy.start_date) : null;

  const handleFileUpload = async (file: File) => {
    if (!prorationMethod) {
      toast({ variant: 'destructive', title: "Proration Method Missing", description: "The insurance company configuration is missing a proration method. Please configure it first." });
      return;
    }
    if (!effectiveDate) {
      toast({ variant: 'destructive', title: "Please select an effective date first." });
      return;
    }
    if (!policyEnd) {
      toast({ variant: 'destructive', title: "Policy has no end date defined." });
      return;
    }
    const effDate = new Date(effectiveDate);
    if (!isValid(effDate)) {
      toast({ variant: 'destructive', title: "Invalid effective date." });
      return;
    }

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

          const parsed: ParsedMember[] = jsonData.map((row: any, i: number) => {
            const action = (row['Action'] || row['Type'] || 'add').toString().toLowerCase();
            const actionType = action.includes('del') || action.includes('rem') ? 'delete' : 'add';
            const annualPrem = parseFloat(row['Premium'] || row['Annual Premium'] || '0');
            const nationalId = row['National ID'] || row['ID'] || '';
            const name = row['Member Name'] || row['Name'] || `Unknown Row ${i+1}`;

            let error = undefined;
            if (!name) error = "Missing Name";
            if (!annualPrem && annualPrem !== 0) error = "Invalid Premium";

            // Calculation
            let factor = 0;
            if (prorationMethod === 'daily') {
              const daysLeft = Math.max(0, differenceInDays(policyEnd, effDate));
              factor = daysLeft / 365;
            } else {
              // monthly
              const monthsLeft = Math.max(0, differenceInMonths(policyEnd, effDate));
              factor = monthsLeft / 12;
            }

            // Adjust refund for deletion
            let calcPrem = factor * annualPrem;
            if (actionType === 'delete') {
              calcPrem = -calcPrem; 
            }

            return {
              id: `temp-${i}`,
              name,
              nationalId: nationalId.toString(),
              actionType,
              annualPremium: annualPrem,
              dob: row['DOB'] || row['Date of Birth'],
              error,
              proratedFactor: factor,
              calculatedPremium: calcPrem
            };
          });

          setMembers(parsed);
          setStep(2);
        } catch (err) {
          toast({ variant: 'destructive', title: "Error parsing file", description: "Ensure it is a valid Excel file with required columns." });
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setIsParsing(false);
      toast({ variant: 'destructive', title: "Error reading file" });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Summaries
  const summary = useMemo(() => {
    const adds = members.filter(m => m.actionType === 'add');
    const dels = members.filter(m => m.actionType === 'delete');
    const errors = members.filter(m => !!m.error);
    const validAdds = adds.filter(m => !m.error);
    const validDels = dels.filter(m => !m.error);
    
    const premiumAdd = validAdds.reduce((sum, m) => sum + m.calculatedPremium, 0);
    const premiumRefund = validDels.reduce((sum, m) => sum + Math.abs(m.calculatedPremium), 0);
    const netPremium = premiumAdd - premiumRefund;

    return {
      total: members.length,
      adds: adds.length,
      dels: dels.length,
      errors: errors.length,
      premiumAdd,
      premiumRefund,
      netPremium,
      hasErrors: errors.length > 0
    };
  }, [members]);

  const handleSubmit = async () => {
    if (summary.hasErrors) {
      toast({ variant: 'destructive', title: "Resolve errors before submission" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create endorsement record
      const { data: endorsement, error: endError } = await supabase.from('endorsements').insert(sanitizeUUIDs({
        policy_id: policy.id,
        endorsement_number: reference || `END-${Math.floor(Math.random() * 100000)}`,
        endorsement_type: 'member_update',
        effective_date: effectiveDate,
        members_added: summary.adds,
        members_deleted: summary.dels,
        premium_adjustment: summary.netPremium,
        status: 'pending',
        details: { proration_method: prorationMethod }
      })).select().single();

      if (endError) throw endError;

      // 2. Create endorsement items
      const itemsPayload = members.map(m => ({
        endorsement_id: endorsement.id,
        member_name: m.name,
        national_id: m.nationalId,
        action_type: m.actionType,
        annual_premium: m.annualPremium,
        calculation_method: prorationMethod,
        prorated_factor: m.proratedFactor,
        calculated_premium: m.calculatedPremium
      }));

      const { error: itemsError } = await supabase.from('endorsement_items').insert(sanitizeUUIDs(itemsPayload));
      if (itemsError) throw itemsError;

      // 3. Update policy members depending on action (in real system, would be on 'approve', but let's assume auto-apply for now if needed, or just leave as pending)
      // Since UX proposal says "Submission: The user clicks Submit for Approval", we just leave it in pending.

      toast({ title: "Endorsement submitted for approval" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Submission failed", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col antialiased">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          <h2 className="text-lg font-bold text-slate-900">Create Endorsement</h2>
          <Badge variant="outline" className="ml-2 font-mono bg-white">{policy?.policy_number}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(3)} disabled={summary.hasErrors} className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Calculate Impact <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50/50 p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
            <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
              <span className="text-xs font-bold uppercase tracking-widest">Setup & Upload</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
              <span className="text-xs font-bold uppercase tracking-widest">Data Review</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`flex flex-col items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
              <span className="text-xs font-bold uppercase tracking-widest">Financial Impact</span>
            </div>
          </div>

          {/* Step 1: Setup */}
          {step === 1 && (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Effective Date *</Label>
                    <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="h-12 bg-slate-50 border-slate-200" />
                    {effectiveDate && policyStart && new Date(effectiveDate) < policyStart && (
                      <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Date is before policy start date.</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Reference Number (Optional)</Label>
                    <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. END-OCT-01" className="h-12 bg-slate-50 border-slate-200" />
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                  
                  {isParsing ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="font-bold text-slate-700">Parsing member rows...</p>
                      <p className="text-xs text-slate-500">Calculating premiums based on {prorationMethod} proration.</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8 text-indigo-500" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Member Spreadsheet</h3>
                      <p className="text-slate-500 mb-6 max-w-md">Drag and drop your Excel (.xlsx) or CSV file here, or click to browse. Ensure columns "Member Name", "National ID", "Action", and "Premium" exist.</p>
                      <div className="flex gap-3">
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Browse Files</Button>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"><FileSpreadsheet className="w-4 h-4 mr-2" /> Download Template</Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Data Review */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-none shadow-sm"><CardContent className="p-4 text-center"><p className="text-xs font-bold uppercase text-slate-400">Total Rows</p><p className="text-2xl font-black text-slate-900">{summary.total}</p></CardContent></Card>
                <Card className="rounded-2xl border-none shadow-sm"><CardContent className="p-4 text-center"><p className="text-xs font-bold uppercase text-emerald-600/70">Additions (+)</p><p className="text-2xl font-black text-emerald-600">{summary.adds}</p></CardContent></Card>
                <Card className="rounded-2xl border-none shadow-sm"><CardContent className="p-4 text-center"><p className="text-xs font-bold uppercase text-red-600/70">Deletions (-)</p><p className="text-2xl font-black text-red-600">{summary.dels}</p></CardContent></Card>
                <Card className={`rounded-2xl border-none shadow-sm ${summary.hasErrors ? 'bg-red-50' : 'bg-emerald-50'}`}><CardContent className="p-4 text-center"><p className="text-xs font-bold uppercase text-slate-500">Errors</p><p className={`text-2xl font-black ${summary.hasErrors ? 'text-red-600' : 'text-emerald-600'}`}>{summary.errors}</p></CardContent></Card>
              </div>

              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Parsed Data Grid</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-slate-50">All: {summary.total}</Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Errors: {summary.errors}</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Member Name</th>
                        <th className="px-6 py-4">National ID</th>
                        <th className="px-6 py-4 text-right">Annual Prem.</th>
                        <th className="px-6 py-4 text-right">Calculated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((m) => (
                        <tr key={m.id} className={`hover:bg-slate-50/50 ${m.error ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-3">
                            {m.error ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant="outline" className={m.actionType === 'add' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}>
                              {m.actionType.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-900">{m.name}</td>
                          <td className="px-6 py-3 text-slate-500">{m.nationalId || '-'}</td>
                          <td className="px-6 py-3 text-right font-mono text-slate-600">{m.annualPremium.toLocaleString()}</td>
                          <td className={`px-6 py-3 text-right font-mono font-bold ${m.calculatedPremium > 0 ? 'text-emerald-600' : m.calculatedPremium < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                            {m.calculatedPremium > 0 ? '+' : ''}{m.calculatedPremium.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Financial Impact & Confirmation */}
          {step === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-gradient-to-br from-indigo-900 to-blue-900 text-white">
                <CardContent className="p-8 md:p-12 text-center">
                  <Calculator className="w-12 h-12 text-blue-300 mx-auto mb-6" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-2">Net Financial Impact</h3>
                  <div className="text-5xl md:text-6xl font-black tracking-tight mb-8">
                    {summary.netPremium > 0 ? '+' : ''}EGP {summary.netPremium.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <div>
                      <p className="text-xs font-bold uppercase text-blue-200">Total Additional Premium</p>
                      <p className="text-xl font-bold text-emerald-400">+{summary.premiumAdd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-blue-200">Total Refund / Credit</p>
                      <p className="text-xl font-bold text-red-300">-{summary.premiumRefund.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-100 shadow-sm bg-white">
                <CardContent className="p-6">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500"/> Calculation Parameters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold uppercase text-slate-500">Effective Date</p>
                      <p className="font-bold text-slate-900">{effectiveDate ? format(new Date(effectiveDate), 'MMM d, yyyy') : '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold uppercase text-slate-500">Policy End</p>
                      <p className="font-bold text-slate-900">{policyEnd ? format(policyEnd, 'MMM d, yyyy') : '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold uppercase text-slate-500">Proration</p>
                      <p className="font-bold text-slate-900 capitalize">{prorationMethod}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold uppercase text-slate-500">Members</p>
                      <p className="font-bold text-slate-900">{summary.total} Processed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">By submitting this endorsement, you confirm that the calculated financial impact has been reviewed and approved. It will be routed for final underwriter approval if required.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
