'use client';
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, Clock, Calendar, Calculator, 
  Activity, ExternalLink, Edit, Trash2, CheckCircle2,
  FileDown, Printer, AlertTriangle, Upload, Save, Loader2,
  Building2, Smile, Eye, Baby, HeartPulse, Hospital, ShieldAlert, Hotel, Globe, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCollection, useUser } from "@/firebase";
import { format } from "date-fns";
import type { SMEOffer, Member } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import FormDialog from "@/components/shared/FormDialog";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { cn } from "@/lib/utils";
import { generatePremiumPDF } from "@/lib/pdf-utils";
import { SME_PLANS } from "@/lib/plans-data";

export default function QuotationHistoryPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SMEOffer | null>(null);
  const [editFormData, setEditFormData] = useState({ startDate: "", members: [] as Member[] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch history from sme_offers
  // We use the ID from the URL which could be companyId or company_name
  const { data: rawOffers = [], isLoading } = useCollection<SMEOffer>('sme_offers');

  const history = useMemo(() => {
    return (rawOffers || [])
      .filter(offer => 
        offer.selected_plans.companyId === id || 
        offer.company_name === id
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawOffers, id]);

  const companyName = history[0]?.company_name || "Client History";

  const handleEdit = (quote: SMEOffer) => {
    setSelectedVersion(quote);
    setEditFormData({
      startDate: quote.selected_plans.policyStartDate,
      members: quote.selected_plans.members
    });
    setEditModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const parsed: Member[] = data.map((row, i) => ({
        id: (i+1).toString(),
        name: row.Name || `Member ${i+1}`,
        birthdate: format(new Date(row.Birthdate || row.DOB), 'dd/MM/yyyy'),
        age: 30, // Simplified
        type: row.Type || 'Employee',
        isValid: true
      }));
      setEditFormData(prev => ({ ...prev, members: parsed }));
      toast({ title: "New Census Loaded" });
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateNewVersion = async () => {
    if (!user || !selectedVersion) return;
    setIsProcessing(true);
    
    const newOffer = {
      user_id: user.uid,
      company_name: selectedVersion.company_name,
      offer_name: `${selectedVersion.offer_name} (Updated)`,
      selected_plans: {
        ...selectedVersion.selected_plans,
        members: editFormData.members,
        policyStartDate: editFormData.startDate,
      },
      total_premium: selectedVersion.total_premium,
      currency: selectedVersion.currency,
      status: 'issued',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('sme_offers').insert(newOffer).select().single();
      if (error) throw error;
      toast({ title: `New Version Created Successfully` });
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_offers'] });
      router.push(`/underwriting/medical-pricing?id=${data.id}`);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to create version' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (quoteId: string) => {
    try {
      const { error } = await supabase.from('sme_offers').update({ status: 'approved' }).eq('id', quoteId);
      if (error) throw error;
      toast({ title: "Offer Approved" });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_offers'] });
    } catch (err) { toast({ variant: 'destructive', title: 'Update failed' }); }
  };

  const handleDelete = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this version?")) return;
    try {
      const { error } = await supabase.from('sme_offers').delete().eq('id', quoteId);
      if (error) throw error;
      toast({ title: "Version Deleted" });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_offers'] });
    } catch (err) { toast({ variant: 'destructive', title: 'Delete failed' }); }
  };

  const handleExportPDF = async (quote: SMEOffer) => {
    setIsExporting(true);
    toast({ title: "Crafting Professional Report...", description: "Generating structured PDF with graphs and analysis." });
    
    try {
      const selectedPlans = SME_PLANS.filter((p: any) => 
        quote.selected_plans.planIds.includes(p["Plan ID"] || p.id)
      ).map((p: any) => ({
        id: p["Plan ID"] || p.id,
        company: p["Company Name"] || p.company,
        name: p["Plan Name"] || p.name,
        annualLimit: p["Annual Coverage Limits"] || p.annualLimit,
        tpa: p["TPA"] || p.tpa,
        network: p["Network"] || p.network,
        inpatient: p["Inpatient"] || p.inpatient,
        consultations: p["Consultations"] || p.consultations,
        medications: p["Medications"] || p.medications,
        dental: p["Dental"] || p.dental,
        optical: p["Optical"] || p.optical,
        annualLimitValue: parseInt(p["Annual Coverage Limits"]?.replace(/[^0-9]/g, '') || '0')
      }));

      const pdfResponse = await generatePremiumPDF(quote.id, {
        offerName: quote.offer_name,
        companyName: quote.company_name,
        date: format(new Date(quote.created_at), 'dd/MM/yyyy'),
        plans: selectedPlans as any,
        snapshots: quote.selected_plans.snapshots,
        chat: [
          { side: 'left', author: 'IWIB Advisor', text: `This is a summary of the quotation issued on ${format(new Date(quote.created_at), 'MMM d')}.` },
          { side: 'right', author: 'System', text: `Analyzing ${selectedPlans.length} plans...` },
          { side: 'left', author: 'Advisor', text: 'Pricing comparisons and benefit scores are detailed in the following pages.' }
        ]
      });

      if (pdfResponse.success) {
        toast({ title: "Report Generated" });
        window.open(pdfResponse.url, '_blank');
        queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_offers'] });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'PDF Generation Failed', description: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/underwriting/medical-pricing')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{companyName}</h1>
            <p className="text-slate-500">Chronological history of all issued offers and modifications.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-sm bg-indigo-900 text-white">
          <CardHeader>
            <CardTitle className="text-indigo-200 uppercase text-[10px] tracking-widest font-black">Audit Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-black">{history.length}</p>
              <p className="text-xs text-indigo-300">Total Versions Issued</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                <span className="text-indigo-300">Last Activity</span>
                <span className="font-bold">{history[0] ? format(new Date(history[0].created_at), 'MMM d, yy') : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-300">Status</span>
                <Badge className="bg-emerald-500">{(history[0]?.status || 'Issued').toUpperCase()}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : history.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50/50">
              <CardContent className="py-12 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">No historical data available.</p>
              </CardContent>
            </Card>
          ) : (
            history.map((quote, idx) => (
              <React.Fragment key={quote.id}>
                <Card className={cn("relative border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden", quote.status === 'approved' && "ring-2 ring-emerald-500")}>
                  {quote.status === 'approved' && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> APPROVED
                    </div>
                  )}
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors font-bold">
                        #{history.length - idx}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{quote.offer_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-[10px]">
                          <Calendar className="w-3 h-3" /> {format(new Date(quote.created_at), 'PPPP p')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => router.push(`/underwriting/medical-pricing?id=${quote.id}&view=true`)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => handleEdit(quote)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(quote.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 border-t border-slate-50 bg-slate-50/20">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {quote.selected_plans.planIds?.map(pid => (
                          <Badge key={pid} variant="secondary" className="bg-white border text-[10px]">
                            {pid} • EGP {quote.selected_plans.snapshots?.[pid]?.premium?.toLocaleString() || '---'}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {quote.pdf_url && (
                          <Button size="sm" variant="outline" className="h-8 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 gap-2" onClick={() => window.open(quote.pdf_url, '_blank')}>
                            <Download className="w-3 h-3" /> Download Report
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-2" onClick={() => handleExportPDF(quote)} disabled={isExporting}>
                          {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                          {quote.pdf_url ? 'Regenerate PDF' : 'Print Premium PDF'}
                        </Button>
                        {quote.status !== 'approved' && (
                          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleApprove(quote.id)}>
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* HIDDEN PDF TEMPLATE */}
                <div className="fixed left-[-9999px] top-0">
                  <div id={`pdf-report-${quote.id}`} className="w-[210mm] p-12 bg-white text-slate-900 font-sans">
                    <div className="flex justify-between border-b-4 border-indigo-900 pb-8 mb-8">
                      <div>
                        <h1 className="text-4xl font-black text-indigo-900">MEDICAL OFFER</h1>
                        <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">{quote.offer_name} • {(quote.status || 'pending').toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">IWIB HUB</p>
                        <p className="text-sm font-medium">{format(new Date(quote.created_at), 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>
 
                    <div className="grid grid-cols-2 gap-12 mb-12">
                      <div className="space-y-2">
                        <h2 className="text-sm font-black text-indigo-900 uppercase border-b-2 border-indigo-100 pb-1">Client</h2>
                        <p className="text-xl font-bold">{quote.company_name}</p>
                        <p className="text-sm text-slate-500">Contract Starts: {format(new Date(quote.selected_plans.policyStartDate), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-sm font-black text-indigo-900 uppercase border-b-2 border-indigo-100 pb-1">Census Summary</h2>
                        <p className="text-xl font-bold">{quote.selected_plans.members.length} Insured Members</p>
                        <p className="text-sm text-slate-500">Total Premium: EGP {quote.total_premium.toLocaleString()}</p>
                      </div>
                    </div>
 
                    <div className="space-y-6">
                      <h2 className="text-lg font-black text-indigo-900 uppercase">Selected Plans Comparison</h2>
                      <div className="grid grid-cols-2 gap-8">
                        {quote.selected_plans.planIds.map(pid => {
                          const snapshot = quote.selected_plans.snapshots?.[pid];
                          return (
                            <div key={pid} className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/30">
                              <h3 className="text-xl font-black text-indigo-900 mb-4">{pid}</h3>
                              <div className="space-y-2 mb-6 text-sm">
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                  <span className="text-slate-500 font-bold">Annual Limit</span>
                                  <span className="font-bold">Covered</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                  <span className="text-slate-500 font-bold">Total Members</span>
                                  <span className="font-bold">{snapshot?.breakdown?.totalMembers}</span>
                                </div>
                              </div>
                              <div className="bg-indigo-900 text-white p-4 rounded-xl flex justify-between items-center">
                                <span className="font-bold uppercase text-[10px] tracking-widest text-indigo-300">Net Premium</span>
                                <span className="text-2xl font-black">EGP {snapshot?.premium?.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-20 pt-8 border-t border-slate-200 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      This is a professional insurance quotation provided by IWIB Hub • Validity subject to medical underwriting.
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      <FormDialog 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen} 
        title={`Modify Quotation & Issue New Version`}
        size="lg"
      >
        <div className="space-y-6 py-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p><strong>Versioning Active:</strong> Saving changes will create a new historical version. The current offer will remain locked.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Updated Contract Start Date</Label>
              <Input 
                type="date" 
                value={editFormData.startDate} 
                onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Update Census List (Excel)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full h-12 gap-2 border-dashed" onClick={() => document.getElementById('census-upload')?.click()}>
                  <Upload className="w-4 h-4" /> Upload New File
                </Button>
                <input id="census-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls" />
              </div>
              {editFormData.members.length > 0 && (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {editFormData.members.length} members loaded from file
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={handleCreateNewVersion} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save as New Version
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
