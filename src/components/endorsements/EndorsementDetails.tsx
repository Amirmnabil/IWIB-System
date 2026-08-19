'use client';

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import * as XLSX from "xlsx";
import { 
  ChevronLeft, ArrowRight, Download, Send, CheckCircle, XCircle, FileText, 
  Activity, Users, Banknote, RefreshCw, AlertTriangle, UserCheck, Calendar,
  Upload
} from "lucide-react";
import { calculateEndorsementTax } from "@/lib/endorsement-rules";
import { cn } from "@/lib/utils";

export default function EndorsementDetails({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("diff");
  const [comments, setComments] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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
      // Call the invoice API to auto-create invoice & set status to Invoiced (or Approved)
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
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Invoicing failed", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase rounded-full border border-amber-200">Pending Approval</span>;
      case "Approved":
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-full border border-emerald-200">Approved</span>;
      case "Rejected":
        return <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold uppercase rounded-full border border-rose-200">Rejected</span>;
      case "Invoiced":
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full border border-blue-200">Invoiced</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase rounded-full border border-slate-200">Draft</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <RefreshCw className="animate-spin w-8 h-8 text-indigo-600" />
        <span className="ml-3 text-slate-500 font-bold">Loading endorsement details...</span>
      </div>
    );
  }

  if (error || !endorsement) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 border rounded-2xl bg-white text-center shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Endorsement Not Found</h3>
        <p className="text-slate-500 text-sm mt-1">The requested endorsement could not be retrieved from the database.</p>
        <Button onClick={() => router.push('/endorsements')} className="mt-6 bg-[#2A75F3] hover:bg-blue-700 rounded-xl">Back to Dashboard</Button>
      </div>
    );
  }

  const items = endorsement.items || [];
  const addedItems = items.filter((item: any) => item.action_type === 'add');
  const deletedItems = items.filter((item: any) => item.action_type === 'delete');
  const modifiedItems = items.filter((item: any) => item.action_type === 'modify');

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/endorsements')} className="h-12 w-12 p-0 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-50">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{endorsement.endorsement_number || "Endorsement Details"}</h1>
              {getStatusBadge(endorsement.status)}
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">
              Client: {endorsement.client?.name || "N/A"} • Policy: {endorsement.policy?.policy_number || "N/A"} • Type: {endorsement.endorsement_type?.name || "Manual"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {endorsement.status === 'Draft' && (
            <Button 
              onClick={() => handleStatusUpdate('Pending Approval')}
              disabled={isUpdating}
              className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Submit for Approval
            </Button>
          )}

          {endorsement.status === 'Pending Approval' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCensusMasterUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdating}
                className="h-12 rounded-xl text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-indigo-600" /> Match & Approve via Master Sheet
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const headers = ["Full Name English", "Staff ID", "Insured ID", "Principal ID", "Individual ID", "PLAN", "National ID"];
                  const ws = XLSX.utils.aoa_to_sheet([headers]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Master Sheet");
                  XLSX.writeFile(wb, "Master_Sheet_Template.xlsx");
                  toast({ title: "Template Downloaded", description: "Use this template for auto-matching." });
                }}
                disabled={isUpdating}
                className="h-12 rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-500" /> Master Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleStatusUpdate('Rejected')}
                disabled={isUpdating}
                className="h-12 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button 
                onClick={handleApproveAndInvoice}
                disabled={isUpdating}
                className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Approve & Invoice
              </Button>
            </>
          )}

          {endorsement.status === 'Invoiced' && (
            <Badge className="bg-blue-600 text-white border-none h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Invoiced & Fully Settled
            </Badge>
          )}
        </div>
      </div>

      {/* Visual Status Stepper */}
      {endorsement.status !== 'Rejected' ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {["Draft", "Pending Approval", "Approved", "Invoiced"].map((stepName, index) => {
              const getStatusStepIndex = (status: string) => {
                switch (status) {
                  case "Draft": return 0;
                  case "Pending Approval": return 1;
                  case "Approved": return 2;
                  case "Invoiced": return 3;
                  default: return 0;
                }
              };
              const statusStepIndex = getStatusStepIndex(endorsement.status);
              return (
                <React.Fragment key={stepName}>
                  <div className="flex flex-col items-center relative z-10">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      statusStepIndex >= index 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" 
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      {statusStepIndex > index ? "✓" : index + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold mt-2",
                      statusStepIndex >= index ? "text-slate-800" : "text-slate-400"
                    )}>
                      {stepName}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className="flex-1 h-[2px] bg-slate-100 mx-2 -mt-6 relative z-0">
                      <div 
                        className="bg-emerald-600 h-full transition-all duration-500" 
                        style={{ width: statusStepIndex > index ? "100%" : statusStepIndex === index ? "50%" : "0%" }} 
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center gap-3 text-rose-800 text-sm font-semibold animate-in shake duration-300">
          <XCircle className="w-5 h-5 text-rose-600" />
          <span>This endorsement request has been Rejected. Review comments or audit logs below to fix issues.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Diff */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent p-0 w-full justify-start space-x-6 h-auto">
                  <TabsTrigger value="diff" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Changes (Diff)</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">General Details</TabsTrigger>
                  {isAdminOrPolicyAdmin && (
                    <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Audit Trail</TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Tab: Changes Diff */}
              {activeTab === "diff" && (
                <div className="space-y-6">
                  {/* Additions list */}
                  {addedItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Users className="w-5 h-5 text-emerald-500" /> Items Added ({addedItems.length})</h3>
                      <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">National ID / Ref</th>
                            <th className="p-3">Annual Premium</th>
                            <th className="p-3">Insurance Code (Insured ID)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addedItems.map((item: any) => (
                            <tr key={item.id} className="bg-emerald-50/20 border-b border-emerald-100/50">
                              <td className="p-3 font-semibold text-emerald-800">{item.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="p-3 text-emerald-700 font-bold font-mono">{Math.round(item.premium || 0).toLocaleString()} EGP</td>
                              <td className="p-3">
                                {endorsement.status === 'Pending Approval' ? (
                                  <input
                                    type="text"
                                    placeholder="Enter Insurance Code..."
                                    defaultValue={item.details?.member_id_insurance || ""}
                                    onBlur={async (e) => {
                                      const val = e.target.value.trim();
                                      if (val !== (item.details?.member_id_insurance || "")) {
                                        const { error } = await supabase
                                          .from('endorsement_items')
                                          .update({
                                            details: {
                                              ...item.details,
                                              member_id_insurance: val
                                            }
                                          })
                                          .eq('id', item.id);
                                        if (error) {
                                          toast({ variant: 'destructive', title: "Update failed", description: error.message });
                                        } else {
                                          toast({ title: "Insurance code updated" });
                                          queryClient.invalidateQueries({ queryKey: ['endorsementDetails', id] });
                                        }
                                      }
                                    }}
                                    className="h-8 rounded-lg px-2 text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 font-mono bg-white"
                                  />
                                ) : (
                                  <span className="font-mono text-slate-600 font-bold text-xs">{item.details?.member_id_insurance || '-'}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Deletions list */}
                  {deletedItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Users className="w-5 h-5 text-rose-500" /> Items Deleted ({deletedItems.length})</h3>
                      
                      {deletedItems.some((item: any) => checkMemberHasClaims(item)) && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-semibold animate-in fade-in">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-sm text-rose-900">Active Claims Warning</p>
                            <p className="text-rose-700 mt-1 leading-relaxed">
                              One or more deleted members have active claims against this policy. Deletion refund credits for these members will be blocked/restricted per insurer regulations.
                            </p>
                          </div>
                        </div>
                      )}

                      <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">National ID / Ref</th>
                            <th className="p-3">Premium Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedItems.map((item: any) => {
                            const hasClaims = checkMemberHasClaims(item);
                            return (
                              <tr key={item.id} className="bg-rose-50/20 border-b border-rose-100/50">
                                <td className="p-3 font-semibold text-rose-800 flex items-center gap-2">
                                  {item.name}
                                  {hasClaims && (
                                    <Badge variant="outline" className="bg-rose-600 text-white border-none text-[9px] font-bold py-0.5">
                                      ⚠️ Active Claims
                                    </Badge>
                                  )}
                                  {item.needs_review && (
                                    <Badge variant="outline" className="bg-amber-600 text-white border-none text-[9px] font-bold py-0.5">
                                      ⚠️ Needs Review (Name-only Match)
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 font-mono">{item.national_id || '-'}</td>
                                <td className="p-3 text-rose-700 font-bold font-mono">-{Math.round(item.premium || 0).toLocaleString()} EGP</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Modifications list */}
                  {modifiedItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Users className="w-5 h-5 text-amber-500" /> Modifications ({modifiedItems.length})</h3>
                      <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">National ID / Ref</th>
                            <th className="p-3">Premium Adjustment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modifiedItems.map((item: any) => (
                            <tr key={item.id} className="bg-amber-50/20 border-b border-amber-100/50">
                              <td className="p-3 font-semibold text-amber-800">{item.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="p-3 text-amber-700 font-bold font-mono">{Math.round(item.premium || 0).toLocaleString()} EGP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {items.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      No specific sub-items linked to this endorsement.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: General Details */}
              {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Category</p>
                      <p className="font-bold text-slate-800 mt-0.5">{endorsement.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Effective Date</p>
                      <p className="font-bold text-slate-800 mt-0.5">{new Date(endorsement.effective_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">LOB / Line of Business</p>
                      <p className="font-bold text-slate-800 mt-0.5">{endorsement.line_of_business}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Creation Date</p>
                      <p className="font-bold text-slate-800 mt-0.5">{new Date(endorsement.creation_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Source Type</p>
                      <p className="font-bold text-slate-800 mt-0.5">{endorsement.source || "Manual"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Notes</p>
                      <p className="text-slate-600 mt-0.5">{endorsement.notes || "None"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Audit Trail */}
              {activeTab === "audit" && (
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                  {!isAdminOrPolicyAdmin ? (
                    <div className="p-4 text-center text-rose-600 font-semibold text-xs bg-rose-50 rounded-xl">
                      Unauthorized. Only Admin or Policy Admin can review audit logs.
                    </div>
                  ) : isAuditLoading ? (
                    <div className="flex items-center justify-center p-8 text-xs text-slate-500 font-medium">
                      <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Loading audit trail...
                    </div>
                  ) : auditLogs && auditLogs.length > 0 ? (
                    auditLogs.map((log: any) => (
                      <div key={log.id} className="flex gap-4 relative">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white absolute -left-[22px] top-1 shadow-sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{log.action}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleString()} • User: {log.user_name}
                          </p>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border font-mono max-w-lg overflow-x-auto text-slate-600">
                              {Object.entries(log.changes).map(([field, delta]: any) => (
                                <div key={field}>
                                  <strong>{field}</strong>: {JSON.stringify(delta.before)} &rarr; {JSON.stringify(delta.after)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No audit events logged for this endorsement.
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Impact Summary */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-slate-900 text-white relative">
            <div className="absolute -right-4 -top-4 opacity-10"><Banknote className="w-32 h-32" /></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-blue-300 font-bold tracking-wider uppercase text-xs mb-1">Financial Impact Summary</p>
              <h2 className="text-4xl font-black text-white mb-6">
                {calculations.gross >= 0 ? '+' : ''}{Math.round(calculations.gross).toLocaleString()} EGP
              </h2>
              
              <div className="space-y-3 pt-6 border-t border-slate-700 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Net Premium:</span>
                  <span className="font-mono text-white">{Math.round(calculations.net).toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Taxes ({endorsement.policy?.tax_type === 'percentage' ? `${endorsement.policy.tax_amount}%` : 'Configured'}):</span>
                  <span className="font-mono text-white">{Math.round(calculations.taxes).toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Sum Insured Impact:</span>
                  <span className="font-mono text-white">{Math.round(Number(endorsement.sum_insured_impact || 0)).toLocaleString()} EGP</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Invoice Output */}
          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border py-4"><CardTitle className="text-base font-bold">Outputs & Invoices</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-3">
              {endorsement.linked_invoice_id ? (
                <Button 
                  onClick={() => router.push(`/invoices?search=${endorsement.linked_invoice_id}`)}
                  variant="outline" 
                  className="w-full h-12 rounded-xl font-bold justify-start text-blue-700 border-blue-200 bg-blue-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" /> View Linked Invoice
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-xl border border-dashed">
                  No linked invoice generated yet. Approve the endorsement to auto-generate billing.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
