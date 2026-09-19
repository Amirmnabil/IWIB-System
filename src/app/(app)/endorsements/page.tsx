'use client';

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Filter, FileText, CheckCircle, Clock, AlertTriangle, RefreshCw, Calendar, Search, Trash2, Download, Printer, FileSpreadsheet, Building2 } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import { displayName } from "@/lib/utils/display-name";
import { cn } from "@/lib/utils";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/hooks/use-toast";
import { useUser } from "@/lib/auth-provider";
import ClientCensusPage from "../client/census/page";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import EndorsementDetails from "@/components/endorsements/EndorsementDetails";
import CreateEndorsementWizard from "@/components/endorsements/create-endorsement-wizard";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EndorsementsDashboard() {
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useUser();

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile', authUser?.email],
    queryFn: async () => {
      if (!authUser?.email) return null;
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .ilike('email', authUser.email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!authUser?.email
  });

  // 1. State for Filters
  const [lobFilter, setLobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEndorsementId, setSelectedEndorsementId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);

  // Bulk Approval Workflow states for Admin or Claim Manager
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState<boolean>(false);
  const [bulkApprovalRef, setBulkApprovalRef] = useState<string>("");
  const [bulkApprovalDate, setBulkApprovalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState<boolean>(false);

  const executeBulkDelete = async () => {
    for (const eid of selectedIds) {
      await supabase.from('endorsement_items').delete().eq('endorsement_id', eid);
      await supabase.from('endorsements').delete().eq('id', eid);
    }
    const count = selectedIds.length;
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ['supabase', 'endorsements'] });
    toast({ title: `${count} endorsement(s) deleted` });
    setBulkDeleteDialogOpen(false);
  };
  const [exportedMemberCount, setExportedMemberCount] = useState<number>(0);

  const canApproveSelected = useMemo(() => {
    const role = (userProfile?.role || authUser?.role || '').toLowerCase();
    return (
      role === 'admin' ||
      role === 'claim manager' ||
      role === 'claims manager' ||
      role === 'claim_manager' ||
      role === 'policy admin' ||
      !!userProfile?.is_admin ||
      !!(authUser as any)?.is_admin
    );
  }, [userProfile, authUser]);

  const searchParams = useSearchParams();
  const queryId = searchParams.get('id');

  React.useEffect(() => {
    if (queryId) {
      setSelectedEndorsementId(queryId);
    }
  }, [queryId]);

  // 2. Fetch endorsements and resolve relations on client to bypass schema cache relationship limitations
  const { data: endorsementsRaw = [], isLoading } = useSupabaseCollection<any>('endorsements', undefined, {
    select: '*',
    realtime: true
  });

  const { data: rawPolicies = [] } = useSupabaseCollection<any>('policies', undefined, { 
    select: '*', 
    fetchAll: true 
  });
  const { data: companies = [] } = useSupabaseCollection<any>('companies', undefined, { select: 'id, name', fetchAll: true });
  const { data: endorsementTypes = [] } = useSupabaseCollection<any>('endorsement_types', undefined, { select: 'id, name, name_ar, short_name, short_name_ar', fetchAll: true });

  const policies = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Add all policies from database
    (rawPolicies || []).forEach((p: any) => {
      const company = companies?.find((c: any) => c.id === p.client_company_id || c.id === p.client_id);
      const name = p.client_company_name || company?.name || 'Client';
      map.set(p.id, {
        ...p,
        policy_number: p.policy_number || 'N/A',
        client_company_name: name,
        client: { name }
      });
    });

    // 2. Fallback: add policies referenced in endorsements that might not be in rawPolicies
    (endorsementsRaw || []).forEach((end: any) => {
      const pid = end.policy_id || end.policy?.id;
      if (pid && !map.has(pid)) {
        const company = companies?.find((c: any) => c.id === end.client_id);
        const name = end.client_company_name || company?.name || 'Client';
        map.set(pid, {
          id: pid,
          policy_number: end.policy_number || end.policy?.policy_number || 'Policy',
          client_company_name: name,
          client: { name }
        });
      }
    });

    return Array.from(map.values());
  }, [rawPolicies, endorsementsRaw, companies]);

  const endorsements = useMemo(() => {
    return (endorsementsRaw || []).map((end: any) => {
      const policy = policies?.find((p: any) => p.id === (end.policy_id || end.policy?.id));
      const company = companies?.find((c: any) => c.id === end.client_id);
      const clientName = company?.name || policy?.client_company_name || 'Client';
      const endorsement_type = endorsementTypes?.find((et: any) => 
        et.id === end.endorsement_type_id ||
        (end.endorsement_number && (
          (end.endorsement_number.includes('-ADD-') && (et.code || et.name || '').toLowerCase().includes('add')) ||
          (end.endorsement_number.includes('-DEL-') && (et.code || et.name || '').toLowerCase().includes('del'))
        ))
      );
      return {
        ...end,
        policy_id: end.policy_id || policy?.id,
        policy: policy ? { id: policy.id, policy_number: policy.policy_number, client_company_name: policy.client_company_name } : null,
        client: { name: clientName },
        endorsement_type: endorsement_type ? { ...endorsement_type } : null
      };
    });
  }, [endorsementsRaw, policies, companies, endorsementTypes]);

  // 3. Compute KPI Summary Cards
  const kpis = useMemo(() => {
    let drafts = 0;
    let pendingApproval = 0;
    let approvedMonth = 0;
    let netPremiumImpact = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    (endorsements || []).forEach((end: any) => {
      const premium = Number(end.premium_impact || 0);
      netPremiumImpact += premium;

      if (end.status === 'Draft') {
        drafts++;
      } else if (end.status === 'Pending Approval') {
        pendingApproval++;
      }

      // Check if approved in current month
      if (end.status === 'Approved' || end.status === 'Invoiced') {
        const approvedDate = new Date(end.effective_date);
        if (approvedDate.getMonth() === currentMonth && approvedDate.getFullYear() === currentYear) {
          approvedMonth++;
        }
      }
    });

    return {
      drafts,
      pendingApproval,
      approvedMonth,
      netPremiumImpact
    };
  }, [endorsements]);

  // Policy Endorsements Export/Print Dialog states
  const [exportPolicyDialogOpen, setExportPolicyDialogOpen] = useState<boolean>(false);
  const [selectedExportPolicyId, setSelectedExportPolicyId] = useState<string>("all");
  const [selectedExportStatus, setSelectedExportStatus] = useState<string>("all");
  const [selectedExportFormat, setSelectedExportFormat] = useState<'excel' | 'pdf'>("excel");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportPolicyExcel = async (policyId: string, statusFilter: string = 'all') => {
    try {
      const targetPolicy = (policies || []).find((p: any) => p.id === policyId);
      const policyLabel = targetPolicy ? targetPolicy.policy_number : 'All_Policies';

      let targetEndorsements = (endorsements || []).filter((e: any) => {
        const matchPolicy = policyId === 'all' || 
          e.policy_id === policyId || 
          e.policy?.id === policyId || 
          (targetPolicy && (e.policy_number === targetPolicy.policy_number || e.policy?.policy_number === targetPolicy.policy_number));
        const matchStatus = statusFilter === 'all' || e.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchPolicy && matchStatus;
      });

      if (targetEndorsements.length === 0) {
        toast({ variant: 'destructive', title: "No Endorsements Found", description: "No endorsements match the selected policy and status criteria." });
        return;
      }

      const endIds = targetEndorsements.map((e: any) => e.id);

      const { data: items = [], error } = await supabase
        .from('endorsement_items')
        .select('*')
        .in('endorsement_id', endIds);

      if (error) throw error;

      const summaryRows = targetEndorsements.map((e: any, idx: number) => ({
        "Serial": idx + 1,
        "Policy Number": e.policy?.policy_number || e.policy_number || '',
        "Client Name": e.client?.name || e.client_company_name || '',
        "Endorsement Number": e.endorsement_number || '',
        "Type": displayName(e.endorsement_type, isRtl) || 'Manual',
        "Category": e.category || '',
        "Line of Business": e.line_of_business || '',
        "Effective Date": e.effective_date ? new Date(e.effective_date).toISOString().split('T')[0] : '',
        "Status": e.status || '',
        "Approval Ref": e.approval_ref || '',
        "Net Premium Impact (EGP)": e.premium_impact || 0,
        "Sum Insured Impact (EGP)": e.sum_insured_impact || 0,
        "Notes": e.notes || ''
      }));

      const itemRows = (items || []).map((item: any, idx: number) => {
        const parentEnd = targetEndorsements.find((e: any) => e.id === item.endorsement_id);
        return {
          "Serial": idx + 1,
          "Policy Number": parentEnd?.policy?.policy_number || '',
          "Client Name": parentEnd?.client?.name || '',
          "Endorsement Number": parentEnd?.endorsement_number || item.endorsement_id,
          "Action Type": item.action_type === 'delete' ? 'Deletion' : item.action_type === 'add' ? 'Addition' : 'Modification',
          "Beneficiary Name": item.name || '',
          "National ID": item.national_id || '',
          "Staff ID": item.details?.staff_code || '',
          "Insurer ID": item.details?.member_id_insurance || '',
          "Principal ID": item.details?.principle_id || '',
          "Individual ID": item.details?.member_id_individual || '',
          "Relation": item.details?.relation || '',
          "Plan Category": item.details?.plan_category || '',
          "Effective Date": parentEnd?.effective_date ? new Date(parentEnd.effective_date).toISOString().split('T')[0] : '',
          "Premium Impact (EGP)": item.premium || 0
        };
      });

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Endorsements Summary");

      if (itemRows.length > 0) {
        const wsItems = XLSX.utils.json_to_sheet(itemRows);
        XLSX.utils.book_append_sheet(wb, wsItems, "Beneficiary Changes Breakdown");
      }

      const filename = `Endorsements_${policyLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Excel Export Complete",
        description: `Exported ${targetEndorsements.length} endorsement(s) and ${itemRows.length} beneficiary item(s).`
      });
    } catch (err: any) {
      console.error('Excel Export error:', err);
      toast({ variant: 'destructive', title: "Export Failed", description: err.message || "Failed to generate Excel." });
    }
  };

  const handleExportPolicyPDF = async (policyId: string, statusFilter: string = 'all') => {
    try {
      const targetPolicy = (policies || []).find((p: any) => p.id === policyId);
      const policyNumber = targetPolicy ? targetPolicy.policy_number : 'All Policies';
      const clientName = targetPolicy ? (targetPolicy.client_company_name || targetPolicy.client?.name || 'All Clients') : 'All Clients';

      let targetEndorsements = (endorsements || []).filter((e: any) => {
        const matchPolicy = policyId === 'all' || 
          e.policy_id === policyId || 
          e.policy?.id === policyId || 
          (targetPolicy && (e.policy_number === targetPolicy.policy_number || e.policy?.policy_number === targetPolicy.policy_number));
        const matchStatus = statusFilter === 'all' || e.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchPolicy && matchStatus;
      });

      if (targetEndorsements.length === 0) {
        toast({ variant: 'destructive', title: "No Endorsements Found", description: "No endorsements match the selected policy and status criteria." });
        return;
      }

      const totalNetImpact = targetEndorsements.reduce((sum: number, e: any) => sum + Number(e.premium_impact || 0), 0);

      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        toast({ variant: 'destructive', title: "Pop-up Blocked", description: "Please allow pop-ups to print or download PDF." });
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Policy Endorsements Report - ${policyNumber}</title>
            <style>
              @media print {
                @page { size: A4 portrait; margin: 15mm; }
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
              body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 24px; background: #f8fafc; }
              .container { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2A75F3; padding-bottom: 20px; margin-bottom: 24px; }
              .logo { font-size: 24px; font-weight: 900; color: #2A75F3; letter-spacing: -0.5px; }
              .subtitle { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
              .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f1f5f9; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 12px; }
              .meta-item { display: flex; flex-direction: column; }
              .meta-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
              .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
              th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 10px; }
              td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; }
              tr:nth-child(even) { background: #f8fafc; }
              .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
              .badge-approved { background: #dcfce7; color: #166534; }
              .badge-pending { background: #fef3c7; color: #92400e; }
              .badge-draft { background: #f1f5f9; color: #475569; }
              .section-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
              .impact-box { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 700; margin-bottom: 32px; }
              .impact-val { font-size: 20px; font-weight: 900; color: ${totalNetImpact >= 0 ? '#f87171' : '#4ade80'}; }
              .footer { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center; font-size: 11px; color: #64748b; }
              .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 4px; font-weight: 700; color: #334155; }
              .btn-print { background: #2A75F3; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: 700; border-radius: 8px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align: right; margin-bottom: 16px;">
              <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
            </div>
            <div class="container">
              <div class="header">
                <div>
                  <div class="logo">IWIB SYSTEM</div>
                  <div class="subtitle">Official Policy Endorsements Statement</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; font-weight: 700; color: #334155;">Generated Date</div>
                  <div style="font-size: 11px; color: #64748b;">${currentDate}</div>
                </div>
              </div>

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Policy Number</span>
                  <span class="meta-val">${policyNumber}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Client Company</span>
                  <span class="meta-val">${clientName}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Total Endorsements</span>
                  <span class="meta-val">${targetEndorsements.length}</span>
                </div>
              </div>

              <div class="section-title">Endorsements Summary</div>
              <table>
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Type</th>
                    <th>Effective Date</th>
                    <th>Status</th>
                    <th>Ref #</th>
                    <th style="text-align: right;">Net Premium Impact</th>
                  </tr>
                </thead>
                <tbody>
                  ${targetEndorsements.map((e: any) => `
                    <tr>
                      <td style="font-weight: 700; font-family: monospace;">${e.endorsement_number || e.id.slice(0, 8)}</td>
                      <td>${displayName(e.endorsement_type, isRtl) || e.line_of_business || 'Manual'}</td>
                      <td>${e.effective_date ? new Date(e.effective_date).toLocaleDateString() : '-'}</td>
                      <td><span class="badge ${e.status === 'Approved' || e.status === 'Issued' ? 'badge-approved' : e.status === 'Pending' || e.status === 'Pending Approval' ? 'badge-pending' : 'badge-draft'}">${e.status}</span></td>
                      <td style="font-family: monospace;">${e.approval_ref || '-'}</td>
                      <td style="text-align: right; font-weight: 700;">${Number(e.premium_impact || 0) >= 0 ? '+' : ''}${Math.round(e.premium_impact || 0).toLocaleString()} EGP</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="impact-box">
                <span>Total Net Financial Impact</span>
                <span class="impact-val">${totalNetImpact >= 0 ? '+' : ''}${Math.round(totalNetImpact).toLocaleString()} EGP</span>
              </div>

              <div class="footer">
                <div>
                  <div>Prepared By</div>
                  <div class="sig-line">IWIB Policy Administration</div>
                </div>
                <div>
                  <div>Approved & Authorized</div>
                  <div class="sig-line">Underwriting / Client Operations</div>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      console.error('PDF Export error:', err);
      toast({ variant: 'destructive', title: "PDF Print Failed", description: err.message || "Failed to generate PDF." });
    }
  };

  // 4. Apply Filters
  const filteredEndorsements = useMemo(() => {
    return (endorsements || []).filter((end: any) => {
      const matchLob = lobFilter === 'all' || end.line_of_business?.toLowerCase() === lobFilter.toLowerCase();
      const matchStatus = statusFilter === 'all' || end.status?.toLowerCase() === statusFilter.toLowerCase();
      
      const clientName = end.client?.name || '';
      const policyNumber = end.policy?.policy_number || '';
      const endNumber = end.endorsement_number || '';
      
      const matchSearch = searchQuery === '' || 
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endNumber.toLowerCase().includes(searchQuery.toLowerCase());

      return matchLob && matchStatus && matchSearch;
    });
  }, [endorsements, lobFilter, statusFilter, searchQuery]);

  // Bulk Approval & Excel Download Workflow Handler
  const handleStartBulkApproval = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      // 1. Fetch all endorsement items for selected endorsement records
      const { data: items = [], error } = await supabase
        .from('endorsement_items')
        .select('*')
        .in('endorsement_id', selectedIds);

      if (error) throw error;

      // 2. Build structured Excel spreadsheet including all members across selected endorsements
      const exportData = (items || []).map((item: any, idx: number) => {
        const parentEnd = (endorsements || []).find((e: any) => e.id === item.endorsement_id);
        return {
          "Serial": idx + 1,
          "Endorsement Ref": parentEnd?.endorsement_number || item.endorsement_id,
          "Client Name": parentEnd?.client?.name || '',
          "Policy Number": parentEnd?.policy?.policy_number || '',
          "Action Type": item.action_type === 'delete' ? 'Deletion' : 'Addition',
          "Member Name": item.name || '',
          "National ID": item.national_id || '',
          "Staff ID": item.details?.staff_code || '',
          "Insurer ID": item.details?.member_id_insurance || '',
          "Principal ID": item.details?.principle_id || '',
          "Individual ID": item.details?.member_id_individual || '',
          "Relation": item.details?.relation || '',
          "Plan Category": item.details?.plan_category || '',
          "Effective Date": parentEnd?.effective_date ? new Date(parentEnd.effective_date).toISOString().split('T')[0] : '',
          "Financial Impact (EGP)": item.premium || 0
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData.length > 0 ? exportData : [{ "Message": "No item records found for selected endorsements" }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Selected Members Approval");
      const filename = `Bulk_Approval_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      setExportedMemberCount(items.length);
      setBulkApprovalRef(`BULK-APP-${Date.now().toString().slice(-6)}`);
      setBulkApproveDialogOpen(true);
      toast({
        title: "Excel File Downloaded",
        description: `Downloaded ${items.length} member record(s) across ${selectedIds.length} endorsement(s). Please confirm approval.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Bulk Approval Export Failed", description: err.message });
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleConfirmBulkApproval = async () => {
    if (selectedIds.length === 0 || !bulkApprovalRef || !bulkApprovalDate) return;
    setIsBulkApproving(true);
    try {
      for (const eid of selectedIds) {
        const { error } = await supabase
          .from('endorsements')
          .update({
            status: 'Approved',
            approval_ref: bulkApprovalRef,
            approval_date: bulkApprovalDate,
            approved_by: authUser?.id
          })
          .eq('id', eid);

        if (error) throw error;
      }

      toast({
        title: "Bulk Approval Completed",
        description: `Successfully approved ${selectedIds.length} endorsement(s) and logged approval reference ${bulkApprovalRef}.`
      });

      setBulkApproveDialogOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'endorsements'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Approval Failed", description: err.message });
    } finally {
      setIsBulkApproving(false);
    }
  };

  if (isProfileLoading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading portal data...</div>;
  }

  if (userProfile?.role === 'Client') {
    return <ClientCensusPage />;
  }

  const getStatusBadge = (status: string, autoApproved?: boolean, source?: string) => {
    if (autoApproved || source === 'bulk_census_upload') {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs font-semibold">
            {t('autoApproved' as any) || "Auto-Approved"}
          </Badge>
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-[10px]">
            {t('bulkCensusUpload' as any) || "Bulk Census"}
          </Badge>
        </div>
      );
    }
    switch (status) {
      case "Pending":
      case "Pending Approval":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pending</Badge>;
      case "Issued":
      case "Approved":
      case "Invoiced":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Issued</Badge>;
      case "Completed":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Completed</Badge>;
      case "Rejected":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">{t('status_rejected') || "Rejected"}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200">{t('status_draft') || "Draft"}</Badge>;
    }
  };

  const getImpactTextClass = (impact: number) => {
    if (impact > 0) return "text-rose-600 font-bold";
    if (impact < 0) return "text-emerald-600 font-bold";
    return "text-slate-500 font-medium";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Top Header Row */}
      <PageHeader title={t('endorsementsHub' as any) || "Endorsements Hub"}>
        <Button 
          variant="outline" 
          onClick={() => setExportPolicyDialogOpen(true)} 
          className="h-8 px-3 rounded-lg text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
          <span>Export / Print Policy</span>
        </Button>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-lg text-xs font-semibold">
          <Plus className={cn("w-3.5 h-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
          {t('createEndorsement' as any) || "Create Endorsement"}
        </Button>
      </PageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600"><FileText className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('totalDrafts' as any) || "Total Drafts"}</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.drafts}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.pendingApproval}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('approvedMtd' as any) || "Approved (MTD)"}</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.approvedMonth}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertTriangle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('netFinImpact' as any) || "Net Fin. Impact"}</p>
              <h3 className={cn("text-xl font-black", kpis.netPremiumImpact >= 0 ? "text-rose-600" : "text-emerald-600")}>
                {isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : formatCurrency(kpis.netPremiumImpact)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-white">
        <div className="p-6 border-b border-border bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800">{t('filter' as any) || "Filter Endorsements"}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search Client/Policy/ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 bg-white border-slate-200 text-sm rounded-xl w-full sm:w-60"
              />
            </div>

            {/* LoB Select */}
            <Select value={lobFilter} onValueChange={setLobFilter}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-sm w-full">
                <SelectValue placeholder="Line of Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LOBs</SelectItem>
                <SelectItem value="Medical">Medical</SelectItem>
                <SelectItem value="Life">Life</SelectItem>
                <SelectItem value="Motor">Motor</SelectItem>
                <SelectItem value="Property">Property</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Select */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-sm w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Issued">Issued</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Endorsements Table */}
        <div className="overflow-x-auto">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
              <span className="text-xs font-bold text-blue-400">{selectedIds.length} endorsement(s) selected</span>
              <div className="flex items-center gap-2">
                {canApproveSelected && (
                  <Button
                    size="sm"
                    onClick={handleStartBulkApproval}
                    disabled={isBulkApproving}
                    className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md shadow-emerald-900/40"
                  >
                    {isBulkApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Approve Selected & Export Excel
                  </Button>
                )}
                <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg gap-1" onClick={() => setBulkDeleteDialogOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-300 hover:text-white" onClick={() => setSelectedIds([])}>Clear</Button>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-3">
              <RefreshCw className="animate-spin w-5 h-5 text-indigo-600" />
              <span>Loading endorsements list...</span>
            </div>
          ) : filteredEndorsements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No endorsements match the selected criteria.
            </div>
          ) : (
            <table className={cn("w-full border-collapse", isRtl ? "text-right" : "text-left")}>
              <thead className="bg-muted/40 border-b border-border/60 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 pl-6 w-10"><input type="checkbox" className="rounded" checked={selectedIds.length === filteredEndorsements.length && filteredEndorsements.length > 0} onChange={() => setSelectedIds(prev => prev.length === filteredEndorsements.length ? [] : filteredEndorsements.map((e: any) => e.id))} /></th>
                  <th className={cn("px-4 py-2.5 whitespace-nowrap", isRtl ? "pr-6" : "pl-2")}>{t('idRef' as any) || "ID / Ref"}</th>
                  <th className="px-4 py-2.5">{t('clientPolicy' as any) || "Client / Policy"}</th>
                  <th className="px-4 py-2.5">{t('type') || "Type"}</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">LoB</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Effective Date</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">{t('financialImpact' as any) || "Financial Impact"}</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">{t('status') || "Status"}</th>
                  <th className={cn("px-4 py-2.5 whitespace-nowrap", isRtl ? "pl-6 text-left" : "pr-6 text-right")}>{t('action' as any) || "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {filteredEndorsements.map((end: any) => (
                  <tr key={end.id} onClick={() => setSelectedEndorsementId(end.id)} className={cn("hover:bg-muted/50 transition-colors group cursor-pointer", selectedIds.includes(end.id) ? 'bg-rose-50/50 dark:bg-rose-950/20' : '')}>
                    <td className="px-4 py-3 pl-6 w-10" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.includes(end.id)} onChange={() => setSelectedIds(prev => prev.includes(end.id) ? prev.filter(x => x !== end.id) : [...prev, end.id])} /></td>
                    <td className={cn("px-4 py-3 pl-2 font-bold text-primary font-mono text-sm whitespace-nowrap")}>
                      {end.endorsement_number || end.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground text-sm max-w-[220px] truncate">{end.client?.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{end.policy?.policy_number || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground text-sm">{displayName(end.endorsement_type, isRtl) || "Manual"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">{end.line_of_business}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">{new Date(end.effective_date).toLocaleDateString()}</td>
                    <td className={cn("px-4 py-3 text-sm whitespace-nowrap", getImpactTextClass(Number(end.premium_impact || 0)))}>
                      {Number(end.premium_impact || 0) >= 0 ? '+' : ''}{formatCurrency(Number(end.premium_impact || 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(end.status, end.auto_approved, end.source)}</td>
                    <td className={cn("px-4 py-3 whitespace-nowrap", isRtl ? "pl-6 text-left" : "pr-6 text-right")}>
                      <Button variant="ghost" size="sm" className="text-muted-foreground group-hover:text-primary text-xs">
                        {t('viewDetails' as any) || "View Details"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Endorsement Details Dialog Modal */}
      <Dialog open={!!selectedEndorsementId} onOpenChange={(open) => !open && setSelectedEndorsementId(null)}>
        <DialogContent className="max-w-4xl bg-card border border-border shadow-2xl p-0 overflow-hidden rounded-2xl gap-0 h-[85vh] max-h-[85vh] [&>button.absolute]:hidden" style={{ display: 'flex', flexDirection: 'column' }}>
          <DialogTitle className="sr-only">Endorsement Details</DialogTitle>
          {selectedEndorsementId && (
            <EndorsementDetails 
              id={selectedEndorsementId} 
              onClose={() => setSelectedEndorsementId(null)} 
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['supabase', 'endorsements'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Endorsement Dialog Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-5xl bg-card border border-border shadow-2xl p-0 overflow-hidden rounded-2xl gap-0 max-h-[85vh] [&>button.absolute]:hidden" style={{ display: 'flex', flexDirection: 'column' }}>
          <DialogTitle className="sr-only">Create Endorsement</DialogTitle>
          <CreateEndorsementWizard 
            onClose={() => setCreateDialogOpen(false)} 
            onSuccess={() => {
              setCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['supabase', 'endorsements'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Approval Confirmation Dialog Modal */}
      <Dialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
          <DialogTitle className="text-base font-bold text-slate-900">Approve Selected Endorsements</DialogTitle>
          <div className="space-y-4 mt-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold space-y-1">
              <p>✅ <strong>Excel File Exported:</strong> Includes {exportedMemberCount} member record(s) across {selectedIds.length} selected endorsement(s).</p>
              <p className="text-[11px] text-emerald-700 font-normal">Please confirm approval to update status in database.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Approval Reference Number *</label>
              <Input
                value={bulkApprovalRef}
                onChange={e => setBulkApprovalRef(e.target.value)}
                placeholder="e.g. BULK-APP-2026-001"
                className="h-9 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Approval Date *</label>
              <Input
                type="date"
                value={bulkApprovalDate}
                onChange={e => setBulkApprovalDate(e.target.value)}
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmBulkApproval}
              disabled={isBulkApproving || !bulkApprovalRef || !bulkApprovalDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-lg text-xs font-bold shadow-md shadow-emerald-200/50 flex items-center gap-1.5"
            >
              {isBulkApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Confirm Approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Policy Endorsements Dialog Modal */}
      <Dialog open={exportPolicyDialogOpen} onOpenChange={setExportPolicyDialogOpen}>
        <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Export / Print Policy Endorsements
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
              Select a policy and status filter to export complete endorsement summaries and beneficiary item details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Policy Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Policy / Client *
              </Label>
              <Select value={selectedExportPolicyId} onValueChange={setSelectedExportPolicyId}>
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="All Policies (System-wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Policies (System-wide)</SelectItem>
                  {(policies || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.policy_number} — {p.client?.name || p.client_company_name || 'Client'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Endorsement Status Filter</Label>
              <Select value={selectedExportStatus} onValueChange={setSelectedExportStatus}>
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Approved">Approved / Issued</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection Cards */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Choose Export Format *</Label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedExportFormat('excel')}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all",
                    selectedExportFormat === 'excel'
                      ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <FileSpreadsheet className={cn("w-6 h-6", selectedExportFormat === 'excel' ? "text-emerald-600" : "text-slate-400")} />
                    {selectedExportFormat === 'excel' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-900">Excel (.xlsx)</p>
                    <p className="text-[10px] text-slate-500 font-medium">Multi-sheet raw data & beneficiary census breakdown</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedExportFormat('pdf')}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all",
                    selectedExportFormat === 'pdf'
                      ? "border-rose-600 bg-rose-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Printer className={cn("w-6 h-6", selectedExportFormat === 'pdf' ? "text-rose-600" : "text-slate-400")} />
                    {selectedExportFormat === 'pdf' && <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-900">PDF / Print Layout</p>
                    <p className="text-[10px] text-slate-500 font-medium">Branded printable document report with signature blocks</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportPolicyDialogOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsExporting(true);
                try {
                  if (selectedExportFormat === 'excel') {
                    await handleExportPolicyExcel(selectedExportPolicyId, selectedExportStatus);
                  } else {
                    await handleExportPolicyPDF(selectedExportPolicyId, selectedExportStatus);
                  }
                  setExportPolicyDialogOpen(false);
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              className={cn(
                "h-9 px-5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5",
                selectedExportFormat === 'excel'
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-200/50"
              )}
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : selectedExportFormat === 'excel' ? (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              {selectedExportFormat === 'excel' ? "Export Excel File" : "Generate & Print PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl border border-border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">Delete Selected Endorsements</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium leading-relaxed">
              Are you sure you want to delete {selectedIds.length} endorsement(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-lg font-semibold h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-semibold h-9 px-6">Confirm Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
