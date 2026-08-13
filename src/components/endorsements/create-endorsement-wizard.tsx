'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays, differenceInMonths, isValid } from "date-fns";
import * as XLSX from "xlsx";
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, 
  AlertCircle, ChevronRight, Calculator, Calendar, Search, Users, FileEdit, ArrowRight, Loader2, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/hooks/use-toast";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateEndorsementWizardProps {
  policy?: any;
  insurer?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CreateEndorsementWizard({ policy: initialPolicy, insurer: initialInsurer, onClose, onSuccess }: CreateEndorsementWizardProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>("");
  const [selectedEndorsementTypeId, setSelectedEndorsementTypeId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("Corporate");

  // Policy Search (for standalone page mode)
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(initialPolicy || null);
  const [policies, setPolicies] = useState<any[]>([]);

  // Fetch Endorsement Types
  const { data: rawEndorsementTypes } = useSupabaseCollection<any>('endorsement_types');
  const endorsementTypes = rawEndorsementTypes || [];

  // Excel parsing & items lists
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual items input state
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualNationalId, setManualNationalId] = useState("");
  const [manualAction, setManualAction] = useState<"add" | "delete" | "modify">("add");
  const [manualPremium, setManualPremium] = useState("0");
  const [manualSumInsured, setManualSumInsured] = useState("0");

  const isModalMode = !!onClose;

  // Fetch active policies if in standalone mode
  useEffect(() => {
    if (!initialPolicy) {
      const fetchPolicies = async () => {
        const { data, error } = await supabase
          .from('policies')
          .select('id, policy_number, client_company_name, client_company_id, end_date, start_date, line_of_business, insurer_id, insurer_name')
          .eq('policy_status', 'Active');
        if (!error && data) {
          setPolicies(data);
        }
      };
      fetchPolicies();
    }
  }, [initialPolicy]);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.client_company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.policy_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [policies, searchQuery]);

  const selectedEndorsementType = useMemo(() => {
    return (endorsementTypes || []).find((t: any) => t.id === selectedEndorsementTypeId);
  }, [endorsementTypes, selectedEndorsementTypeId]);

  const remainingDays = useMemo(() => {
    if (!selectedPolicy?.end_date || !effectiveDate) return 0;
    const end = new Date(selectedPolicy.end_date);
    const eff = new Date(effectiveDate);
    if (!isValid(end) || !isValid(eff)) return 0;
    return Math.max(0, differenceInDays(end, eff));
  }, [selectedPolicy, effectiveDate]);

  // Proration factor based on remaining days
  const prorationFactor = useMemo(() => {
    return remainingDays / 365;
  }, [remainingDays]);

  // Excel parsing
  const handleFileUpload = (file: File) => {
    if (!effectiveDate) {
      toast({ variant: 'destructive', title: "Please select an effective date first." });
      return;
    }

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

          if (jsonData.length === 0) {
            toast({ variant: 'destructive', title: "Excel file is empty" });
            setIsParsing(false);
            return;
          }

          setExcelRows(jsonData);
          toast({ title: `Successfully parsed ${jsonData.length} rows.` });
          setStep(3); // Advance to preview
        } catch (err) {
          toast({ variant: 'destructive', title: "Error parsing file", description: "Ensure it is a valid Excel file." });
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

  // Add Manual Item to local list
  const addManualItem = () => {
    if (!manualName) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    const premVal = Number(manualPremium) || 0;
    const proratedPrem = Number((premVal * prorationFactor).toFixed(2));

    setManualItems([
      ...manualItems,
      {
        id: `manual-${Date.now()}`,
        name: manualName,
        national_id: manualNationalId,
        action_type: manualAction,
        premium: premVal,
        prorated_premium: proratedPrem,
        sum_insured: Number(manualSumInsured) || 0
      }
    ]);

    setManualName("");
    setManualNationalId("");
    setManualPremium("0");
    setManualSumInsured("0");
  };

  // Remove manual item from local list
  const removeManualItem = (id: string) => {
    setManualItems(manualItems.filter(item => item.id !== id));
  };

  // Financial preview calculation
  const calculations = useMemo(() => {
    let totalPremium = 0;
    let totalSumInsured = 0;

    if (excelRows.length > 0) {
      excelRows.forEach(row => {
        const action = String(row.action_type || row.Action || 'add').toLowerCase();
        const direction = action === 'delete' ? -1 : 1;
        const prem = Number(row.premium || row.Premium || 0);
        const si = Number(row.sum_insured || row.SumInsured || 0);
        
        totalPremium += prem * direction * prorationFactor;
        totalSumInsured += si * direction;
      });
    } else {
      manualItems.forEach(item => {
        const direction = item.action_type === 'delete' ? -1 : 1;
        totalPremium += item.premium * direction * prorationFactor;
        totalSumInsured += item.sum_insured * direction;
      });
    }

    const taxes = totalPremium * 0.132; // 13.2% taxes
    const finalImpact = totalPremium + taxes;

    return {
      netPremium: totalPremium,
      taxes,
      finalImpact,
      sumInsured: totalSumInsured
    };
  }, [excelRows, manualItems, prorationFactor]);

  // Submit flow using the bulk-upload API
  const handleSave = async () => {
    if (!selectedPolicy || !selectedEndorsementTypeId) {
      toast({ variant: 'destructive', title: "Policy and Endorsement Type are required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = excelRows.length > 0 
        ? excelRows.map(row => ({
            name: row.member_name || row.Name || row.vehicle_name || row.description,
            national_id: row.national_id || row.NationalID || row.chassis || row.plate || '',
            action_type: String(row.action_type || row.Action || 'add').toLowerCase(),
            premium: Number(row.premium || row.Premium || 0),
            sum_insured: Number(row.sum_insured || row.SumInsured || 0)
          }))
        : manualItems.map(item => ({
            name: item.name,
            national_id: item.national_id,
            action_type: item.action_type,
            premium: item.premium,
            sum_insured: item.sum_insured
          }));

      // Call bulk-upload endpoint
      const response = await fetch('/api/endorsements/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: selectedPolicy.id,
          endorsement_type_id: selectedEndorsementTypeId,
          rows: itemsPayload,
          effective_date: effectiveDate,
          category,
          notes: notes || `Created via wizard. Reference: ${reference}`,
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create endorsement');
      }

      toast({ title: "Endorsement created successfully as Draft!" });

      if (isModalMode) {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        router.push(`/endorsements/${result.endorsement_id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: "Error submitting endorsement", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {!isModalMode && (
        <Button variant="ghost" onClick={() => router.push('/endorsements')} className="mb-6 -ml-4 text-slate-500 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>
      )}

      {isModalMode && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Create Endorsement</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">New Endorsement Request</h1>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-3.5 h-3.5 rounded-full transition-all ${step >= s ? "bg-[#2A75F3]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <Card className="rounded-3xl border-border shadow-lg overflow-hidden bg-white">
        <CardContent className="p-8 min-h-[400px]">
          
          {/* STEP 1: Select Policy and Type */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              {/* Select Policy */}
              {!initialPolicy && (
                <div className="space-y-2">
                  <Label className="text-base font-bold text-slate-800">1. Select Policy</Label>
                  {!selectedPolicy ? (
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <Input 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 250)}
                        placeholder="Search active policies by client name or policy number..." 
                        className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-200" 
                      />
                      {isDropdownOpen && filteredPolicies.length > 0 && (
                        <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto overflow-hidden">
                          {filteredPolicies.map((p: any) => (
                            <div 
                              key={p.id} 
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedPolicy(p);
                                setIsDropdownOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <p className="font-bold text-slate-900">{p.client_company_name}</p>
                              <p className="text-xs font-mono text-slate-500">{p.policy_number} • LoB: {p.line_of_business}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-blue-500 bg-blue-50/50 rounded-xl flex justify-between items-center animate-in fade-in">
                      <div>
                        <p className="font-bold text-blue-900">{selectedPolicy.client_company_name}</p>
                        <p className="text-sm font-mono text-blue-700">{selectedPolicy.policy_number} • LoB: {selectedPolicy.line_of_business}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)} className="text-blue-600 hover:bg-blue-100">Change</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Select Endorsement Type */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <Label className="text-base font-bold text-slate-800">2. Select Endorsement Type</Label>
                <Select value={selectedEndorsementTypeId} onValueChange={setSelectedEndorsementTypeId}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select type of modifications..." />
                  </SelectTrigger>
                  <SelectContent>
                    {endorsementTypes.map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} ({st.line_of_business} - {st.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Set Category */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <Label className="text-base font-bold text-slate-800">3. Endorsement Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select Category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Over Ceiling">Over Ceiling</SelectItem>
                    <SelectItem value="Recovery">Recovery</SelectItem>
                    <SelectItem value="Exception">Exception</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Details, Upload Excel, or Manual Entry */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Effective Date of Change</Label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Reference Number (Optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. REF-2026-X" className="h-12 rounded-xl" />
                </div>
              </div>

              {/* Remaining Policy Duration stats */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4 items-center">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs text-amber-800 font-bold">Pro-rata configuration:</p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    Remaining Policy Duration: {remainingDays} days. Proration Factor: {(prorationFactor * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Bulk Excel Upload Card */}
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50/50">
                <div 
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn("border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-100 transition-colors cursor-pointer", dragActive && "border-blue-500 bg-blue-50/50")}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800">Drag & Drop Excel (.xlsx) file here</p>
                  <p className="text-xs text-slate-500 mt-1">Or click to browse files</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                </div>
              </div>

              {/* Manual Entry Form */}
              <div className="space-y-4 p-6 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <h3 className="font-bold text-slate-900">Or Add Items Manually</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Member/Vehicle/Asset Name" className="h-10 rounded-xl" />
                  <Input value={manualNationalId} onChange={(e) => setManualNationalId(e.target.value)} placeholder="National ID / Chassis" className="h-10 rounded-xl" />
                  <Select value={manualAction} onValueChange={(v: any) => setManualAction(v)}>
                    <SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="modify">Modify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Annual Premium</Label>
                    <Input type="number" value={manualPremium} onChange={(e) => setManualPremium(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sum Insured Impact</Label>
                    <Input type="number" value={manualSumInsured} onChange={(e) => setManualSumInsured(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addManualItem} className="w-full h-10 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold">
                      Add to List
                    </Button>
                  </div>
                </div>

                {/* Local Manual List Display */}
                {manualItems.length > 0 && (
                  <ScrollArea className="h-40 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="space-y-2">
                      {manualItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs shadow-sm">
                          <div>
                            <span className="font-bold">{item.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">({item.action_type})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-600">EGP {item.premium}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeManualItem(item.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Notes Area */}
              <div className="space-y-1">
                <Label>Notes & Description</Label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="e.g. Additions for new employees starting this week..." 
                  className="w-full min-h-[80px] p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Preview Financial Impact & Confirm */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10"><Calculator className="w-64 h-64" /></div>
                <div className="relative z-10">
                  <p className="text-blue-300 font-bold tracking-wider uppercase text-xs mb-2">Calculated Financial Impact (Pro-Rata)</p>
                  <h2 className="text-4xl font-black text-white mb-6">
                    {calculations.finalImpact >= 0 ? '+' : ''}EGP {calculations.finalImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                  
                  <div className="space-y-3 pt-6 border-t border-slate-700 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>LoB / Line of Business:</span>
                      <span className="font-bold text-white">{selectedPolicy?.line_of_business}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Endorsement Type:</span>
                      <span className="font-bold text-white">{selectedEndorsementType?.name || 'Manual'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Net Premium:</span>
                      <span className="font-mono text-white">EGP {calculations.netPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Taxes & Fees (13.2%):</span>
                      <span className="font-mono text-white">EGP {calculations.taxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {calculations.sumInsured !== 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Sum Insured Adjustment:</span>
                        <span className="font-mono text-white">EGP {calculations.sumInsured.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center">
                This is a pro-rata estimate calculated from the remaining policy duration ({remainingDays} days).
              </p>
            </div>
          )}

        </CardContent>

        {/* Footer Navigation Buttons */}
        <div className="bg-slate-50 border-t border-border p-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1) as any)} disabled={step === 1} className="h-12 px-6 rounded-xl font-bold">
            Back
          </Button>

          {step < 3 ? (
            <Button 
              onClick={() => setStep((step + 1) as any)} 
              disabled={step === 1 && (!selectedPolicy || !selectedEndorsementTypeId)} 
              className="bg-[#2A75F3] hover:bg-blue-700 h-12 px-8 rounded-xl font-bold text-white shadow-lg shadow-blue-200"
            >
              Next Step <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Save Draft & View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
