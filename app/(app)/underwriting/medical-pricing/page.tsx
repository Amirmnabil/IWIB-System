
'use client';
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Calculator, Building2, Users, PieChart as PieChartIcon, 
  ChevronRight, Upload, FileDown, FileText, 
  Lock, Globe, CheckCircle2, Save, Trash2, ExternalLink, Loader2,
  Plus, Printer, Stethoscope, Heart, Briefcase, Eye, Baby, ShieldCheck,
  Activity, LayoutDashboard, Pill, Thermometer, ShieldAlert,
  Hotel, AlertTriangle, Copy, Search, Calendar, Download, Edit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from 'xlsx';
import { format, parse, differenceInMonths, isValid, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SME_PLANS, type SMEPlan } from "@/lib/plans-data";
import { getPremium, PLAN_PRICING_STYLE_MAP } from "@/lib/pricing-matrix";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { addDoc, collection, doc, deleteDoc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Company, SMEQuotation, Member, CalculationBreakdown } from "@/lib/types";

type SMEModule = 'dashboard' | 'company' | 'census' | 'analysis';

const BenefitItem = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) => {
  if (!value || value === 'Not covered' || value === 'None') return null;
  return (
    <div className="flex items-start gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0">
      <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1">
        <span className="text-slate-400 font-medium mr-1">{label}:</span>
        <span className="text-slate-700 font-bold">{value}</span>
      </div>
    </div>
  );
};

export default function SMEMedicalPricingTool() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [activeModule, setActiveModule] = useState<SMEModule>('dashboard');
  const [companyInfo, setCompanyInfo] = useState({ name: "", id: "", startDate: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | null>(null);
  
  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  
  // Batch Selection
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Query Params (View Mode)
  useEffect(() => {
    const id = searchParams.get('id');
    const isView = searchParams.get('view') === 'true';
    if (id && firestore) {
      getDoc(doc(firestore, 'sme_quotations', id)).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as SMEQuotation;
          setCompanyInfo({ name: data.companyName, id: data.companyId || "", startDate: data.policyStartDate });
          setMembers(data.members || []);
          setSelectedPlanIds(data.selectedPlanIds || []);
          setCurrentQuotationId(id);
          if (isView) {
            setActiveModule('analysis');
          }
        }
      });
    }
  }, [searchParams, firestore]);

  const smeQuotationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'sme_quotations'), where('user_id', '==', user.uid));
  }, [firestore, user?.uid]);
  
  const { data: rawQuotations = [], loading: isLoadingQuotations } = useCollection<SMEQuotation>(smeQuotationsQuery);
  
  // Group by Company for Dashboard
  const groupedCompanies = useMemo(() => {
    const map = new Map<string, any>();
    rawQuotations.forEach(q => {
      const existing = map.get(q.companyId || q.companyName);
      if (!existing || new Date(q.created_at) > new Date(existing.lastUpdate)) {
        map.set(q.companyId || q.companyName, {
          companyId: q.companyId,
          companyName: q.companyName,
          lastUpdate: q.created_at,
          versions: (existing?.versions || 0) + 1,
          latestVersion: q.version || 1,
          lastUser: q.user_name || 'System'
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
  }, [rawQuotations]);

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'companies');
  }, [firestore]);
  const { data: crmCompanies } = useCollection<Company>(companiesQuery);
  
  const smePremiumsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sme_premiums');
  }, [firestore]);
  const { data: firestorePremiums } = useCollection<any>(smePremiumsQuery);

  const ALL_PLANS = useMemo(() => SME_PLANS, []);

  const calculateRoundedAge = (birthDate: Date | null, policyStartDateStr: string) => {
    if (!birthDate || !policyStartDateStr) return -1;
    try {
      const policyStartDate = new Date(policyStartDateStr);
      if (!isValid(policyStartDate)) return -1;
      const totalMonths = differenceInMonths(policyStartDate, birthDate);
      if (totalMonths < 0) return -1;
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      return remainingMonths >= 6 ? years + 1 : years;
    } catch (e) { return -1; }
  };

  const getPlanAnalysis = (plan: SMEPlan): { premium: number; breakdown: CalculationBreakdown | null; ineligibleReason?: string } => {
    if (!members || members.length === 0) return { premium: 0, breakdown: null };
    
    const planPremiums = firestorePremiums?.filter(fp => fp.planId === plan.id);
    const premiumExpiryDate = planPremiums?.[0]?.expiryDate;

    if (premiumExpiryDate && companyInfo.startDate) {
      const expiry = new Date(premiumExpiryDate);
      const start = new Date(companyInfo.startDate);
      if (isValid(expiry) && isValid(start) && start > expiry) {
        return { premium: -1, breakdown: null, ineligibleReason: `Rates expired on ${format(expiry, 'MMM d, yyyy')}` };
      }
    }

    if (members.length < (plan.minMembers || 0)) return { premium: -1, breakdown: null, ineligibleReason: `Requires min. ${plan.minMembers} members` };
    if (plan.maxMembers && members.length > plan.maxMembers) return { premium: -1, breakdown: null, ineligibleReason: `Exceeds max. ${plan.maxMembers} members` };

    const breakdown: CalculationBreakdown = { employeeTotal: 0, spouseTotal: 0, childTotal: 0, totalMembers: 0, excludedMembers: 0 };
    members.forEach(m => {
      if (m.age < 1 || m.age > 65) { breakdown.excludedMembers++; return; }
      let memberPremium = 0;
      const fsPremium = firestorePremiums?.find(fp => fp.planId === plan.id && Number(fp.age) === m.age);
      if (fsPremium) {
        if (m.type === 'Employee') memberPremium = fsPremium.emp;
        else if (m.type === 'Spouse') memberPremium = fsPremium.spouse;
        else if (m.type === 'Child') memberPremium = fsPremium.child;
      } else {
        const pricingStyle = PLAN_PRICING_STYLE_MAP[plan.id];
        if (pricingStyle) memberPremium = getPremium(pricingStyle, m.age, m.type);
      }
      if (m.type === 'Employee') breakdown.employeeTotal += memberPremium;
      else if (m.type === 'Spouse') breakdown.spouseTotal += memberPremium;
      else if (m.type === 'Child') breakdown.childTotal += memberPremium;
      breakdown.totalMembers++;
    });
    return { premium: breakdown.employeeTotal + breakdown.spouseTotal + breakdown.childTotal, breakdown };
  };

  const handleSaveQuotation = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    const snapshots: Record<string, any> = {};
    selectedPlanIds.forEach(pid => {
      const plan = ALL_PLANS.find(p => p.id === pid);
      if (plan) {
        const analysis = getPlanAnalysis(plan);
        if (analysis.premium > 0) {
          snapshots[pid] = {
            premium: analysis.premium,
            breakdown: analysis.breakdown,
            issuedAt: new Date().toISOString()
          };
        }
      }
    });

    const quotationData = {
      companyName: companyInfo.name,
      companyId: companyInfo.id,
      policyStartDate: companyInfo.startDate,
      members: members,
      selectedPlanIds: selectedPlanIds,
      snapshots: snapshots,
      created_at: new Date().toISOString(),
      user_id: user.uid,
      user_name: user.displayName || user.email || "System User",
      version: 1, // Default, logic should handle incrementing if coming from Edit
      status: 'pending' as const
    };

    try {
      if (currentQuotationId) {
        await updateDoc(doc(firestore, "sme_quotations", currentQuotationId), quotationData);
        toast({ title: "Snapshot Updated" });
      } else {
        await addDoc(collection(firestore, "sme_quotations"), quotationData);
        toast({ title: "Quotation Snapshot Issued" });
      }
      setActiveModule('dashboard');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save Failed' });
    } finally { setIsSaving(false); }
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="bg-sme-primary text-white p-8 rounded-xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">SME Medical Hub</h2>
                <p className="text-blue-100 max-w-md">Overview of clients with active or pending quotations.</p>
              </div>
              <Calculator className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/10" />
            </div>
            
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Issued Clients</CardTitle>
                <CardDescription>Click a company to manage versions and issued quotes.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="pl-6 font-bold">Company Name</TableHead>
                      <TableHead className="font-bold">Latest Update</TableHead>
                      <TableHead className="font-bold">Latest Version</TableHead>
                      <TableHead className="font-bold">Account Manager</TableHead>
                      <TableHead className="text-right pr-6">History</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotations ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                    ) : groupedCompanies.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No issued quotes yet.</TableCell></TableRow>
                    ) : groupedCompanies.map((group) => (
                      <TableRow 
                        key={group.companyId || group.companyName} 
                        className="cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => router.push(`/underwriting/medical-pricing/history/${group.companyId || group.id || group.companyName}`)}
                      >
                        <TableCell className="pl-6">
                          <div className="font-bold text-sme-primary">{group.companyName}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{format(new Date(group.lastUpdate), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell><Badge variant="secondary">V{group.latestVersion}</Badge></TableCell>
                        <TableCell className="text-xs text-slate-600">{group.lastUser}</TableCell>
                        <TableCell className="text-right pr-6">
                          <ChevronRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-sme-primary" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case 'company':
        return (
          <Card className="border-none shadow-md max-w-2xl">
            <CardHeader><CardTitle>Client Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client *</Label>
                <Select value={companyInfo.id} onValueChange={(v) => { const s = crmCompanies?.find(c => c.id === v); if(s) setCompanyInfo({...companyInfo, id:v, name: s.name}); }}>
                  <SelectTrigger><SelectValue placeholder="Select from CRM" /></SelectTrigger>
                  <SelectContent>{crmCompanies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contract Start Date *</Label>
                <Input type="date" value={companyInfo.startDate} onChange={e => setCompanyInfo({...companyInfo, startDate: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setActiveModule('census')} className="bg-sme-primary" disabled={!companyInfo.id || !companyInfo.startDate}>Launch Pricing Engine <ChevronRight className="ml-2 w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        );
      case 'census':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h3 className="text-xl font-bold">Member Census</h3></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 w-4 h-4" /> Upload Excel List</Button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const bstr = event.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                    const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                    const parsed = data.map((row, i) => {
                      const birth = row.Birthdate || row.DOB || row['Birth Date'];
                      const birthDateObj = birth instanceof Date ? birth : new Date(birth);
                      const age = calculateRoundedAge(birthDateObj, companyInfo.startDate);
                      return { id: (i+1).toString(), name: row.Name || `Member ${i+1}`, birthdate: format(birthDateObj, 'dd/MM/yyyy'), age, type: (row.Type || 'Employee'), isValid: age >= 1 && age <= 65 };
                    });
                    setMembers(parsed);
                    setActiveModule('analysis');
                  };
                  reader.readAsBinaryString(file);
                }} accept=".xlsx, .xls" />
              </div>
            </div>
            <Card className="border-none shadow-md">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Full Name</TableHead><TableHead>Age</TableHead><TableHead>Relationship</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id} className={!m.isValid ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="secondary">{m.age === -1 ? 'Err' : m.age}</Badge></TableCell>
                      <TableCell>{m.type}</TableCell>
                      <TableCell>{m.isValid ? <Badge className="bg-emerald-100 text-emerald-700">Valid</Badge> : <Badge variant="destructive">Invalid</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      case 'analysis':
        const isViewMode = searchParams.get('view') === 'true';
        const plansToDisplay = isViewMode 
          ? ALL_PLANS.filter(p => selectedPlanIds.includes(p.id))
          : ALL_PLANS;

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-sme-primary">
                  {isViewMode ? `Viewing Quotation: ${companyInfo.name}` : `Pricing Engine: ${companyInfo.name}`}
                </h3>
                {isViewMode && <p className="text-xs text-slate-500">Only showing selected programs. Contract starts: {companyInfo.startDate}</p>}
              </div>
              {!isViewMode && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveQuotation} disabled={isSaving || selectedPlanIds.length === 0}>
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <div className="flex items-center gap-2"><Save className="w-4 h-4" /> Issue Offer</div>}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plansToDisplay.map(p => {
                const ana = getPlanAnalysis(p);
                const sel = selectedPlanIds.includes(p.id);
                const isInvalid = ana.premium === -1;
                
                return (
                  <Card key={p.id} className={cn("relative border-2 transition-all duration-300 flex flex-col group", !sel ? "border-transparent shadow-sm" : "border-sme-accent shadow-xl ring-1 ring-sme-accent/20", isInvalid && "opacity-75 grayscale-[0.5]")}>
                    {!isViewMode && (
                      <div className="absolute top-3 right-3 z-10">
                        <Checkbox 
                          checked={sel} 
                          disabled={isInvalid}
                          onCheckedChange={c => setSelectedPlanIds(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))} 
                          className="w-5 h-5" 
                        />
                      </div>
                    )}
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.company}</p>
                      <CardTitle className="text-lg font-bold text-sme-primary">{p.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-6 space-y-6 flex-1">
                      {isInvalid ? (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          {ana.ineligibleReason}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">Annual Limit</span>
                          <span className="font-black text-blue-900">{p.annualLimit}</span>
                        </div>
                        <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                          <span className="block text-[9px] text-teal-400 font-bold uppercase mb-0.5">TPA Provider</span>
                          <span className="font-black text-teal-900">{p.tpa}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-500" /> Benefit Details
                        </p>
                        <div className="bg-white rounded-lg border p-3 space-y-0.5">
                          <BenefitItem icon={Hotel} label="Accommodation" value={p.accommodation} colorClass="bg-indigo-50 text-indigo-600" />
                          <BenefitItem icon={Stethoscope} label="Consultations" value={p.consultations} colorClass="bg-blue-50 text-blue-600" />
                          <BenefitItem icon={Activity} label="Radiology/Lab" value={p.radiologyLab} colorClass="bg-teal-50 text-teal-600" />
                          <BenefitItem icon={Briefcase} label="Medications" value={p.medications} colorClass="bg-emerald-50 text-emerald-600" />
                          <BenefitItem icon={Baby} label="Maternity" value={p.maternity} colorClass="bg-pink-50 text-pink-600" />
                          <BenefitItem icon={Eye} label="Optical" value={p.optical} colorClass="bg-amber-50 text-amber-600" />
                          <BenefitItem icon={ShieldAlert} label="Chronic Limits" value={p.chronicPreExisting} colorClass="bg-red-50 text-red-600" />
                          <BenefitItem icon={Globe} label="Network" value={p.network} colorClass="bg-slate-50 text-slate-600" />
                        </div>
                      </div>

                      <div className="mt-auto pt-4">
                        <div className={cn("p-4 rounded-xl flex items-center justify-between shadow-md text-white transition-colors", isInvalid ? "bg-slate-400" : "bg-sme-primary shadow-indigo-200/50")}>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Calculated Premium</span>
                            <span className="text-xl font-black">{ana.premium > 0 ? `${ana.premium.toLocaleString()} EGP` : '---'}</span>
                          </div>
                          <Calculator className="w-6 h-6 text-white/30" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-120px)] gap-6 -m-4 lg:-m-6 bg-sme-bg p-4 lg:p-6">
      <aside className="w-full lg:w-64 bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-2 h-fit lg:sticky lg:top-6">
        <div className="px-4 py-6 mb-2 border-b border-slate-100">
          <h1 className="text-2xl font-black text-sme-primary flex items-center gap-2"><Calculator className="w-6 h-6 text-sme-accent" /> IWIB</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">SME Medical Module</p>
        </div>
        <NavButton icon={LayoutDashboard} label="Dashboard" active={activeModule === 'dashboard'} onClick={() => { setActiveModule('dashboard'); router.push('/underwriting/medical-pricing'); }} />
        <NavButton icon={Building2} label="Issue New Quote" active={activeModule === 'company'} onClick={() => { setActiveModule('company'); router.push('/underwriting/medical-pricing'); }} />
        <NavButton icon={Users} label="Census Preview" active={activeModule === 'census'} onClick={() => setActiveModule('census')} badge={members.length > 0 ? members.length.toString() : undefined} />
        <NavButton icon={PieChartIcon} label="Pricing Results" active={activeModule === 'analysis'} onClick={() => setActiveModule('analysis')} />
      </aside>
      <main className="flex-1">{renderModuleContent()}</main>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", active ? "bg-sme-primary text-white shadow-lg border-l-4 border-sme-accent pl-3" : "text-slate-500 hover:bg-slate-50")}>
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <Badge className={cn("text-[10px] h-5", active ? "bg-sme-accent text-white" : "bg-slate-100")}>{badge}</Badge>}
    </button>
  );
}
