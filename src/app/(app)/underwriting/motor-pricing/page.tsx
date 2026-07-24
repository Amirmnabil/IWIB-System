
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Car, Shield, Info, DollarSign, Calculator, 
  Trash2, Plus, Loader2, LayoutDashboard, ChevronRight, Save, Printer, Building2,
  Phone, User, Calendar, CheckCircle2, AlertTriangle, FileDown, ExternalLink,
  ChevronDown, Search, X, Briefcase, GripVertical, Percent, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/auth-provider";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useCallback } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { format, isValid } from "date-fns";
import { CAR_BRANDS } from "@/lib/car-data";
import { sampleInsuranceCompanies } from "@/lib/data";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MotorOffer {
  id: string;
  provider: string;
  name: string;
  baseRate: number;
  tplLimit: number;
  deductible: string;
  expiryDate?: string;
  features: {
    agencyRepair: boolean;
    naturalPerils: boolean;
    roadsideAssistance: boolean;
    totalLoss: boolean;
    theft: boolean;
  }
}

interface MotorQuotation {
  id: string;
  ownerName: string;
  mobile: string;
  brand: string;
  model: string;
  year: string;
  condition: 'new' | 'used';
  vehicleValue: number;
  startDate: string;
  selectedPlanIds: string[];
  created_at: string;
  user_id: string;
  user_name?: string;
}

type MotorModule = 'dashboard' | 'input' | 'analysis';

export default function MotorPricingPage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const { user } = useUser();

  const [activeModule, setActiveModule] = useState<MotorModule>('dashboard');
  const [ownerInfo, setOwnerInfo] = useState({ name: "", mobile: "" });
  const [vehicleInfo, setVehicleInfo] = useState({ 
    brand: "", 
    model: "", 
    year: "2024", 
    condition: "new" as 'new' | 'used', 
    value: "",
    startDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Supabase Queries
  const quotationsFilter = useCallback((q: any) => user?.id ? q.eq('user_id', user.id) : q.eq('user_id', 'none'), [user?.id]);
  const { data: savedQuotations, isLoading: isLoadingQuotations } = useSupabaseCollection<MotorQuotation>('motor_quotations', quotationsFilter, {
    filterKey: "motor_quotations-filter"
  });

  const { data: firestoreBrands } = useSupabaseCollection<any>('motor_brands');
  const { data: firestoreModels } = useSupabaseCollection<any>('motor_models');
  const { data: firestorePlans } = useSupabaseCollection<any>('motor_plans');

  // Fallbacks to static data if Firestore is empty
  const BRANDS = useMemo(() => {
    if (firestoreBrands && firestoreBrands.length > 0) return firestoreBrands;
    return CAR_BRANDS.map(b => ({ id: b.name.toLowerCase().replace(/\s+/g, '_'), name: b.name }));
  }, [firestoreBrands]);

  const availableModels = useMemo(() => {
    if (firestoreModels && firestoreModels.length > 0) {
      const selectedBrand = BRANDS.find(b => b.name === vehicleInfo.brand);
      return firestoreModels.filter((m: any) => m.brandId === selectedBrand?.id).map((m: any) => m.name);
    }
    const brand = CAR_BRANDS.find(b => b.name === vehicleInfo.brand);
    return brand ? brand.models : [];
  }, [vehicleInfo.brand, firestoreModels, BRANDS]);

  const ALL_OFFERS = useMemo(() => {
    let rawPlans = [];
    if (firestorePlans && firestorePlans.length > 0) {
      rawPlans = firestorePlans;
    } else {
      rawPlans = sampleInsuranceCompanies.map((insurer, idx) => ({
        id: insurer.id,
        insurerName: insurer.name,
        name: "Comprehensive Plan",
        baseRate: 0.025 + (idx % 5) * 0.005,
        tplLimit: 10000 + (idx % 3) * 5000,
        deductible: idx % 4 === 0 ? "Zero" : "500 EGP",
        expiryDate: "2025-12-31",
        agencyRepair: idx % 2 === 0,
        naturalPerils: true,
        roadsideAssistance: true,
        totalLoss: true,
        theft: true
      }));
    }

    return rawPlans
      .filter((p: any) => {
        // Expiry Validation
        if (!p.expiryDate) return true;
        const expiry = new Date(p.expiryDate);
        const start = new Date(vehicleInfo.startDate);
        return !isValid(expiry) || !isValid(start) || start <= expiry;
      })
      .map((p: any) => ({
        id: p.id,
        provider: p.insurerName,
        name: p.name,
        baseRate: p.baseRate,
        tplLimit: p.tplLimit,
        deductible: p.deductible,
        expiryDate: p.expiryDate,
        features: {
          agencyRepair: !!p.agencyRepair,
          naturalPerils: !!p.naturalPerils,
          roadsideAssistance: !!p.roadsideAssistance,
          totalLoss: !!p.totalLoss,
          theft: !!p.theft
        }
      } as MotorOffer));
  }, [firestorePlans, vehicleInfo.startDate]);

  const handleSaveQuotation = async () => {
    if (!user) return;
    setIsSaving(true);
    const quotationData = {
      ownerName: ownerInfo.name,
      mobile: ownerInfo.mobile,
      brand: vehicleInfo.brand,
      model: vehicleInfo.model,
      year: vehicleInfo.year,
      condition: vehicleInfo.condition,
      vehicleValue: Number(vehicleInfo.value),
      startDate: vehicleInfo.startDate,
      selectedPlanIds: selectedPlanIds,
      created_at: new Date().toISOString(),
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email || "System User"
    };
    try {
      if (currentQuotationId) {
        await supabase.from("motor_quotations").update(quotationData).eq("id", currentQuotationId);
        toast({ title: "Quotation Updated" });
      } else {
        const { data: newDoc, error } = await supabase.from("motor_quotations").insert(sanitizeUUIDs(quotationData)).select('id').single();
        if (error) throw error;
        setCurrentQuotationId(newDoc.id);
        toast({ title: "Quotation Saved" });
      }
    } catch (err) { 
      console.error(err);
      toast({ variant: "destructive", title: "Save Error" }); 
    } finally { setIsSaving(false); }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || selectedPlanIds.length === 0) return;
    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Motor_Quote_${ownerInfo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast({ title: "PDF Generated Successfully" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Export Error" });
    } finally { setIsExportingPDF(false); }
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="bg-indigo-900 text-white p-10 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-3">Motor Insurance Hub</h2>
                <p className="text-indigo-200 max-w-md text-lg">Generate and manage professional vehicle insurance offers instantly.</p>
              </div>
              <Car className="absolute right-[-40px] bottom-[-40px] w-64 h-64 text-white/5 rotate-[-15deg]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="group cursor-pointer border-2 border-dashed border-border hover:border-indigo-500 hover:bg-primary/10/30 transition-all duration-300 rounded-2xl" onClick={() => { setCurrentQuotationId(null); setOwnerInfo({name:"", mobile:""}); setVehicleInfo({brand:"", model:"", year:"2024", condition:"new", value:"", startDate: format(new Date(), 'yyyy-MM-dd')}); setSelectedPlanIds([]); setActiveModule('input'); }}>
                <CardContent className="pt-8 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-xl mb-1">New Quotation</h3>
                  <p className="text-muted-foreground">Calculate premiums for a new vehicle</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-sm bg-card rounded-2xl">
                <CardContent className="pt-8 flex items-center gap-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-success">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-3xl mb-1">{savedQuotations?.length || 0}</h3>
                    <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Saved Sessions</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="border-b bg-background/50">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/50">
                      <TableHead className="font-black">Owner</TableHead>
                      <TableHead className="font-black">Vehicle Details</TableHead>
                      <TableHead className="font-black">Value</TableHead>
                      <TableHead className="font-black text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotations ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                    ) : savedQuotations?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-400">No recent motor quotes.</TableCell></TableRow>
                    ) : savedQuotations?.map(quote => (
                      <TableRow key={quote.id} className="cursor-pointer hover:bg-background group" onClick={() => { setOwnerInfo({name: quote.ownerName, mobile: quote.mobile}); setVehicleInfo({brand: quote.brand, model: quote.model, year: quote.year, condition: quote.condition, value: quote.vehicleValue.toString(), startDate: quote.startDate || format(new Date(), 'yyyy-MM-dd')}); setSelectedPlanIds(quote.selectedPlanIds || []); setCurrentQuotationId(quote.id); setActiveModule('analysis'); }}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-indigo-900 group-hover:text-primary transition-colors">{quote.ownerName}</span>
                            <span className="text-xs text-muted-foreground font-mono">{quote.mobile}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-card">{quote.brand}</Badge>
                            <span className="font-medium text-slate-700">{quote.model} ({quote.year})</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-foreground">EGP {quote.vehicleValue?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); supabase.from("motor_quotations").delete().eq("id", quote.id).then(); }}>
                            <Trash2 className="w-4 h-4" />
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
      case 'input':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-indigo-900 text-white p-8">
                <CardTitle className="text-2xl font-black">Vehicle & Owner Details</CardTitle>
                
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-900">
                    <User className="w-5 h-5" /> 1. Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={ownerInfo.name} onChange={e => setOwnerInfo({...ownerInfo, name: e.target.value})} placeholder="Full legal name" className="h-12 border-border focus:border-indigo-500 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number *</Label>
                      <Input value={ownerInfo.mobile} onChange={e => setOwnerInfo({...ownerInfo, mobile: e.target.value})} placeholder="01XXXXXXXXX" className="h-12 border-border focus:border-indigo-500 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-indigo-900">
                    <Car className="w-5 h-5" /> 2. Vehicle Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Car Brand *</Label>
                      <Select value={vehicleInfo.brand} onValueChange={v => setVehicleInfo({...vehicleInfo, brand: v, model: ""})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                        <SelectContent>
                          {BRANDS.map((b: any) => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Car Model *</Label>
                      <Select value={vehicleInfo.model} onValueChange={v => setVehicleInfo({...vehicleInfo, model: v})} disabled={!vehicleInfo.brand}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Model" /></SelectTrigger>
                        <SelectContent>
                          {availableModels.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year of Manufacture *</Label>
                      <Select value={vehicleInfo.year} onValueChange={v => setVehicleInfo({...vehicleInfo, year: v})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 30}, (_, i) => (2025 - i).toString()).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Car Condition *</Label>
                      <Select value={vehicleInfo.condition} onValueChange={(v: any) => setVehicleInfo({...vehicleInfo, condition: v})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vehicle Market Value (EGP) *</Label>
                      <div className="relative">
                        <Input value={vehicleInfo.value} type="number" onChange={e => setVehicleInfo({...vehicleInfo, value: e.target.value})} placeholder="Enter market value" className={cn("h-12 border-border focus:border-indigo-500 rounded-xl", isRtl ? "pr-12" : "pl-12")} />
                        <span className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 font-bold", isRtl ? "right-3" : "left-3")}>EGP</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Policy Start Date *</Label>
                      <Input type="date" value={vehicleInfo.startDate} onChange={e => setVehicleInfo({...vehicleInfo, startDate: e.target.value})} className="h-12 border-border focus:border-indigo-500 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button onClick={() => setActiveModule('analysis')} className="w-full h-14 bg-indigo-900 hover:bg-indigo-800 text-lg font-black rounded-2xl shadow-lg transition-all" disabled={!vehicleInfo.value || !vehicleInfo.brand || !vehicleInfo.model || !ownerInfo.name}>
                    Generate Pricing Analysis <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'analysis':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-3xl font-black text-indigo-900">Pricing Analysis</h3>
                <p className="text-muted-foreground font-medium">Offers for {ownerInfo.name}&apos;s {vehicleInfo.brand} {vehicleInfo.model}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-11 rounded-xl font-bold gap-2" onClick={handleSaveQuotation} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
                <Button className="h-11 rounded-xl bg-primary hover:bg-indigo-700 font-bold gap-2" onClick={handleExportPDF} disabled={isExportingPDF || selectedPlanIds.length === 0}>
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  PDF Quote
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_OFFERS.length === 0 && (
                <Card className="col-span-full py-12 text-center text-slate-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-bold">No valid insurance offers found for this start date.</p>
                  <p className="text-sm">Try adjusting the Policy Start Date or check plan expiry dates in settings.</p>
                </Card>
              )}
              {ALL_OFFERS.map(offer => {
                const isSelected = selectedPlanIds.includes(offer.id);
                const premium = Number(vehicleInfo.value) * offer.baseRate;
                return (
                  <Card key={offer.id} className={cn("relative border-2 transition-all duration-300 rounded-2xl overflow-hidden group", isSelected ? "border-indigo-500 shadow-xl" : "border-transparent hover:border-border")}>
                    <div className="absolute top-4 right-4 z-10">
                      <Checkbox checked={isSelected} onCheckedChange={c => setSelectedPlanIds(prev => c ? [...prev, offer.id] : prev.filter(id => id !== offer.id))} className="w-6 h-6 rounded-lg data-[state=checked]:bg-primary" />
                    </div>
                    <CardHeader className="bg-background/50 border-b p-6">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{offer.provider}</p>
                      <CardTitle className="text-xl font-black text-indigo-900">{offer.name}</CardTitle>
                      {offer.expiryDate && (
                        <p className="text-[9px] text-slate-600 font-semibold">Valid until: {format(new Date(offer.expiryDate), 'MMM d, yyyy')}</p>
                      )}
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Base Rate</p>
                          <p className="text-sm font-black text-indigo-900">{(offer.baseRate * 100).toFixed(2)}%</p>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-xl">
                          <p className="text-[9px] font-black text-teal-400 uppercase mb-1">TPL Limit</p>
                          <p className="text-sm font-black text-teal-900">{offer.tplLimit?.toLocaleString()} EGP</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Included Features</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={cn("text-[10px] py-1 px-2 border-border", offer.features.agencyRepair ? "bg-success/10 text-emerald-700 border-emerald-100" : "bg-background text-slate-400 opacity-50")}>
                            {offer.features.agencyRepair ? "Agency Repair" : "Workshop Repair"}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/10 text-blue-700 border-blue-100 text-[10px] py-1 px-2">Roadside Asst.</Badge>
                          <Badge variant="outline" className="bg-primary/10 text-blue-700 border-blue-100 text-[10px] py-1 px-2">Natural Perils</Badge>
                        </div>
                      </div>

                      <div className="bg-indigo-900 p-5 rounded-2xl flex items-center justify-between shadow-lg text-white group-hover:scale-[1.02] transition-transform">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Yearly Premium</span>
                          <span className="text-2xl font-black">{premium.toLocaleString()} <span className="text-small">EGP</span></span>
                        </div>
                        <Calculator className="w-8 h-8 text-indigo-400/50" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="fixed left-[-9999px] top-0">
              <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-card p-12 space-y-10 text-foreground" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="flex justify-between items-start border-b-4 border-indigo-900 pb-8">
                  <div className="space-y-2">
                    <h1 className="text-5xl font-black text-indigo-900 tracking-tighter">MOTOR INSURANCE</h1>
                    <p className="text-xl text-muted-foreground font-bold uppercase tracking-widest">Quotation Comparison</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-2xl font-black">IWIB HUB</p>
                    <p className="text-standard text-muted-foreground">{format(new Date(), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-indigo-900 uppercase border-b-2 border-indigo-100 pb-2">Client Profile</h2>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground font-bold">Owner Name:</span><span className="font-black">{ownerInfo.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground font-bold">Mobile:</span><span className="font-black">{ownerInfo.mobile}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground font-bold">Start Date:</span><span className="font-black">{format(new Date(vehicleInfo.startDate), 'MMM d, yyyy')}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-indigo-900 uppercase border-b-2 border-indigo-100 pb-2">Vehicle Details</h2>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground font-bold">Car:</span><span className="font-black">{vehicleInfo.brand} {vehicleInfo.model}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground font-bold">Year / Condition:</span><span className="font-black uppercase">{vehicleInfo.year} • {vehicleInfo.condition}</span></div>
                      <div className="flex justify-between text-primary"><span className="font-bold">Market Value:</span><span className="font-black">EGP {Number(vehicleInfo.value).toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="text-lg font-black text-indigo-900 uppercase">Comparison Summary</h2>
                  <div className="grid grid-cols-2 gap-8">
                    {ALL_OFFERS.filter(o => selectedPlanIds.includes(o.id)).map(offer => {
                      const premium = Number(vehicleInfo.value) * offer.baseRate;
                      return (
                        <div key={offer.id} className="border-2 border-border rounded-3xl p-8 bg-background/30">
                          <p className="text-xs font-black text-slate-400 uppercase mb-1">{offer.provider}</p>
                          <h3 className="text-2xl font-black text-indigo-900 mb-6">{offer.name}</h3>
                          
                          <div className="space-y-4 mb-8">
                            <div className="flex justify-between border-b border-border pb-2"><span className="text-sm font-bold text-muted-foreground">Base Rate</span><span className="text-sm font-black">{(offer.baseRate * 100).toFixed(2)}%</span></div>
                            <div className="flex justify-between border-b border-border pb-2"><span className="text-sm font-bold text-muted-foreground">TPL Limit</span><span className="text-sm font-black">{offer.tplLimit.toLocaleString()} EGP</span></div>
                            <div className="flex justify-between border-b border-border pb-2"><span className="text-sm font-bold text-muted-foreground">Deductible</span><span className="text-sm font-black">{offer.deductible}</span></div>
                            <div className="flex justify-between border-b border-border pb-2"><span className="text-sm font-bold text-muted-foreground">Repair Type</span><span className="text-sm font-black">{offer.features.agencyRepair ? "Agency" : "Workshops"}</span></div>
                          </div>

                          <div className="bg-indigo-900 text-white p-6 rounded-2xl flex justify-between items-center">
                            <span className="font-bold uppercase text-xs tracking-widest text-indigo-300">Total Premium</span>
                            <span className="text-3xl font-black">EGP {premium.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-12 mt-12 border-t border-border text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  This quotation is valid for 7 days from the date of issuance • All rights reserved IWIB HUB
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-120px)] gap-6 -m-4 lg:-m-6 bg-background p-4 lg:p-6">
      <aside className="w-full lg:w-64 bg-card rounded-2xl shadow-sm border p-4 flex flex-col gap-2 h-fit lg:sticky lg:top-6">
        <div className="px-4 py-6 mb-2 border-b border-border">
          <h1 className="text-2xl font-black text-indigo-900 flex items-center gap-2"><Car className="w-6 h-6 text-primary" /> IWIB</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Motor Pricing</p>
        </div>
        <NavButton icon={LayoutDashboard} label="Dashboard" active={activeModule === 'dashboard'} onClick={() => setActiveModule('dashboard')} />
        <NavButton icon={Car} label="Vehicle Details" active={activeModule === 'input'} onClick={() => setActiveModule('input')} />
        <NavButton icon={Calculator} label="Pricing Analysis" active={activeModule === 'analysis'} onClick={() => setActiveModule('analysis')} />
      </aside>
      <main className="flex-1">{renderModuleContent()}</main>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", active ? "bg-indigo-900 text-white shadow-lg border-l-4 border-amber-500 pl-3" : "text-muted-foreground hover:bg-background")}>
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <Badge className={cn("text-[10px] h-5", active ? "bg-amber-500 text-white" : "bg-slate-100")}>{badge}</Badge>}
    </button>
  );
}
