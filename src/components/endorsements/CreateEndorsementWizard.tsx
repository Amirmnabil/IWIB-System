"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Upload, Search, Calendar, Users, FileEdit, Banknote, Calculator } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { useI18n } from "@/components/i18n-context";

export default function CreateEndorsementWizard() {
  const router = useRouter();
  const { isRtl } = useI18n();
  const { data: subjectTypes, isLoading: subjectsLoading } = useMasterData('endorsement_subject_types');
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<{name: string, no: string, exp: string, type: string} | null>(null);

  const [policies, setPolicies] = useState<{name: string, no: string, exp: string, type: string}[]>([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          id,
          policy_number,
          end_date,
          client_company_name,
          policy_type
        `)
        .eq('policy_status', 'active');
      
      if (!error && data) {
        setPolicies(data.map((p: any) => ({
          name: p.client_company_name || 'Unknown Client',
          no: p.policy_number || 'N/A',
          exp: p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A',
          type: p.policy_type || 'general'
        })));
      }
    };
    fetchPolicies();
  }, []);

  const filteredPolicies = policies.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="space-y-4">
        <Label className="text-base font-bold text-slate-800">1. Select Policy</Label>
        
        {!selectedPolicy ? (
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              placeholder="Search active policies by client name or policy number..." 
              className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-200" 
            />
            {isDropdownOpen && filteredPolicies.length > 0 && (
              <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto overflow-hidden">
                {filteredPolicies.map((p) => (
                  <div 
                    key={p.no} 
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input from losing focus immediately
                      setSelectedPolicy(p);
                      setIsDropdownOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs font-mono text-slate-500">{p.no} • Expires: {p.exp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border-2 border-blue-500 bg-blue-50/50 rounded-xl flex justify-between items-center animate-in fade-in">
            <div>
              <p className="font-bold text-blue-900">{selectedPolicy.name}</p>
              <p className="text-sm font-mono text-blue-700">{selectedPolicy.no} • Expires: {selectedPolicy.exp}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)} className="text-blue-600 hover:bg-blue-100">Change</Button>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <Label className="text-base font-bold text-slate-800">2. Select Endorsement Type</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div onClick={() => setType("add")} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${type === "add" ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-200 hover:border-blue-300"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${type === "add" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}><Users className="w-5 h-5" /></div>
            <h4 className="font-bold text-slate-900">Add Members / Assets</h4>
            <p className="text-sm text-slate-500 mt-1">Pro-rata addition to existing policy.</p>
          </div>
          <div onClick={() => setType("modify")} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${type === "modify" ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-200 hover:border-blue-300"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${type === "modify" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}><FileEdit className="w-5 h-5" /></div>
            <h4 className="font-bold text-slate-900">Modify Existing Data</h4>
            <p className="text-sm text-slate-500 mt-1">Non-financial corrections (e.g. names, IDs).</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const isMedicalOrLife = ["medical", "life"].includes(selectedPolicy?.type || "");
    const isMotor = selectedPolicy?.type === "motor";
    const isGeneral = !isMedicalOrLife && !isMotor;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4">
          <Calendar className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="space-y-1 w-full">
            <Label className="text-amber-900 font-bold">Effective Date of Change</Label>
            <Input type="date" className="bg-white border-amber-200 h-12 rounded-xl" defaultValue="2026-06-25" />
            <p className="text-xs text-amber-700 font-medium mt-1">Remaining Policy Days: 189 days (Pro-Rata Base)</p>
          </div>
        </div>

        {type === "add" && isMedicalOrLife && (
          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Member Census File</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Drag and drop the filled Excel census file containing the new members to be added to this Medical/Life policy.</p>
            <Button variant="outline" className="border-slate-300 font-bold">Browse Files</Button>
          </div>
        )}

        {type === "add" && isMotor && (
          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Vehicles List</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Upload the Excel sheet containing Chassis numbers, Plate numbers, and values for the new vehicles.</p>
            <Button variant="outline" className="border-slate-300 font-bold">Browse Vehicle List</Button>
          </div>
        )}

        {type === "add" && isGeneral && (
          <div className="space-y-4 p-6 border rounded-2xl bg-white shadow-sm">
            <h3 className="font-bold text-slate-900">Add Assets / Sum Insured</h3>
            <p className="text-sm text-slate-500 mb-4">Specify the additional sum insured or assets to be covered under this Property/Liability policy.</p>
            
            <div className="space-y-2">
              <Label>Endorsement Subject Type</Label>
              <Select>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                  <SelectValue placeholder={subjectsLoading ? "Loading..." : "Select what you are adding..."} />
                </SelectTrigger>
                <SelectContent>
                  {subjectTypes.map((st: any) => (
                    <SelectItem key={st.id} value={st.code}>
                      {isRtl ? st.name_ar : st.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Detailed Description</Label>
              <Input placeholder="e.g. New warehouse equipment at branch B" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Additional Sum Insured Value</Label>
              <Input type="number" placeholder="Enter amount" className="h-12 rounded-xl" />
            </div>
          </div>
        )}

        {type === "modify" && (
          <div className="space-y-4 p-6 border rounded-2xl bg-white shadow-sm">
            <h3 className="font-bold text-slate-900">Modify Policy Details</h3>
            <p className="text-sm text-slate-500 mb-4">Describe the data corrections or non-financial updates requested for this policy.</p>
            <div className="space-y-2">
              <Label>Modification Description</Label>
              <textarea 
                placeholder="e.g. Correcting company address from Building A to Building B" 
                className="w-full min-h-[120px] p-4 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Supporting Documents (Optional)</Label>
              <Input type="file" className="h-12 rounded-xl pt-2.5" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10"><Calculator className="w-64 h-64" /></div>
        <div className="relative z-10">
          <p className="text-blue-300 font-bold tracking-wider uppercase text-sm mb-2">System Calculation (Pro-Rata)</p>
          <h2 className="text-4xl font-black text-white mb-6">+EGP 1,245.50</h2>
          
          <div className="space-y-3 pt-6 border-t border-slate-700">
            <div className="flex justify-between text-slate-300">
              <span>Members Added:</span>
              <span className="font-bold text-white">5 Employees</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Pro-Rata Premium:</span>
              <span className="font-mono text-white">EGP 1,100.00</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Taxes & Fees (13.2%):</span>
              <span className="font-mono text-white">EGP 145.50</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-500 text-center">This calculation is an estimate based on the active policy rates. Final approval by the insurer may vary.</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Button variant="ghost" onClick={() => router.push('/endorsements')} className="mb-6 -ml-4 text-slate-500 hover:text-slate-900">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Button>
      
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900">Create Endorsement</h1>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-3 h-3 rounded-full transition-all ${step >= s ? "bg-[#2A75F3]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <Card className="rounded-3xl border-border shadow-lg overflow-hidden bg-white">
        <CardContent className="p-8 min-h-[400px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-border p-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="h-12 px-6 rounded-xl font-bold">
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && (!selectedPolicy || !type)} className="bg-[#2A75F3] hover:bg-blue-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-blue-200">
              Next Step <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => router.push('/endorsements/END-2026-001')} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200">
              Save Draft & View Details
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
