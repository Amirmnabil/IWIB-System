
'use client';
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calculator, Building2, Users, PieChart as PieChartIcon,
  ChevronRight, Upload, FileDown, FileText,
  Lock, Globe, CheckCircle2, Save, Trash2, ExternalLink, Loader2,
  Plus, Printer, Stethoscope, Heart, Briefcase, Eye, Baby, ShieldCheck,
  Activity, LayoutDashboard, Pill, Thermometer, ShieldAlert,
  Hotel, AlertTriangle, Copy, Search, Calendar, Download, Edit,
  CreditCard, Shield, HeartPulse, Hospital, Smile, Filter, X
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
import { SME_PLANS, SME_PREMIUMS } from "@/lib/plans-data";
import type { SMEPlan } from "@/lib/types";
import { getPremium } from "@/lib/pricing-matrix";
import { useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Company, SMEOffer, Member, CalculationBreakdown } from "@/lib/types";
import { calculateSMEAge, parseDateString } from "@/lib/age-utils";

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { OfferPDFTemplate } from "@/components/sme-pricing/OfferPDFTemplate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { PlanFilterSidebar, type PlanFilters } from "@/components/sme-pricing/PlanFilterSidebar";

const INITIAL_FILTERS: PlanFilters = {
  searchQuery: "",
  companies: [],
  tpas: [],
  lifeInsurance: null,
  annualLimit: [0, 5000000],
  consultations: [0, 100],
  radiologyLab: [0, 100],
  dental: [0, 50000],
  optical: [0, 20000],
  maternity: [0, 100000],
  chronic: [0, 500000],
};

const COMPANY_LOGOS: Record<string, string> = {
  "Sarwa General": "https://i.ibb.co/vxTfzGV9/Sarwa.jpg",
  "AXA": "https://i.ibb.co/S4MDnzHV/AXA.jpg",
  "Arope": "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "Arop": "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "GIG": "https://i.ibb.co/yFT6pVNy/GIG.jpg",
  "Libano Suisse": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Linbano Suisse": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Labanoswiss": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Metlife": "https://i.ibb.co/qF5q9XkZ/Metlife.jpg",
  "Misr Insurance Takaful": "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg",
  "Misr Insurance Takaful life": "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg",
  "Sarwa Life": "https://i.ibb.co/hFhPXhDG/Sarwa-LIfe.jpg",
  "Orient": "https://i.ibb.co/fdwy8fb7/Orient.jpg"
};

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  const lower = str.toLowerCase();
  if (lower.includes('full coverage') || lower.includes('unlimited')) return 10000000;
  const num = parseInt(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
};

const parsePercent = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  const lower = str.toLowerCase();
  if (lower.includes('full coverage') || lower.includes('unlimited')) return 100;
  const match = str.match(/(\d+)\s*%/);
  return match ? parseInt(match[1]) : 0;
};

type SMEModule = 'dashboard' | 'company' | 'census' | 'analysis';

const BenefitItem = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) => {
  if (!value || value === 'Not covered' || value === 'None' || value.toLowerCase().includes('not covered')) return null;
  return (
    <div className="flex items-start gap-3 text-xs py-2.5 border-b border-slate-100/50 last:border-0">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-400 font-semibold mb-0.5 text-[10px] uppercase tracking-wider">{label}</div>
        <div className="text-slate-700 font-bold leading-snug whitespace-pre-line">{value}</div>
      </div>
    </div>
  );
};

export default function SMEMedicalPricingTool() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
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
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [cashbackAmount, setCashbackAmount] = useState("");
  const [downloadingQuote, setDownloadingQuote] = useState<SMEOffer | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [filters, setFilters] = useState<PlanFilters>(INITIAL_FILTERS);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Load from Query Params (View Mode) using cached hook
  const quotationId = searchParams.get('id');
  const isViewMode = searchParams.get('view') === 'true';

  const { data: firestorePlans } = useCollection<any>('sme_plans', { staleTime: 1000 * 60 * 60 });
  const ALL_PLANS = useMemo(() => {
    const rawPlans = SME_PLANS;
    // Map database names (with spaces) back to our internal camelCase names
    return rawPlans.map((p: any) => ({
      id: p["Plan ID"] || p.id,
      company: p["Company Name"] || p.company,
      name: p["Plan Name"] || p.name,
      annualLimit: p["Annual Coverage Limits"] || p.annualLimit,
      annualLimitValue: p.annualLimitValue || parseNum(p["Annual Coverage Limits"] || p.annualLimit),
      lifeInsurance: p["Life Insurance"] || p.lifeInsurance,
      tpa: p["TPA"] || p.tpa,
      network: p["Network"] || p.network,
      accommodation: p["Accommodation"] || p.accommodation,
      inpatient: p["Inpatient"] || p.inpatient,
      consultations: p["Consultations"] || p.consultations,
      radiologyLab: p["Radiology & laboratory"] || p.radiologyLab,
      medications: p["Medications"] || p.medications,
      dental: p["Dental"] || p.dental,
      optical: p["Optical"] || p.optical,
      maternity: p["Maternity"] || p.maternity,
      chronicPreExisting: p["Chronic & Pre-existing"] || p.chronicPreExisting,
      covid19: p["COVID-19"] || p.covid19,
      outOfNetwork: p["Out-of-Network Reimbursement"] || p.outOfNetwork,
      minMembers: p["Minimum Member Count"] || p.minMembers,
      maxMembers: p["Maximum members count"] || p.maxMembers,
      paymentTerms: p["Payment terms"] || p.paymentTerms
    })) as SMEPlan[];
  }, [firestorePlans]);

  // Advanced Filtering Logic (Top Level)
  const filteredPlans = useMemo(() => {
    let pool = isViewMode
      ? ALL_PLANS.filter(p => selectedPlanIds.includes(p.id))
      : ALL_PLANS;

    if (showOnlyActive) {
      pool = pool.filter(p => selectedPlanIds.includes(p.id));
    }

    return pool.filter(p => {
      // Search
      if (filters.searchQuery && !p.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !p.company.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;

      // Companies
      if (filters.companies.length > 0 && !filters.companies.includes(p.company)) return false;

      // TPAs
      if (filters.tpas.length > 0 && !filters.tpas.includes(p.tpa)) return false;

      // Life
      if (filters.lifeInsurance !== null) {
        const hasLife = p.lifeInsurance && p.lifeInsurance !== 'Not covered' && p.lifeInsurance !== 'None';
        if (filters.lifeInsurance !== hasLife) return false;
      }

      // Ranges - Only apply if changed from default
      if (filters.annualLimit[0] > INITIAL_FILTERS.annualLimit[0] || filters.annualLimit[1] < INITIAL_FILTERS.annualLimit[1]) {
        if (p.annualLimitValue < filters.annualLimit[0] || p.annualLimitValue > filters.annualLimit[1]) return false;
      }

      if (filters.consultations[0] > INITIAL_FILTERS.consultations[0] || filters.consultations[1] < INITIAL_FILTERS.consultations[1]) {
        const cons = parsePercent(p.consultations);
        if (cons < filters.consultations[0] || cons > filters.consultations[1]) return false;
      }

      if (filters.radiologyLab[0] > INITIAL_FILTERS.radiologyLab[0] || filters.radiologyLab[1] < INITIAL_FILTERS.radiologyLab[1]) {
        const rad = parsePercent(p.radiologyLab);
        if (rad < filters.radiologyLab[0] || rad > filters.radiologyLab[1]) return false;
      }

      if (filters.dental[0] > INITIAL_FILTERS.dental[0] || filters.dental[1] < INITIAL_FILTERS.dental[1]) {
        const den = parseNum(p.dental);
        if (den < filters.dental[0] || den > filters.dental[1]) return false;
      }

      if (filters.optical[0] > INITIAL_FILTERS.optical[0] || filters.optical[1] < INITIAL_FILTERS.optical[1]) {
        const opt = parseNum(p.optical);
        if (opt < filters.optical[0] || opt > filters.optical[1]) return false;
      }

      if (filters.maternity[0] > INITIAL_FILTERS.maternity[0] || filters.maternity[1] < INITIAL_FILTERS.maternity[1]) {
        const mat = parseNum(p.maternity);
        if (mat < filters.maternity[0] || mat > filters.maternity[1]) return false;
      }

      if (filters.chronic[0] > INITIAL_FILTERS.chronic[0] || filters.chronic[1] < INITIAL_FILTERS.chronic[1]) {
        const chr = parseNum(p.chronicPreExisting);
        if (chr < filters.chronic[0] || chr > filters.chronic[1]) return false;
      }

      return true;
    });
  }, [ALL_PLANS, filters, selectedPlanIds, showOnlyActive, isViewMode]);

  const plansToDisplay = filteredPlans;

  const quotationRef = useMemoFirebase(() =>
    quotationId ? { path: `sme_offers/${quotationId}` } : null
    , [quotationId]);

  const { data: currentOffer } = useDoc<SMEOffer>(quotationRef);

  useEffect(() => {
    if (currentOffer) {
      setCompanyInfo({
        name: currentOffer.company_name,
        id: currentOffer.selected_plans.companyId || "",
        startDate: currentOffer.selected_plans.policyStartDate
      });
      const policyStartDate = currentOffer.selected_plans.policyStartDate;
      
      // Recalculate ages for existing offers based on the new logic
      const updatedMembers = (currentOffer.selected_plans.members || []).map(m => {
        const birthDateObj = parseDateString(m.birthdate);
        const newAge = calculateSMEAge(birthDateObj, policyStartDate);
        
        // Re-validate based on new age
        let isValidMember = true;
        let invalidReason: string | undefined = undefined;
        if (newAge < 0) {
          isValidMember = false;
          invalidReason = 'Invalid Age';
        } else if (m.type === 'Child' && newAge >= 18) {
          isValidMember = false;
          invalidReason = 'Child age >= 18';
        } else if ((m.type === 'Employee' || m.type === 'Spouse') && newAge < 18) {
          isValidMember = false;
          invalidReason = 'Adult age < 18';
        }

        return { ...m, age: newAge, isValid: isValidMember, invalidReason };
      });

      setMembers(updatedMembers);
      setSelectedPlanIds(currentOffer.selected_plans.planIds || []);
      setCurrentQuotationId(quotationId);
      if (isViewMode) {
        setActiveModule('analysis');
      }
    }
  }, [currentOffer, quotationId, isViewMode]);

  // --- DASHBOARD QUERYING ---
  const [dashboardFilters, setDashboardFilters] = useState({ companyName: '', dateFrom: '', dateTo: '' });
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);

  const offersFilter = useCallback((query: any) => {
    let q = query;
    if (dashboardFilters.companyName) {
      q = q.ilike('company_name', `%${dashboardFilters.companyName}%`);
    }
    if (dashboardFilters.dateFrom) {
      q = q.gte('created_at', new Date(dashboardFilters.dateFrom).toISOString());
    }
    if (dashboardFilters.dateTo) {
      const toDate = new Date(dashboardFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      q = q.lte('created_at', toDate.toISOString());
    }
    return q;
  }, [dashboardFilters]);

  const { data: rawOffers = [], isLoading: isLoadingQuotations } = useSupabaseCollection<SMEOffer>('sme_offers', offersFilter, { enabled: !!user?.uid });

  // All offers for Dashboard
  const dashboardOffers = useMemo(() => {
    if (!rawOffers) return [];
    return rawOffers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawOffers]);

  const { data: crmCompanies } = useCollection<Company>('companies', { select: 'id,name', staleTime: 1000 * 60 * 60 });

  const { data: firestorePremiums } = useCollection<any>('sme_premiums', { select: 'id,emp,spouse,child', staleTime: 1000 * 60 * 60 });


  // Use shared calculateSMEAge utility

  const getPlanAnalysis = (plan: SMEPlan): { premium: number; breakdown: CalculationBreakdown | null; ineligibleReason?: string } => {
    // IMMUTABLE PRICING LOGIC
    if (isViewMode && currentOffer?.selected_plans?.snapshots?.[plan.id]) {
      const snap = currentOffer.selected_plans.snapshots[plan.id];
      return { premium: snap.premium, breakdown: snap.breakdown };
    }

    // EXPIRY DATE LOGIC
    const PREMIUM_EXPIRY_DATE = new Date('2026-12-30T23:59:59Z');
    if (new Date() > PREMIUM_EXPIRY_DATE) {
      return { premium: -1, breakdown: null, ineligibleReason: 'Premiums expired on 30 Dec 2026. Update required.' };
    }

    if (!members || members.length === 0) return { premium: 0, breakdown: null };

    let employeeCount = 0;
    let totalValidCount = 0;
    members.forEach(m => {
      if (m.isValid) {
        totalValidCount++;
        if (m.type === 'Employee') employeeCount++;
      }
    });

    if (employeeCount < (plan.minMembers || 0)) return { premium: -1, breakdown: null, ineligibleReason: `Requires min. ${plan.minMembers} Employees (Has ${employeeCount})` };
    if (plan.maxMembers && totalValidCount > plan.maxMembers) return { premium: -1, breakdown: null, ineligibleReason: `Exceeds max. ${plan.maxMembers} members (Has ${totalValidCount})` };

    const breakdown: CalculationBreakdown = { employeeTotal: 0, spouseTotal: 0, childTotal: 0, totalMembers: 0, excludedMembers: 0 };

    members.forEach(m => {
      if (!m.isValid || isNaN(m.age)) { breakdown.excludedMembers++; return; }

      let memberPremium = 0;
      let planPremiums = SME_PREMIUMS[plan.id]?.[m.age];

      if (!planPremiums && SME_PREMIUMS[plan.id]) {
        const availableAges = Object.keys(SME_PREMIUMS[plan.id]).map(Number).sort((a, b) => a - b);
        if (availableAges.length > 0) {
          let fallbackAge = availableAges.filter(a => a <= m.age).pop();
          if (fallbackAge === undefined) fallbackAge = availableAges[0];
          planPremiums = SME_PREMIUMS[plan.id][fallbackAge];
        }
      }

      if (planPremiums) {
        if (m.type === 'Employee') memberPremium = planPremiums.emp || 0;
        else if (m.type === 'Spouse') memberPremium = planPremiums.spouse || 0;
        else if (m.type === 'Child') memberPremium = planPremiums.child || 0;
      }

      if (m.type === 'Employee') breakdown.employeeTotal += memberPremium;
      else if (m.type === 'Spouse') breakdown.spouseTotal += memberPremium;
      else if (m.type === 'Child') breakdown.childTotal += memberPremium;
      breakdown.totalMembers++;
    });

    const totalPremium = breakdown.employeeTotal + breakdown.spouseTotal + breakdown.childTotal;
    return { premium: totalPremium, breakdown };
  };

  const generateSnapshots = () => {
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
    return snapshots;
  };

  const handleSaveQuotation = async () => {
    if (!user) return;
    setIsSaving(true);

    const snapshots = generateSnapshots();
    const selectedPlans = ALL_PLANS.filter(p => selectedPlanIds.includes(p.id));

    const offerData = {
      user_id: user.uid,
      company_name: companyInfo.name,
      offer_name: offerName || `Offer for ${companyInfo.name}`,
      selected_plans: {
        members: members,
        planIds: selectedPlanIds,
        snapshots: snapshots,
        policyStartDate: companyInfo.startDate,
        companyId: companyInfo.id,
        cashbackAmount: cashbackAmount ? Number(cashbackAmount) : undefined
      },
      comparison_data: null,
      total_premium: Object.values(snapshots).reduce((acc: number, snap: any) => acc + snap.premium, 0),
      currency: 'EGP',
      status: 'issued',
      updated_at: new Date().toISOString()
    };

    try {
      let offerId = currentQuotationId;

      if (offerId) {
        const { error } = await supabase.from('sme_offers').update(offerData).eq('id', offerId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('sme_offers').insert(offerData).select().single();
        if (error) throw error;
        offerId = data.id;
      }

      // GENERATE PREMIUM PDF
      toast({ title: "Crafting High-Resolution Report...", description: "Optimizing layout for print & clarity." });

      if (pdfContainerRef.current) {
        const slides = Array.from(pdfContainerRef.current.children) as HTMLElement[];
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        // A4 base dimensions in mm
        const a4Width = 210;
        const a4Height = 297;
        const scale = 2.5; // High resolution (~300 DPI)

        for (let i = 0; i < slides.length; i++) {
          const orientation = slides[i].getAttribute('data-orientation') || 'landscape';
          const isPortrait = orientation === 'portrait';
          
          if (i > 0) pdf.addPage('a4', isPortrait ? 'portrait' : 'landscape');
          
          const canvas = await html2canvas(slides[i], { 
            scale, 
            useCORS: true, 
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.85); // High quality JPEG
          const pdfW = isPortrait ? a4Width : a4Height;
          const pdfH = isPortrait ? a4Height : a4Width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
        }

        const pdfBlob = pdf.output('blob');
        const fileName = `offers/${offerId}_${Date.now()}.pdf`;

        // Force local download immediately so the user gets the file
        pdf.save(`${offerName || 'SME_Offer'}.pdf`);

        try {
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
            await supabase.from('sme_offers').update({ pdf_url: publicUrl }).eq('id', offerId);
          } else {
            console.warn("Storage upload skipped:", uploadError.message);
          }
        } catch (e) {
          console.warn("Storage upload failed/skipped:", e);
        }

        toast({ title: "Offer Saved & Downloaded", description: "The professional PDF has been generated and saved." });
      }
      queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_offers'] });
      setIsOfferDialogOpen(false);
      setActiveModule('dashboard');
    } catch (err) {
      console.error("Save quotation failed:", err);
      toast({ variant: 'destructive', title: 'Save Failed', description: String(err) });
    } finally { setIsSaving(false); }
  };

  useEffect(() => {
    if (downloadingQuote && pdfContainerRef.current) {
      const triggerDownload = async () => {
        try {
          const slides = Array.from(pdfContainerRef.current!.children) as HTMLElement[];
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          const a4Width = 210;
          const a4Height = 297;
          const scale = 2.5;

          for (let i = 0; i < slides.length; i++) {
            const orientation = slides[i].getAttribute('data-orientation') || 'landscape';
            const isPortrait = orientation === 'portrait';
            
            if (i > 0) pdf.addPage('a4', isPortrait ? 'portrait' : 'landscape');
            
            const canvas = await html2canvas(slides[i], { 
              scale, 
              useCORS: true, 
              allowTaint: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdfW = isPortrait ? a4Width : a4Height;
            const pdfH = isPortrait ? a4Height : a4Width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
          }

          pdf.save(`${downloadingQuote.offer_name || 'SME_Offer'}.pdf`);
          toast({ title: "Offer Downloaded" });
        } catch (err) {
          console.error("PDF generation failed", err);
          toast({ variant: 'destructive', title: "Download Failed" });
        } finally {
          setDownloadingQuote(null);
        }
      };

      // small delay to let react render the template
      setTimeout(triggerDownload, 500);
    }
  }, [downloadingQuote]);

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg">Issued Clients</CardTitle>
                    <CardDescription>Click a company to view history and logs.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      placeholder="Filter by Company..."
                      className="w-[180px] h-9 text-xs"
                      value={dashboardFilters.companyName}
                      onChange={e => setDashboardFilters(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                    <Input
                      type="date"
                      className="w-[130px] h-9 text-xs"
                      value={dashboardFilters.dateFrom}
                      onChange={e => setDashboardFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      title="From Date"
                    />
                    <Input
                      type="date"
                      className="w-[130px] h-9 text-xs"
                      value={dashboardFilters.dateTo}
                      onChange={e => setDashboardFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      title="To Date"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setDashboardFilters({ companyName: '', dateFrom: '', dateTo: '' })}
                    >
                      Clear
                    </Button>
                    {selectedOfferIds.length > 0 && (
                      <Button
                        size="sm"
                        className="h-9 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          const selectedOffers = (rawOffers || []).filter(o => selectedOfferIds.includes(o.id));
                          const csvContent = "data:text/csv;charset=utf-8,Offer Name,Company,Date Issued,Total Premium\n"
                            + selectedOffers.map(o => `"${o.offer_name}","${o.company_name}","${format(new Date(o.created_at), 'MMM d yyyy')}","${o.total_premium}"`).join("\n");
                          const link = document.createElement("a");
                          link.setAttribute("href", encodeURI(csvContent));
                          link.setAttribute("download", `batch_export_${format(new Date(), 'yyyyMMdd')}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" /> Export ({selectedOfferIds.length})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="w-[50px] pl-4">
                        <Checkbox
                          checked={dashboardOffers.length > 0 && selectedOfferIds.length === dashboardOffers.length}
                          onCheckedChange={c => setSelectedOfferIds(c ? dashboardOffers.map(o => o.id) : [])}
                        />
                      </TableHead>
                      <TableHead className="font-bold">Offer Name</TableHead>
                      <TableHead className="font-bold">Company</TableHead>
                      <TableHead className="font-bold">Date Issued</TableHead>
                      <TableHead className="font-bold">Selected Plans</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotations ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                    ) : dashboardOffers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No issued offers yet.</TableCell></TableRow>
                    ) : dashboardOffers.map((quote) => (
                      <TableRow key={quote.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedOfferIds.includes(quote.id)}
                            onCheckedChange={c => setSelectedOfferIds(prev => c ? [...prev, quote.id] : prev.filter(id => id !== quote.id))}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-sme-primary">{quote.offer_name}</TableCell>
                        <TableCell className="font-medium text-slate-700">
                          <span
                            className="cursor-pointer hover:underline text-indigo-600 transition-colors"
                            onClick={() => router.push(`/underwriting/medical-pricing/history/${quote.selected_plans?.companyId || quote.company_name}`)}
                          >
                            {quote.company_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{format(new Date(quote.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {quote.selected_plans.planIds.slice(0, 3).map((pid: string) => (
                              <Badge key={pid} variant="secondary" className="text-[10px]">{pid}</Badge>
                            ))}
                            {quote.selected_plans.planIds.length > 3 && <Badge variant="outline" className="text-[10px]">+{quote.selected_plans.planIds.length - 3} more</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm" onClick={() => setDownloadingQuote(quote)} disabled={downloadingQuote?.id === quote.id}>
                            {downloadingQuote?.id === quote.id ? <Loader2 className="animate-spin w-4 h-4 text-sme-primary" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-sme-primary" />}
                          </Button>
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
                <Select value={companyInfo.id} onValueChange={(v) => { const s = crmCompanies?.find(c => c.id === v); if (s) setCompanyInfo({ ...companyInfo, id: v, name: s.name }); }}>
                  <SelectTrigger><SelectValue placeholder="Select from CRM" /></SelectTrigger>
                  <SelectContent>{crmCompanies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contract Start Date *</Label>
                <Input type="date" value={companyInfo.startDate} onChange={e => setCompanyInfo({ ...companyInfo, startDate: e.target.value })} />
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
              <div>
                <h3 className="text-xl font-bold">Member Census</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ages calculated based on Contract Start Date: <span className="font-bold text-sme-primary">{companyInfo.startDate}</span>
                </p>
              </div>
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
                      let birthDateObj = null;
                      if (birth instanceof Date) {
                        birthDateObj = birth;
                      } else if (typeof birth === 'number') {
                        birthDateObj = new Date(Math.round((birth - 25569) * 86400 * 1000));
                      } else if (typeof birth === 'string') {
                        const parts = birth.split(/[-/]/);
                        if (parts.length === 3) {
                          let day = parseInt(parts[0], 10);
                          let month = parseInt(parts[1], 10);
                          let year = parseInt(parts[2], 10);
                          if (month > 12 && day <= 12) { const t = day; day = month; month = t; }
                          if (year < 100) year += 2000;
                          birthDateObj = new Date(year, month - 1, day);
                        } else {
                          birthDateObj = new Date(birth);
                        }
                      }

                      const age = birthDateObj ? calculateSMEAge(birthDateObj, companyInfo.startDate) : -1;
                      const formattedDate = birthDateObj && isValid(birthDateObj) ? format(birthDateObj, 'dd/MM/yyyy') : 'Invalid';

                      let rawType = (row.Type || 'Employee').toString().trim().toUpperCase();
                      let type: 'Employee' | 'Spouse' | 'Child' = 'Employee';
                      if (rawType === 'E' || rawType === 'EMPLOYEE') type = 'Employee';
                      else if (rawType === 'S' || rawType === 'SPOUSE') type = 'Spouse';
                      else if (rawType === 'C' || rawType === 'CHILD') type = 'Child';

                      let isValidMember = true;
                      let invalidReason: string | undefined = undefined;

                      if (age < 0) {
                        isValidMember = false;
                        invalidReason = 'Invalid Age';
                      } else if (type === 'Child' && age >= 18) {
                        isValidMember = false;
                        invalidReason = 'Child age >= 18';
                      } else if ((type === 'Employee' || type === 'Spouse') && age < 18) {
                        isValidMember = false;
                        invalidReason = 'Adult age < 18';
                      }

                      return {
                        id: (i + 1).toString(),
                        name: row.Name || `Member ${i + 1}`,
                        birthdate: formattedDate,
                        age,
                        type,
                        isValid: isValidMember,
                        invalidReason
                      };
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
                      <TableCell>
                        {m.isValid ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Valid</Badge>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="destructive">Invalid</Badge>
                            {m.invalidReason && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">{m.invalidReason}</span>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      case 'analysis':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-sme-primary">
                  {isViewMode ? `Viewing Quotation: ${companyInfo.name}` : `Pricing Engine: ${companyInfo.name}`}
                </h3>
                {isViewMode && <p className="text-xs text-slate-500">Only showing selected programs. Contract starts: {companyInfo.startDate}</p>}
              </div>
              <div className="flex items-center gap-4">
                {!isViewMode && (
                  <Button
                    variant="outline"
                    className={cn("h-10 rounded-full gap-2 border-slate-200", filters !== INITIAL_FILTERS && "border-indigo-500 bg-indigo-50 text-indigo-700")}
                    onClick={() => setIsFilterSidebarOpen(true)}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {plansToDisplay.length < ALL_PLANS.length && (
                      <Badge className="bg-indigo-600 text-white ml-1 px-1.5 h-4 min-w-4 flex items-center justify-center">
                        {plansToDisplay.length}
                      </Badge>
                    )}
                  </Button>
                )}
                {!isViewMode && (
                  <div className="flex items-center gap-2 bg-white/50 border border-slate-200/50 px-4 py-2 rounded-full shadow-sm">
                    <Label htmlFor="active-only" className="text-[10px] font-black text-slate-500 uppercase cursor-pointer">Active Only</Label>
                    <Checkbox
                      id="active-only"
                      checked={showOnlyActive}
                      onCheckedChange={(c) => setShowOnlyActive(!!c)}
                      className="w-4 h-4"
                    />
                  </div>
                )}
                {!isViewMode && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-full h-10 px-6 font-bold" onClick={() => {
                      setOfferName(`Offer for ${companyInfo.name}`);
                      setIsOfferDialogOpen(true);
                    }} disabled={isSaving || selectedPlanIds.length === 0}>
                      {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <div className="flex items-center gap-2"><Save className="w-4 h-4" /> Issue Offer</div>}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Tags */}
            {plansToDisplay.length < ALL_PLANS.length && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Active Filters:</span>
                {filters.companies.map(c => (
                  <Badge key={c} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 gap-1 pr-1">
                    {c} <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, companies: filters.companies.filter(v => v !== c) })} />
                  </Badge>
                ))}
                {filters.tpas.map(t => (
                  <Badge key={t} variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100 gap-1 pr-1">
                    {t} <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, tpas: filters.tpas.filter(v => v !== t) })} />
                  </Badge>
                ))}
                {filters.searchQuery && (
                  <Badge variant="secondary" className="bg-slate-100 gap-1 pr-1">
                    "{filters.searchQuery}" <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, searchQuery: "" })} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="text-[10px] h-6 font-bold text-slate-400 hover:text-red-500" onClick={() => setFilters(INITIAL_FILTERS)}>
                  Clear All
                </Button>
              </div>
            )}
            {/* Dynamic KPIs & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Avg. Premium</p>
                  <p className="text-lg font-black text-slate-800">
                    {plansToDisplay.length > 0
                      ? (plansToDisplay.reduce((acc, p) => acc + (getPlanAnalysis(p).premium || 0), 0) / plansToDisplay.length).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : 0} EGP
                  </p>
                </div>
              </Card>
              <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Max Limit</p>
                  <p className="text-lg font-black text-slate-800">
                    {Math.max(...plansToDisplay.map(p => p.annualLimitValue), 0).toLocaleString()} EGP
                  </p>
                </div>
              </Card>
              <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">TPAs Available</p>
                  <p className="text-lg font-black text-slate-800">
                    {new Set(plansToDisplay.map(p => p.tpa)).size}
                  </p>
                </div>
              </Card>
              <Card className="bg-indigo-600 text-white border-none shadow-md p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase">Selected</p>
                  <p className="text-lg font-black">{selectedPlanIds.length} Plans</p>
                </div>
              </Card>
              <Card className="bg-red-50 text-red-600 border-none shadow-sm p-4 flex items-center gap-4">
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase">DEBUG COUNTS</p>
                  <p className="text-sm font-black">All: {ALL_PLANS.length} | Displayed: {plansToDisplay.length}</p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plansToDisplay.map(p => {
                const ana = getPlanAnalysis(p);
                const sel = selectedPlanIds.includes(p.id);
                const isInvalid = ana.premium === -1;

                return (
                  <Card key={p.id} className={cn(
                    "relative border border-slate-200/60 bg-white/80 backdrop-blur-sm transition-all duration-500 flex flex-col group h-auto break-inside-avoid print:shadow-none",
                    !sel ? "hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1" : "border-indigo-500 shadow-xl ring-2 ring-indigo-500/20",
                    isInvalid && "opacity-70 grayscale-[0.3] pointer-events-none"
                  )}>
                    {!isViewMode && (
                      <div className="absolute top-4 right-4 z-30">
                        <Checkbox
                          checked={sel}
                          disabled={isInvalid}
                          onCheckedChange={c => setSelectedPlanIds(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                          className={cn("w-5 h-5 rounded-md transition-colors pointer-events-auto", sel && "border-indigo-500 bg-indigo-500 text-white")}
                        />
                      </div>
                    )}

                    <CardHeader className={cn(
                      "p-6 pb-6 border-b transition-colors duration-500 relative",
                      sel ? "bg-indigo-50/50" : "bg-slate-50/30 group-hover:bg-slate-50"
                    )}>
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="pr-8 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="shrink-0 flex items-center justify-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                            {COMPANY_LOGOS[p.company] ? (
                              <img
                                src={COMPANY_LOGOS[p.company]}
                                alt={p.company}
                                loading="lazy"
                                className="h-8 w-auto object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full bg-slate-200 text-slate-600 items-center justify-center font-bold text-xs",
                                COMPANY_LOGOS[p.company] ? "hidden" : "flex"
                              )}
                            >
                              {p.company.substring(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-xl font-black text-slate-900 leading-tight truncate">{p.company}</CardTitle>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{p.name}</p>
                          </div>
                        </div>

                        {/* Quick Stats in Header */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Shield className="w-3 h-3 text-blue-500" /> Limit
                            </span>
                            <span className="font-bold text-slate-700 text-xs truncate" title={p.annualLimit}>{p.annualLimit}</span>
                          </div>
                          <div className="flex flex-col gap-1 border-l border-slate-200 pl-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-teal-500" /> TPA
                            </span>
                            <span className="font-bold text-slate-700 text-xs truncate" title={p.tpa}>{p.tpa}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col relative z-10">
                      {isInvalid && (
                        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center border-t border-slate-100">
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 max-w-[200px] shadow-sm">
                            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <span className="font-bold text-red-700 block text-sm">{ana.ineligibleReason}</span>
                          </div>
                        </div>
                      )}

                      <div className="p-6 flex-1 space-y-6">
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" /> Program Benefits
                          </p>
                          <div className="coverage-details h-[320px] overflow-y-auto pr-2 space-y-0.5 print:h-auto print:overflow-visible" style={{ scrollbarWidth: 'thin' }}>
                            <BenefitItem icon={Hotel} label="Inpatient" value={p.inpatient} colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100/50" />
                            <BenefitItem icon={Stethoscope} label="Consultations" value={p.consultations} colorClass="bg-blue-50 text-blue-600 border border-blue-100/50" />
                            <BenefitItem icon={Activity} label="Radiology/Lab" value={p.radiologyLab} colorClass="bg-teal-50 text-teal-600 border border-teal-100/50" />
                            <BenefitItem icon={Briefcase} label="Medications" value={p.medications} colorClass="bg-emerald-50 text-emerald-600 border border-emerald-100/50" />
                            <BenefitItem icon={Smile} label="Dental" value={p.dental} colorClass="bg-cyan-50 text-cyan-600 border border-cyan-100/50" />
                            <BenefitItem icon={Eye} label="Optical" value={p.optical} colorClass="bg-amber-50 text-amber-600 border border-amber-100/50" />
                            <BenefitItem icon={Baby} label="Maternity" value={p.maternity} colorClass="bg-pink-50 text-pink-600 border border-pink-100/50" />
                            <BenefitItem icon={HeartPulse} label="Life Insurance" value={p.lifeInsurance} colorClass="bg-rose-50 text-rose-600 border border-rose-100/50" />
                            <BenefitItem icon={ShieldAlert} label="Chronic Limits" value={p.chronicPreExisting} colorClass="bg-red-50 text-red-600 border border-red-100/50" />
                            <BenefitItem icon={Hospital} label="COVID-19" value={p.covid19} colorClass="bg-orange-50 text-orange-600 border border-orange-100/50" />
                            <BenefitItem icon={Globe} label="Network" value={p.network} colorClass="bg-slate-50 text-slate-600 border border-slate-100/50" />
                            <BenefitItem icon={ExternalLink} label="Out-of-Network" value={p.outOfNetwork} colorClass="bg-violet-50 text-violet-600 border border-violet-100/50" />
                          </div>
                        </div>
                      </div>

                      <div className="pricing-section mt-auto border-t border-slate-100 p-6 bg-slate-50/50 space-y-5 break-inside-avoid">
                        {ana.breakdown && ana.premium > 0 && (
                          <div className="grid grid-cols-3 gap-3 px-1">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Employees</span>
                              <span className="font-bold text-slate-800 text-xs">{ana.breakdown.employeeTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Spouses</span>
                              <span className="font-bold text-slate-800 text-xs">{ana.breakdown.spouseTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Children</span>
                              <span className="font-bold text-slate-800 text-xs">{ana.breakdown.childTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        <div 
                          className={cn(
                            "p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300",
                            sel ? "bg-indigo-600 shadow-indigo-100" : "bg-slate-900"
                          )}
                          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-0.5">Annual Net Premium</span>
                            <span className="text-2xl font-black text-white leading-none">
                              {ana.premium > 0 ? ana.premium.toLocaleString() : '---'}
                              <span className="text-xs ml-1 text-white/50">EGP</span>
                            </span>
                          </div>
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            sel ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                          )}>
                            <Calculator className="w-6 h-6" />
                          </div>
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

      {/* Advanced Filter Sidebar */}
      <PlanFilterSidebar
        open={isFilterSidebarOpen}
        onOpenChange={setIsFilterSidebarOpen}
        filters={filters}
        setFilters={setFilters}
        plans={ALL_PLANS}
        onReset={() => setFilters(INITIAL_FILTERS)}
        onApply={() => setIsFilterSidebarOpen(false)}
        resultsCount={plansToDisplay.length}
      />

      {/* Hidden PDF Templates */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none', zIndex: -9999 }}>
        {downloadingQuote ? (
          <OfferPDFTemplate
            ref={pdfContainerRef}
            offerName={downloadingQuote.offer_name || "Medical Insurance Offer"}
            companyName={downloadingQuote.company_name}
            date={format(new Date(downloadingQuote.created_at), 'dd/MM/yyyy')}
            plans={ALL_PLANS.filter(p => downloadingQuote.selected_plans.planIds.includes(p.id))}
            snapshots={downloadingQuote.selected_plans.snapshots || {}}
            cashbackAmount={downloadingQuote.selected_plans.cashbackAmount}
          />
        ) : isOfferDialogOpen ? (
          <OfferPDFTemplate
            ref={pdfContainerRef}
            offerName={offerName || "Medical Insurance Offer"}
            companyName={companyInfo.name}
            date={format(new Date(), 'dd/MM/yyyy')}
            plans={ALL_PLANS.filter(p => selectedPlanIds.includes(p.id))}
            snapshots={generateSnapshots()}
            cashbackAmount={cashbackAmount ? Number(cashbackAmount) : undefined}
          />
        ) : null}
      </div>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue New Offer</DialogTitle>
            <DialogDescription>Enter a name for this offer. It will be saved and downloaded as a PDF.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Offer Name</Label>
              <Input placeholder="e.g. Q3 Medical Offer" value={offerName} onChange={e => setOfferName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cashback Amount (Optional)</Label>
              <Input type="number" placeholder="e.g. 50000" value={cashbackAmount} onChange={e => setCashbackAmount(e.target.value)} />
              <p className="text-xs text-slate-500">If provided, includes the "Financial Flexibility" section in the presentation.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)}>Cancel</Button>
            <Button className="bg-sme-primary text-white" onClick={handleSaveQuotation} disabled={isSaving || !offerName.trim()}>
              {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              Generate & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
