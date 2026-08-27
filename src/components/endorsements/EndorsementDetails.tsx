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

  // Approval popup states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalRef, setApprovalRef] = useState("");
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);

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

  const isCancellationEndorsement = useMemo(() => {
    if (!endorsement) return false;
    const typeName = endorsement.endorsement_type?.name || '';
    return typeName.toLowerCase().includes('cancel') || typeName.toLowerCase().includes('deletion');
  }, [endorsement]);

  const isApproveDisabled = useMemo(() => {
    if (!endorsement) return true;
    const additions = endorsement.items?.filter((i: any) => i.action_type === 'add') || [];
    if (additions.length === 0) return false;

    const allVerified = additions.every((i: any) => i.details?.verified === true);
    if (!allVerified) return true;

    const allIdsPresent = additions.every((i: any) => 
      i.details?.member_id_insurance && 
      i.details?.principle_id && 
      i.details?.member_id_individual
    );
    if (!allIdsPresent) return true;

    return false;
  }, [endorsement]);

  const approvalWarning = useMemo(() => {
    if (!endorsement) return null;
    const additions = endorsement.items?.filter((i: any) => i.action_type === 'add') || [];
    if (additions.length === 0) return null;

    const unverifiedCount = additions.filter((i: any) => !i.details?.verified).length;
    if (unverifiedCount > 0) {
      return `Verification required: ${unverifiedCount} member addition(s) must be verified and approved first.`;
    }

    const missingIdCount = additions.filter((i: any) => 
      !i.details?.member_id_insurance || 
      !i.details?.principle_id || 
      !i.details?.member_id_individual
    ).length;
    if (missingIdCount > 0) {
      return `Missing IDs: ${missingIdCount} member addition(s) are missing required Insured, Principal, or Individual IDs.`;
    }

    return null;
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
        
        // 1. Verify headers strictly match the expected columns and order
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (sheetData.length === 0) {
          toast({ variant: 'destructive', title: "Excel sheet is empty" });
          setIsUpdating(false);
          return;
        }

        const headers = sheetData[0].map(h => String(h || '').trim());
        const expectedHeaders = ["National ID", "Staff ID", "Insured ID", "Principal ID", "Individual ID"];
        
        const isHeaderMatch = headers.length === expectedHeaders.length && 
                              headers.every((val, index) => val === expectedHeaders[index]);
                              
        if (!isHeaderMatch) {
          toast({
            variant: 'destructive',
            title: "Invalid Sheet Structure",
            description: "Columns must be exactly: National ID, Staff ID, Insured ID, Principal ID, Individual ID"
          });
          setIsUpdating(false);
          return;
        }

        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        let matchCount = 0;
        const items = endorsement.items || [];
        
        for (const item of items) {
          if (item.action_type !== 'add') continue;
          
          const details = item.details || {};
          const itemStaff = String(details.staff_code || '').trim().toLowerCase();
          const itemNid = String(item.national_id || '').trim();
          
          const matchedRow = rows.find(r => {
            const rowNid = String(r["National ID"] || '').trim();
            const rowStaff = String(r["Staff ID"] || '').trim().toLowerCase();
            
            if (itemNid && rowNid && itemNid === rowNid) return true;
            if (itemStaff && rowStaff && itemStaff === rowStaff) return true;
            
            return false;
          });
          
          if (matchedRow) {
            const insuredId = String(matchedRow["Insured ID"] || '').trim();
            const principalId = String(matchedRow["Principal ID"] || '').trim();
            const individualId = String(matchedRow["Individual ID"] || '').trim();
            const staffId = String(matchedRow["Staff ID"] || '').trim();
            const nationalId = String(matchedRow["National ID"] || '').trim();
            
            const hasAllRequiredIds = !!(insuredId && principalId && individualId);
            
            const updatedDetails = {
              ...details,
              member_id_insurance: insuredId || details.member_id_insurance,
              principle_id: principalId || details.principle_id,
              member_id_individual: individualId || details.member_id_individual,
              staff_code: staffId || details.staff_code,
              verified: hasAllRequiredIds ? true : details.verified
            };
            
            const updateData: any = { details: updatedDetails };
            if (nationalId) {
              updateData.national_id = nationalId;
            }
            
            const { error: updateError } = await supabase
              .from('endorsement_items')
              .update(updateData)
              .eq('id', item.id);
            if (!updateError) {
              matchCount++;
            }
          }
        }
        
        toast({
          title: `Matched & Updated!`,
          description: `Successfully updated ${matchCount} of ${items.filter((i: any) => i.action_type === 'add').length} items.`
        });
        
        queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
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
        body: JSON.stringify({ 
          endorsement_id: endorsement.id,
          approval_ref: approvalRef,
          approval_date: approvalDate
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve and invoice');
      }

      toast({ title: "Approved & Invoice Generated!", description: `Linked invoice: ${result.invoice_number}` });
      setApproveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Invoicing failed", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!endorsement) return;
    try {
      const items = endorsement.items || [];
      const dataToExport = items.map((item: any, index: number) => {
        const nameParts = (item.name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const secondName = nameParts[1] || '';
        const lastName = nameParts.slice(2).join(' ') || '';

        return {
          "Serial": index + 1,
          "Addition Date": endorsement.effective_date ? new Date(endorsement.effective_date).toISOString().split('T')[0] : '',
          "Member Name": item.name || '',
          "First Name": firstName,
          "Second Name": secondName,
          "Last Name": lastName,
          "DOB": item.details?.date_of_birth || '',
          "Gender": item.details?.gender || '',
          "Relation": item.details?.relation || '',
          "Staff ID": item.details?.staff_code || '',
          "Plan Category": item.details?.plan_category || '',
          "Principal ID": item.details?.principle_id || '',
          "Mobile": item.details?.mobile_number || '',
          "Company Name": endorsement.client?.name || '',
          "National ID": item.national_id || '',
          "Nationality": item.details?.nationality || '',
          "Bank Name": item.details?.bank_name || '',
          "Bank Account": item.details?.bank_account || '',
          "IBAN": item.details?.iban || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Endorsement Details");
      XLSX.writeFile(wb, `${endorsement.endorsement_number}_details.xlsx`);

      if (endorsement.status === 'Draft' || endorsement.status === 'Pending Approval') {
        setIsUpdating(true);
        const { error } = await supabase
          .from('endorsements')
          .update({ status: 'Pending' })
          .eq('id', endorsement.id);

        if (error) throw error;
        toast({ title: "Downloaded successfully!", description: "Endorsement status updated to Pending" });
        queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
        onUpdate?.();
      } else {
        toast({ title: "Details downloaded successfully!" });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Download failed", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  // Status step calculation
  const stepNames = ["Draft", "Pending", "Issued", "Completed"];
  const statusMap: Record<string, number> = { 
    "Draft": 0, 
    "Pending Approval": 0, 
    "Pending": 1, 
    "Issued": 2, 
    "Approved": 2, 
    "Invoiced": 2, 
    "Completed": 3 
  };
  const currentStepIndex = statusMap[endorsement?.status || "Draft"] ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
      case "Pending Approval": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Issued":
      case "Approved":
      case "Invoiced": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-rose-50 text-rose-700 border-rose-200";
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={handleDownloadExcel} disabled={isUpdating}>
              <Download className="w-4 h-4" />
            </Button>
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
          <Button variant="outline" onClick={handleDownloadExcel} disabled={isUpdating} className="h-10 rounded-xl text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold text-sm gap-2">
            <Download className="w-4 h-4" /> Download Details
          </Button>
        </div>
      )}

      {/* ─── CONTENT ─── */}
      <div className={cn("bg-white custom-scrollbar", isModalMode ? "flex-1 min-h-0 overflow-y-auto" : "")}>
        <div className={cn(isModalMode ? "p-5 space-y-4" : "space-y-6")}>

          {/* Horizontal Stages Timeline */}
          <div className="flex items-center justify-between w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
            {stepNames.map((name, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <React.Fragment key={name}>
                  {index > 0 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 rounded-full",
                      index <= currentStepIndex ? "bg-indigo-600" : "bg-slate-200"
                    )} />
                  )}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                      isCompleted ? "bg-indigo-600 text-white" :
                      isCurrent ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
                      "bg-slate-200 text-slate-500"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold mt-1 uppercase tracking-wider",
                      isCurrent ? "text-indigo-600" : "text-slate-500"
                    )}>{name}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Summary Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 border border-slate-200 rounded-2xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Number</span>
              <p className="text-xs font-bold text-slate-800 font-mono select-all">
                {endorsement.endorsement_number || endorsement.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endorsement Type</span>
              <p className="text-xs font-bold text-slate-800">
                {endorsement.endorsement_type?.name || 'Manual'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Effective Date</span>
              <p className="text-xs font-bold text-slate-800">
                {new Date(endorsement.effective_date).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line of Business</span>
              <p className="text-xs font-bold text-slate-800">
                {endorsement.line_of_business}
              </p>
            </div>
          </div>

          {/* Simple Financial Impact display as just a number */}
          <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-200 rounded-2xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Impact</span>
            <span className="text-xl font-black text-slate-800">
              {calculations.gross >= 0 ? '+' : ''}{Math.round(calculations.gross).toLocaleString()} EGP
            </span>
          </div>

          {approvalWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
              <span>{approvalWarning}</span>
            </div>
          )}


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
                                  {(endorsement.status === 'Pending Approval' || endorsement.status === 'Pending') && (
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
          {(endorsement.status === 'Pending' || endorsement.status === 'Pending Approval') && !isCancellationEndorsement && (
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
            <Button onClick={handleDownloadExcel} disabled={isUpdating} className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200/50 flex items-center gap-1.5 text-xs">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download Details & Submit
            </Button>
          )}
          {(endorsement.status === 'Pending' || endorsement.status === 'Pending Approval') && (
            <>
              <Button variant="outline" onClick={() => handleStatusUpdate('Rejected')} disabled={isUpdating} className="h-9 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold text-xs gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
              <Button 
                onClick={() => setApproveDialogOpen(true)} 
                disabled={isUpdating || isApproveDisabled} 
                className={cn("h-9 px-5 rounded-lg font-semibold flex items-center gap-1.5 text-xs shadow-md transition-all", isApproveDisabled ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50")}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve & Invoice
              </Button>
            </>
          )}
          {(endorsement.status === 'Issued' || endorsement.status === 'Approved' || endorsement.status === 'Invoiced') && (
            <Button onClick={() => handleStatusUpdate('Completed')} disabled={isUpdating} className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-200/50 flex items-center gap-1.5 text-xs">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Delivered / Mark as Completed
            </Button>
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

      <Dialog open={approveDialogOpen} onOpenChange={(open) => { if (!open) setApproveDialogOpen(false); }}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogTitle className="text-sm font-bold text-slate-900">Approve Endorsement</DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Approval Reference Number *</Label>
              <Input 
                value={approvalRef} 
                onChange={e => setApprovalRef(e.target.value)} 
                placeholder="e.g. APP-893" 
                className="h-9 rounded-lg text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Approval Date *</Label>
              <Input 
                type="date" 
                value={approvalDate} 
                onChange={e => setApprovalDate(e.target.value)} 
                className="h-9 rounded-lg text-xs" 
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleApproveAndInvoice} 
              disabled={isUpdating || !approvalRef || !approvalDate} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 rounded-md text-xs font-semibold"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Approve & Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
