'use client';

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import * as XLSX from "xlsx";
import { 
  ChevronLeft, ChevronRight, Download, Send, CheckCircle, CheckCircle2, XCircle, FileText, 
  Users, Banknote, RefreshCw, AlertTriangle, UserCheck, Calendar,
  Upload, X, Loader2, ExternalLink
} from "lucide-react";
import { calculateEndorsementTax } from "@/lib/endorsement-rules";
import { cn } from "@/lib/utils";

export default function EndorsementDetails({ id, onClose, onUpdate }: { id: string; onClose?: () => void; onUpdate?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [comments, setComments] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ diff: true, details: false, audit: false });
  
  // Verification popup states
  const [verifyingItem, setVerifyingItem] = useState<any | null>(null);
  const [verifyingNid, setVerifyingNid] = useState("");
  const [verifyingStaffCode, setVerifyingStaffCode] = useState("");
  const [verifyingInsuredId, setVerifyingInsuredId] = useState("");
  const [verifyingPrincipalId, setVerifyingPrincipalId] = useState("");
  const [verifyingIndividualId, setVerifyingIndividualId] = useState("");
  const [verificationError, setVerificationError] = useState("");

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const isModalMode = !!onClose;

  // 1. Fetch endorsement record and nested details
  const { data: endorsement, isLoading, error } = useQuery({
    queryKey: ['endorsementDetails', id],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase
        .from('endorsements')
        .select('*');

      if (isUuid) {
        query = query.or(`id.eq.${id},endorsement_number.eq.${id}`);
      } else {
        query = query.eq('endorsement_number', id);
      }

      const { data: endRecord, error: endError } = await query.maybeSingle();
      if (endError) throw endError;
      if (!endRecord) return null;

      // 2. Fetch Client
      if (endRecord.client_id) {
        const { data: clientData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', endRecord.client_id)
          .maybeSingle();
        if (clientData) endRecord.client = clientData;
      }

      // 3. Fetch Endorsement Type
      if (endRecord.endorsement_type_id) {
        const { data: typeData } = await supabase
          .from('endorsement_types')
          .select('name')
          .eq('id', endRecord.endorsement_type_id)
          .maybeSingle();
        if (typeData) endRecord.endorsement_type = typeData;
      }

      // 4. Fetch Policy details
      if (endRecord.policy_id) {
        const { data: policyData } = await supabase
          .from('policies')
          .select('policy_number, policy_type, tax_type, tax_amount')
          .eq('id', endRecord.policy_id)
          .maybeSingle();
        if (policyData) endRecord.policy = policyData;
      }

      // 5. Fetch Endorsement Items
      const { data: itemsData } = await supabase
        .from('endorsement_items')
        .select('*')
        .eq('endorsement_id', endRecord.id);
      if (itemsData) endRecord.items = itemsData;

      return endRecord;
    }
  });

  // Fetch claims for policy to identify utilization of deleted members
  const { data: policyClaims = [] } = useQuery({
    queryKey: ['policyClaims', endorsement?.policy_id],
    queryFn: async () => {
      if (!endorsement?.policy_id) return [];
      const { data, error } = await supabase
        .from('claims')
        .select('id, national_id, member_name')
        .eq('policy_id', endorsement.policy_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!endorsement?.policy_id
  });

  // Fetch active policy members to perform National ID / Staff ID duplication checks
  const { data: policyMembers = [] } = useQuery({
    queryKey: ['policyMembers', endorsement?.policy_id],
    queryFn: async () => {
      if (!endorsement?.policy_id) return [];
      const { data, error } = await supabase
        .from('policy_members')
        .select('id, national_id, staff_code, member_name')
        .eq('policy_id', endorsement.policy_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!endorsement?.policy_id
  });

  const checkMemberHasClaims = (item: any) => {
    if (!item) return false;
    const natId = String(item.national_id || "").trim();
    const nameVal = String(item.name || "").trim().toLowerCase();
    return policyClaims.some((c: any) => 
      (natId && String(c.national_id).trim() === natId) || 
      (nameVal && String(c.member_name || "").trim().toLowerCase() === nameVal)
    );
  };

  // Calculate calculations
  const calculations = useMemo(() => {
    if (!endorsement) return { net: 0, taxes: 0, gross: 0 };
    const net = Number(endorsement.premium_impact || 0);
    const policyObj = endorsement.policy || {};
    const taxes = calculateEndorsementTax(net, policyObj);
    const gross = net + taxes;
    return { net, taxes, gross };
  }, [endorsement]);

  const isAdminOrPolicyAdmin = user?.role === 'Admin' || user?.role === 'Policy Admin' || (user as any)?.is_admin;

  // 1b. Fetch Audit Logs from real audit_logs table
  const { data: auditLogs, isLoading: isAuditLoading } = useQuery({
    queryKey: ['endorsementAuditLogs', endorsement?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', 'endorsement')
        .eq('resource_id', endorsement.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!endorsement?.id && isAdminOrPolicyAdmin
  });

  const handleCensusMasterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !endorsement) return;
    
    setIsUpdating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (rows.length === 0) {
          toast({ variant: 'destructive', title: "Excel sheet is empty" });
          setIsUpdating(false);
          return;
        }
        
        let matchCount = 0;
        const items = endorsement.items || [];
        
        for (const item of items) {
          if (item.action_type !== 'add') continue;
          
          const details = item.details || {};
          const itemStaff = String(details.staff_code || '').trim().toLowerCase();
          const itemNid = String(item.national_id || '').trim();
          const itemName = String(item.name || '').trim().toLowerCase();
          
          const matchedRow = rows.find(r => {
            const rowStaff = String(r["Staff ID"] || r["Staff Code"] || '').trim().toLowerCase();
            const rowNid = String(r["National ID"] || '').trim();
            const rowName = String(r["Full Name English"] || r["Member Name"] || '').trim().toLowerCase();
            
            if (itemNid && rowNid && itemNid === rowNid) return true;
            if (itemStaff && rowStaff && itemStaff === rowStaff) return true;
            if (itemName && rowName && (itemName === rowName || itemName.includes(rowName) || rowName.includes(itemName))) return true;
            
            return false;
          });
          
          const insuredId = matchedRow ? String(matchedRow["Insured ID"] || matchedRow["Member Ins Code"] || '').trim() : null;
          
          if (insuredId) {
            const { error: updateError } = await supabase
              .from('endorsement_items')
              .update({
                details: {
                  ...details,
                  member_id_insurance: insuredId
                }
              })
              .eq('id', item.id);
            if (!updateError) {
              matchCount++;
            }
          }
        }
        
        toast({
          title: `Matched ${matchCount} of ${items.filter((i: any) => i.action_type === 'add').length} items!`,
          description: "Applying invoice automatically..."
        });
        
        queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
        await handleApproveAndInvoice();
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Error parsing Excel", description: err.message });
      } finally {
        setIsUpdating(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const openVerifyDialog = (item: any) => {
    setVerifyingItem(item);
    setVerifyingNid(item.national_id || "");
    setVerifyingStaffCode(item.details?.staff_code || "");
    setVerifyingInsuredId(item.details?.member_id_insurance || "");
    setVerifyingPrincipalId(item.details?.principle_id || "");
    setVerifyingIndividualId(item.details?.member_id_individual || "");
    setVerificationError("");
  };

  const handleVerifyMember = async () => {
    if (!verifyingItem) return;
    setVerificationError("");
    
    const nid = verifyingNid.trim();
    const staff = verifyingStaffCode.trim();
    const insured = verifyingInsuredId.trim();
    const principal = verifyingPrincipalId.trim();
    const individual = verifyingIndividualId.trim();
    
    if (!nid || !/^\d{14}$/.test(nid)) {
      setVerificationError("National ID must be exactly 14 digits.");
      return;
    }
    if (!staff) {
      setVerificationError("Staff ID is required.");
      return;
    }
    if (!insured) {
      setVerificationError("Insured ID is required.");
      return;
    }
    if (!principal) {
      setVerificationError("Principal ID is required.");
      return;
    }
    if (!individual) {
      setVerificationError("Individual ID is required.");
      return;
    }
    
    // Check duplication under policy members
    const isDupNid = policyMembers.some((m: any) => m.national_id === nid && m.id !== verifyingItem.member_id);
    if (isDupNid) {
      setVerificationError("Verification Failed: A member with this National ID already exists in this policy.");
      return;
    }
    
    const isDupStaff = policyMembers.some((m: any) => m.staff_code?.toLowerCase() === staff.toLowerCase() && m.id !== verifyingItem.member_id);
    if (isDupStaff) {
      setVerificationError("Verification Failed: A member with this Staff ID already exists in this policy.");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('endorsement_items')
        .update({
          national_id: nid,
          details: {
            ...verifyingItem.details,
            staff_code: staff,
            member_id_insurance: insured,
            principle_id: principal,
            member_id_individual: individual,
            verified: true
          }
        })
        .eq('id', verifyingItem.id);
        
      if (error) throw error;
      
      toast({ title: "Member addition verified successfully" });
      setVerifyingItem(null);
      queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
    } catch (err: any) {
      setVerificationError(err.message || "Failed to verify member");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!endorsement) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('endorsements')
        .update({ status: newStatus })
        .eq('id', endorsement.id);

      if (error) throw error;
      toast({ title: `Endorsement status updated to ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error updating status", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproveAndInvoice = async () => {
    if (!endorsement) return;
    setIsUpdating(true);
    try {
      const response = await fetch('/api/endorsements/invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ endorsement_id: endorsement.id })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve and invoice');
      }

      toast({ title: "Approved & Invoice Generated!", description: `Linked invoice: ${result.invoice_number}` });
      queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Invoicing failed", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  // Status step calculation
  const stepNames = ["Draft", "Pending", "Approved", "Invoiced"];
  const statusMap: Record<string, number> = { "Draft": 0, "Pending Approval": 1, "Approved": 2, "Invoiced": 3 };
  const currentStepIndex = statusMap[endorsement?.status || "Draft"] ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Approval": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-rose-50 text-rose-700 border-rose-200";
      case "Invoiced": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", isModalMode ? "h-full" : "min-h-[400px]")}>
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-600" />
        <span className="ml-3 text-slate-500 font-semibold text-sm">Loading endorsement...</span>
      </div>
    );
  }

  if (error || !endorsement) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center p-8", isModalMode ? "h-full" : "mt-12")}>
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-slate-800">Endorsement Not Found</h3>
        <p className="text-slate-500 text-xs mt-1">Could not retrieve this endorsement from the database.</p>
        <Button onClick={onClose || (() => router.push('/endorsements'))} className="mt-4 bg-[#2A75F3] hover:bg-blue-700 rounded-lg text-sm h-9">Back</Button>
      </div>
    );
  }

  const items = endorsement.items || [];
  const addedItems = items.filter((item: any) => item.action_type === 'add');
  const deletedItems = items.filter((item: any) => item.action_type === 'delete');
  const modifiedItems = items.filter((item: any) => item.action_type === 'modify');

  return (
    <div className={cn("w-full", isModalMode ? "flex flex-col flex-1 min-h-0 overflow-hidden" : "max-w-6xl mx-auto py-8 space-y-6")}>
      
      {/* ─── HEADER ─── */}
      {isModalMode ? (
        <div className="flex justify-between items-center border-b border-slate-200/80 px-6 py-4 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">{endorsement.endorsement_number || "Endorsement"}</h2>
                <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border", getStatusColor(endorsement.status))}>
                  {endorsement.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                {endorsement.policy?.policy_number || "N/A"} · {endorsement.client?.name || "N/A"} · {endorsement.endorsement_type?.name || "Manual"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose || (() => router.push('/endorsements'))} className="h-12 w-12 p-0 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-50">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900">{endorsement.endorsement_number || "Endorsement Details"}</h1>
                <span className={cn("px-3 py-1 text-xs font-bold uppercase rounded-full border", getStatusColor(endorsement.status))}>{endorsement.status}</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mt-0.5">
                Client: {endorsement.client?.name || "N/A"} • Policy: {endorsement.policy?.policy_number || "N/A"} • Type: {endorsement.endorsement_type?.name || "Manual"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTENT ─── */}
      <div className={cn("bg-white custom-scrollbar", isModalMode ? "flex-1 min-h-0 overflow-y-auto" : "")}>
        <div className={cn(isModalMode ? "p-5 space-y-4" : "space-y-6")}>

          <div className={cn("bg-slate-900 text-white rounded-2xl relative overflow-hidden shadow-lg", isModalMode ? "p-4" : "p-6")}>
            <div className="absolute -right-6 -top-6 opacity-[0.06]"><Banknote className="w-36 h-36" /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 font-semibold tracking-wider uppercase text-[9px] mb-0.5">Financial Impact</p>
                  <h2 className={cn("font-black text-white", isModalMode ? "text-2xl" : "text-3xl")}>
                    {calculations.gross >= 0 ? '+' : ''}{Math.round(calculations.gross).toLocaleString()} EGP
                  </h2>
                </div>
                <div className="text-right space-y-1 text-[11px]">
                  <div className="text-slate-400">Net: <span className="font-mono text-white font-semibold">{Math.round(calculations.net).toLocaleString()}</span></div>
                  <div className="text-slate-400">Tax: <span className="font-mono text-white font-semibold">{Math.round(calculations.taxes).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-50/50 px-4 py-3 border-b flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Member Changes ({items.length})
              </span>
            </div>

            <div className="p-4 bg-white">
              <Tabs defaultValue={addedItems.length > 0 ? "additions" : deletedItems.length > 0 ? "deletions" : "modifications"} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100/60 p-1 border rounded-lg h-9 mb-4">
                  <TabsTrigger value="additions" className="text-xs font-semibold py-1 rounded-md" disabled={addedItems.length === 0}>
                    Additions ({addedItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="deletions" className="text-xs font-semibold py-1 rounded-md" disabled={deletedItems.length === 0}>
                    Deletions ({deletedItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="modifications" className="text-xs font-semibold py-1 rounded-md" disabled={modifiedItems.length === 0}>
                    Modifications ({modifiedItems.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="additions" className="space-y-2 mt-0">
                  {addedItems.length === 0 ? (
                    <div className="text-center p-6 text-slate-400 text-xs">No additions in this endorsement.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 bg-white z-10 border-b">
                          <tr>
                            <th className="px-3 py-2 bg-white">Name</th>
                            <th className="px-3 py-2 bg-white">National ID</th>
                            <th className="px-3 py-2 bg-white">Staff ID</th>
                            <th className="px-3 py-2 bg-white">Insured ID</th>
                            <th className="px-3 py-2 bg-white">Principal ID</th>
                            <th className="px-3 py-2 bg-white">Individual ID</th>
                            <th className="px-3 py-2 bg-white">Premium</th>
                            <th className="px-3 py-2 bg-white text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {addedItems.map((item: any) => {
                            const isVerified = item.details?.verified;
                            return (
                              <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="px-3 py-2 font-semibold text-emerald-800 flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  {isVerified && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 h-4 font-bold">Verified</Badge>}
                                </td>
                                <td className="px-3 py-2 text-slate-600 font-mono">{item.national_id || '-'}</td>
                                <td className="px-3 py-2 text-slate-600 font-mono">{item.details?.staff_code || '-'}</td>
                                <td className="px-3 py-2 text-slate-600 font-mono">{item.details?.member_id_insurance || '-'}</td>
                                <td className="px-3 py-2 text-slate-600 font-mono">{item.details?.principle_id || '-'}</td>
                                <td className="px-3 py-2 text-slate-600 font-mono">{item.details?.member_id_individual || '-'}</td>
                                <td className="px-3 py-2 text-emerald-700 font-bold font-mono">{Math.round(item.premium || 0).toLocaleString()} EGP</td>
                                <td className="px-3 py-2 text-right">
                                  {endorsement.status === 'Pending Approval' && (
                                    <Button
                                      size="sm"
                                      variant={isVerified ? "outline" : "default"}
                                      onClick={() => openVerifyDialog(item)}
                                      className={cn("h-7 text-[10px] font-semibold px-2.5 rounded-md", isVerified ? "text-slate-500 border-slate-200" : "bg-blue-600 hover:bg-blue-700 text-white")}
                                    >
                                      {isVerified ? "Edit" : "Verify & Approve"}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deletions" className="space-y-2 mt-0">
                  {deletedItems.length === 0 ? (
                    <div className="text-center p-6 text-slate-400 text-xs">No deletions in this endorsement.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 bg-white z-10 border-b">
                          <tr>
                            <th className="px-3 py-2 bg-white">Name</th>
                            <th className="px-3 py-2 bg-white">National ID</th>
                            <th className="px-3 py-2 bg-white">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {deletedItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="px-3 py-2 font-semibold text-rose-800">{item.name}</td>
                              <td className="px-3 py-2 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="px-3 py-2 text-rose-700 font-bold font-mono">-{Math.round(item.premium || 0).toLocaleString()} EGP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="modifications" className="space-y-2 mt-0">
                  {modifiedItems.length === 0 ? (
                    <div className="text-center p-6 text-slate-400 text-xs">No modifications in this endorsement.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 bg-white z-10 border-b">
                          <tr>
                            <th className="px-3 py-2 bg-white">Name</th>
                            <th className="px-3 py-2 bg-white">National ID</th>
                            <th className="px-3 py-2 bg-white">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {modifiedItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="px-3 py-2 font-semibold text-amber-800">{item.name}</td>
                              <td className="px-3 py-2 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="px-3 py-2 text-slate-600">{JSON.stringify(item.details)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className={cn("bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0", isModalMode ? "px-6 py-3" : "p-6 rounded-3xl border shadow-sm bg-white mt-6")}>
        <div className="flex items-center gap-2">
          {endorsement.status === 'Pending Approval' && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleCensusMasterUpload} accept=".xlsx,.xls" className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUpdating} className="h-9 rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs font-semibold gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Match via Sheet
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {endorsement.status === 'Draft' && (
            <Button onClick={() => handleStatusUpdate('Pending Approval')} disabled={isUpdating} className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200/50 flex items-center gap-1.5 text-xs">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit for Approval
            </Button>
          )}
          {endorsement.status === 'Pending Approval' && (
            <>
              <Button variant="outline" onClick={() => handleStatusUpdate('Rejected')} disabled={isUpdating} className="h-9 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold text-xs gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
              <Button onClick={handleApproveAndInvoice} disabled={isUpdating} className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-200/50 flex items-center gap-1.5 text-xs">
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve & Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={!!verifyingItem} onOpenChange={(open) => { if (!open) setVerifyingItem(null); }}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-0 overflow-hidden rounded-2xl gap-0 max-h-[85vh] [&>button.absolute]:hidden" style={{ display: 'flex', flexDirection: 'column' }}>
          <DialogTitle className="sr-only">Verify Member Addition</DialogTitle>
          <div className="flex justify-between items-center border-b border-slate-200/80 px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verify Addition</h3>
                <p className="text-[10px] text-slate-500 font-medium">{verifyingItem?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100" onClick={() => setVerifyingItem(null)}><X className="w-3.5 h-3.5" /></Button>
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
            <div className="space-y-4">
              {verificationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in shake duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{verificationError}</span>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">National ID *</Label>
                  <Input value={verifyingNid} onChange={e => setVerifyingNid(e.target.value)} placeholder="14-digit National ID" maxLength={14} className="h-9 rounded-lg text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Staff ID *</Label>
                  <Input value={verifyingStaffCode} onChange={e => setVerifyingStaffCode(e.target.value)} placeholder="e.g. EMP-101" className="h-9 rounded-lg text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Insured ID *</Label>
                  <Input value={verifyingInsuredId} onChange={e => setVerifyingInsuredId(e.target.value)} placeholder="e.g. INS-449" className="h-9 rounded-lg text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Principal ID *</Label>
                  <Input value={verifyingPrincipalId} onChange={e => setVerifyingPrincipalId(e.target.value)} placeholder="e.g. Principal member ID" className="h-9 rounded-lg text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Individual ID *</Label>
                  <Input value={verifyingIndividualId} onChange={e => setVerifyingIndividualId(e.target.value)} placeholder="e.g. Individual member ID" className="h-9 rounded-lg text-xs font-mono" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center shrink-0">
            <Button variant="outline" size="sm" onClick={() => setVerifyingItem(null)} className="h-8 text-xs font-semibold rounded-md">Cancel</Button>
            <Button onClick={handleVerifyMember} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 rounded-md text-xs font-semibold shadow-md shadow-blue-200/50 flex items-center gap-1.5">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Save & Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
