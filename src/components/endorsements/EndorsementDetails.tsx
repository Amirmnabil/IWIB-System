'use client';

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, ArrowRight, Download, Send, CheckCircle, XCircle, FileText, 
  Activity, Users, Banknote, RefreshCw, AlertTriangle, UserCheck, Calendar
} from "lucide-react";

export default function EndorsementDetails({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("diff");
  const [comments, setComments] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch endorsement record and nested details
  const { data: endorsement, isLoading, error } = useQuery({
    queryKey: ['endorsementDetails', id],
    queryFn: async () => {
      // Find by ID or by endorsement_number
      const { data, error } = await supabase
        .from('endorsements')
        .select(`
          *,
          policy:policies(policy_number, line_of_business),
          client:companies(name),
          endorsement_type:endorsement_types(name),
          items:endorsement_items(*)
        `)
        .or(`id.eq.${id},endorsement_number.eq.${id}`)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  // Calculate calculations
  const calculations = useMemo(() => {
    if (!endorsement) return { net: 0, taxes: 0, gross: 0 };
    const net = Number(endorsement.premium_impact || 0);
    const taxes = net * 0.132;
    const gross = net + taxes;
    return { net, taxes, gross };
  }, [endorsement]);

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
        headers: { 'Content-Type': 'application/json' },
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
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Invoiced & Fully Settled
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Diff */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent p-0 w-full justify-start space-x-6 h-auto">
                  <TabsTrigger value="diff" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Changes (Diff)</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">General Details</TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Audit Trail</TabsTrigger>
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
                          </tr>
                        </thead>
                        <tbody>
                          {addedItems.map((item: any) => (
                            <tr key={item.id} className="bg-emerald-50/20 border-b border-emerald-100/50">
                              <td className="p-3 font-semibold text-emerald-800">{item.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="p-3 text-emerald-700 font-bold font-mono">EGP {item.premium?.toLocaleString()}</td>
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
                      <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">National ID / Ref</th>
                            <th className="p-3">Premium Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedItems.map((item: any) => (
                            <tr key={item.id} className="bg-rose-50/20 border-b border-rose-100/50">
                              <td className="p-3 font-semibold text-rose-800">{item.name}</td>
                              <td className="p-3 text-slate-600 font-mono">{item.national_id || '-'}</td>
                              <td className="p-3 text-rose-700 font-bold font-mono">-EGP {item.premium?.toLocaleString()}</td>
                            </tr>
                          ))}
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
                              <td className="p-3 text-amber-700 font-bold font-mono">EGP {item.premium?.toLocaleString()}</td>
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
                  <div className="flex gap-4 relative">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white absolute -left-[22px] top-1 shadow-sm" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Endorsement Created as Draft</p>
                      <p className="text-xs text-slate-500">{new Date(endorsement.creation_date).toLocaleString()} • Source: {endorsement.source}</p>
                    </div>
                  </div>
                  {endorsement.status !== 'Draft' && (
                    <div className="flex gap-4 relative">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white absolute -left-[22px] top-1 shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Submitted for Approval</p>
                        <p className="text-xs text-slate-500">Status updated to Pending Approval</p>
                      </div>
                    </div>
                  )}
                  {endorsement.status === 'Invoiced' && (
                    <div className="flex gap-4 relative">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-white absolute -left-[22px] top-1 shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Endorsement Approved & Invoiced</p>
                        <p className="text-xs text-slate-500">Linked Invoice Generated Automatically</p>
                      </div>
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
                {calculations.gross >= 0 ? '+' : ''}EGP {calculations.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              
              <div className="space-y-3 pt-6 border-t border-slate-700 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Net Premium:</span>
                  <span className="font-mono text-white">EGP {calculations.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Taxes (13.2%):</span>
                  <span className="font-mono text-white">EGP {calculations.taxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Sum Insured Impact:</span>
                  <span className="font-mono text-white">EGP {Number(endorsement.sum_insured_impact || 0).toLocaleString()}</span>
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
