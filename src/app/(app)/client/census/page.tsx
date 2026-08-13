'use client';

import React, { useState, useRef, useMemo } from "react";
import { 
  Users, 
  FileText, 
  User, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";

// Empty form object matching client portal schema
const emptyForm = {
  member_name: "",
  member_id_insurance: "",
  staff_code: "",
  member_id_tpa: "",
  date_of_birth: "",
  gender: "Male",
  relation: "Employee",
  nationality: "",
  national_id: "",
  plan_category: "",
  location: "",
  department: "",
  job_title: "",
  mobile_number: "",
  notes: ""
};

export default function ClientCensusPage() {
  const { lang, t, isRtl } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activeCensus: true,
    pendingRequests: true
  });

  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch Client Profile (to get linked policy_id)
  const { data: clientProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['clientProfile', authUser?.email],
    queryFn: async () => {
      if (!authUser?.email) return null;
      const { data, error } = await supabase
        .from('users')
        .select('policy_id')
        .ilike('email', authUser.email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!authUser?.email
  });

  const policyId = clientProfile?.policy_id;

  // 2. Fetch Policies (single policy associated with the user account)
  const { data: policies = [], isLoading: isPoliciesLoading } = useQuery({
    queryKey: ['clientPolicies', policyId],
    queryFn: async () => {
      if (!policyId) return [];
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('id', policyId)
        .maybeSingle();
      if (error) throw error;
      
      const list = data ? [data] : [];
      
      // Auto-select the policy
      if (data && !selectedPolicyId) {
        setSelectedPolicyId(data.id);
      }
      return list;
    },
    enabled: !!policyId
  });

  const activePolicy = useMemo(() => {
    return policies.find((p: any) => p.id === selectedPolicyId);
  }, [policies, selectedPolicyId]);

  // 3. Fetch Policy Members (Active Census)
  const { data: activeMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['policyMembers', selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return [];
      const { data, error } = await supabase
        .from('policy_members')
        .select('*')
        .eq('policy_id', selectedPolicyId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPolicyId
  });

  // 4. Fetch Pending Endorsement Requests
  const { data: pendingRequests = [], isLoading: isEndorsementsLoading } = useQuery({
    queryKey: ['policyEndorsements', selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return [];
      // Fetch endorsements and their items
      const { data, error } = await supabase
        .from('endorsements')
        .select(`
          id,
          endorsement_number,
          endorsement_type,
          status,
          created_at,
          endorsement_items(*)
        `)
        .eq('policy_id', selectedPolicyId)
        .eq('status', 'Pending Approval');
      
      if (error) throw error;

      // Extract and return all pending items
      const items: any[] = [];
      data?.forEach((endorsement: any) => {
        const endorsementItems = (endorsement.endorsement_items || []) as any[];
        endorsementItems.forEach(item => {
          items.push({
            ...item,
            member_name: item.name || item.member_name,
            endorsement_number: endorsement.endorsement_number,
            endorsement_type: endorsement.endorsement_type
          });
        });
      });

      return items;
    },
    enabled: !!selectedPolicyId
  });

  const isLoading = isProfileLoading || isPoliciesLoading || isMembersLoading || isEndorsementsLoading;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return activeMembers;
    const query = searchQuery.toLowerCase();
    return activeMembers.filter((m: any) => 
      (m.member_name || '').toLowerCase().includes(query) ||
      (m.member_id_insurance || '').toLowerCase().includes(query) ||
      (m.national_id || '').toLowerCase().includes(query) ||
      (m.department || '').toLowerCase().includes(query)
    );
  }, [activeMembers, searchQuery]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Safe helper to find or create pending endorsement
  const getOrCreateEndorsementId = async (policyId: string, type: 'addition' | 'deletion') => {
    // Fetch target endorsement type
    const { data: typeRec } = await supabase
      .from('endorsement_types')
      .select('id')
      .eq('name', type === 'addition' ? 'Member Addition' : 'Member Deletion')
      .maybeSingle();

    const typeId = typeRec?.id || null;

    // 1. Check if a pending endorsement of this type already exists
    const { data: existingEnd } = await supabase
      .from('endorsements')
      .select('id')
      .eq('policy_id', policyId)
      .eq('endorsement_type_id', typeId)
      .eq('status', 'Pending Approval')
      .limit(1)
      .maybeSingle();

    if (existingEnd) {
      return existingEnd.id;
    }

    // 2. Otherwise create a new one
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const endNumber = `END-CLI-${type === 'addition' ? 'ADD' : 'DEL'}-${Date.now().toString().slice(-6)}${randomSuffix}`;
    
    const { data: newEnd, error } = await supabase
      .from('endorsements')
      .insert({
        policy_id: policyId,
        line_of_business: 'Medical',
        endorsement_type_id: typeId,
        endorsement_number: endNumber,
        category: 'Corporate',
        status: 'Pending Approval',
        effective_date: new Date().toISOString().split('T')[0],
        source: 'Client Portal'
      })
      .select('id')
      .single();

    if (error) throw error;
    return newEnd.id;
  };

  // Submit manual addition request
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) return;
    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition');

      const payload = {
        endorsement_id: endorsementId,
        name: formData.member_name,
        national_id: formData.national_id,
        action_type: 'add',
        premium: 0,
        details: {
          member_id_insurance: formData.member_id_insurance,
          member_id_tpa: formData.member_id_tpa,
          staff_code: formData.staff_code,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          relation: formData.relation,
          nationality: formData.nationality,
          plan_category: formData.plan_category,
          location: formData.location,
          department: formData.department,
          job_title: formData.job_title,
          mobile_number: formData.mobile_number,
          notes: formData.notes || "Addition requested by client"
        }
      };

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payload));

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: `${formData.member_name} has been added to pending additions.`
      });

      // Reset
      setFormData(emptyForm);
      setAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Failed to submit request",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request member deletion
  const handleDeleteConfirm = async () => {
    if (!selectedPolicyId || !selectedMember) return;
    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion');

      const payload = {
        endorsement_id: endorsementId,
        name: selectedMember.member_name,
        national_id: selectedMember.national_id,
        action_type: 'delete',
        premium: 0,
        details: {
          member_id_insurance: selectedMember.member_id_insurance,
          member_id_tpa: selectedMember.member_id_tpa,
          staff_code: selectedMember.staff_code,
          date_of_birth: selectedMember.date_of_birth,
          gender: selectedMember.gender,
          relation: selectedMember.relation,
          nationality: selectedMember.nationality,
          plan_category: selectedMember.plan_category,
          location: selectedMember.location,
          department: selectedMember.department,
          job_title: selectedMember.job_title,
          mobile_number: selectedMember.mobile_number,
          notes: `Cancellation request requested by client`
        }
      };

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payload));

      if (error) throw error;

      toast({
        title: "Cancellation Requested",
        description: `${selectedMember.member_name} cancellation has been submitted for broker review.`
      });

      setDeleteConfirmOpen(false);
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Failed to submit cancellation",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "Member Name", "Member Ins Code", "Staff Code", "Member TPA Code",
      "Date Of Birth", "Gender", "Relation", "Nationality", "National ID",
      "Plan Category", "Location", "Department", "Job Title"
    ];
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "New Members");
    XLSX.writeFile(wb, "Add_Members_Template.xlsx");
    toast({ title: "Template Downloaded", description: "Fill out the spreadsheet and upload it." });
  };

  // Excel bulk upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPolicyId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          toast({ variant: 'destructive', title: "Upload Failed", description: "Excel sheet is empty." });
          return;
        }

        setIsSubmitting(true);
        const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition');

        const safeDate = (val: any) => {
          if (!val) return null;
          if (val instanceof Date) return val.toISOString().split('T')[0];
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return null;
        };

        const payload = json.map((row: any) => ({
          endorsement_id: endorsementId,
          name: row["Member Name"] || "",
          national_id: row["National ID"] || "",
          action_type: 'add',
          premium: 0,
          details: {
            member_id_insurance: row["Member Ins Code"] || "",
            staff_code: row["Staff Code"] || "",
            member_id_tpa: row["Member TPA Code"] || "",
            date_of_birth: safeDate(row["Date Of Birth"]),
            gender: row["Gender"] || "Male",
            relation: row["Relation"] || "Employee",
            nationality: row["Nationality"] || "",
            plan_category: row["Plan Category"] || "",
            location: row["Location"] || "",
            department: row["Department"] || "",
            job_title: row["Job Title"] || "",
            notes: "Uploaded via client excel portal"
          }
        }));

        const { error } = await supabase
          .from('endorsement_items')
          .insert(sanitizeUUIDs(payload));

        if (error) throw error;

        toast({
          title: "Bulk Requests Submitted",
          description: `${json.length} additions processed and queued for review.`
        });

        setAddDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
      } catch (err: any) {
        console.error(err);
        toast({ variant: 'destructive', title: "Parse Failed", description: err.message });
      } finally {
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">{t('loading' as any) || "Loading portal data..."}</span>
      </div>
    );
  }

  if (!policyId) {
    return (
      <div className="p-8 text-center bg-card border rounded-2xl shadow-sm max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-foreground mb-2">Unassociated Account</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your account is not linked to any active policy contract. Please contact our support team to activate your Client Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-background dark:from-indigo-950/20 dark:via-purple-950/10 p-6 md:p-8 shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Users className="w-7 h-7 text-primary" />
              {t('myCensusPortal' as any) || "Corporate Census Portal"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Welcome to your dedicated dashboard. Monitor covered employees, request membership extensions, or submit cancellation endorsement requests.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {policies.length > 1 && (
              <div className="w-full sm:w-64">
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger className="h-11 bg-background border-border shadow-sm">
                    <SelectValue placeholder="Select Policy Contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.policy_name || p.policy_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }}
              className="h-11 bg-primary text-primary-foreground hover:bg-primary/95 font-bold shadow-md shadow-primary/10 gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addPeople' as any) || "Add Member"}
            </Button>
          </div>
        </div>

        {activePolicy && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/80 text-xs md:text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{t('activeContract' as any) || "Active Contract"}:</span>
              <span className="font-bold text-foreground">{activePolicy.policy_name || activePolicy.policy_number}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{t('insurer' as any) || "Insurer"}:</span>
              <span className="font-semibold text-foreground">{activePolicy.insurer_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">TPA:</span>
              <span className="font-semibold text-foreground">{activePolicy.tpa_name || '-'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{t('validity' as any) || "Contract Validity"}:</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {activePolicy.start_date} to {activePolicy.end_date}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Active Census Members Block */}
      <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
        <div 
          className="p-5 border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors duration-200"
          onClick={() => toggleSection('activeCensus')}
        >
          <div className="flex items-center gap-3">
            {expandedSections.activeCensus ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {t('activeCensus' as any) || "Active Insured Members"}
                <Badge variant="outline" className="bg-indigo-50/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 font-bold ml-2">
                  {activeMembers.length} {t('members' as any) || "Members"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Listed below are all currently covered personnel active on this policy contract.
              </CardDescription>
            </div>
          </div>
          
          <div className="relative w-full max-w-xs hidden sm:block" onClick={e => e.stopPropagation()}>
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
            <Input 
              placeholder={t('searchCensusPlaceholder' as any) || "Search by name, ID..."} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn("h-9 text-xs bg-background/50", isRtl ? "pr-9" : "pl-9")}
            />
          </div>
        </div>

        {expandedSections.activeCensus && (
          <div className="border-t border-border/40">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                {searchQuery ? "No matching members found." : "No active members registered in this contract census."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Name</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Relation</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Plan Category</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Request Cancellation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredMembers.map((member: any) => (
                      <tr key={member.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150">
                        <td className="p-3 ps-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{member.member_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.member_id_insurance || member.national_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="bg-background text-[10px] font-medium">{member.relation}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{member.plan_category || '-'}</td>
                        <td className="p-3 text-muted-foreground">{member.department || '-'}</td>
                        <td className="p-3 text-right pe-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => { setSelectedMember(member); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 2. Pending Requests Tracker Block */}
      <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
        <div 
          className="p-5 border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors duration-200"
          onClick={() => toggleSection('pendingRequests')}
        >
          <div className="flex items-center gap-3">
            {expandedSections.pendingRequests ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {t('pendingRequests' as any) || "Pending Extension Requests"}
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-bold ml-2">
                  {pendingRequests.length} {t('requests' as any) || "Requests"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Track additions and cancellations requests currently being reviewed by your insurance brokers.
              </CardDescription>
            </div>
          </div>
        </div>

        {expandedSections.pendingRequests && (
          <div className="border-t border-border/40">
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No pending addition or deletion extension requests registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Member Name</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Type</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Endorsement Ref</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Date Submitted</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pendingRequests.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150">
                        <td className="p-3 ps-6">
                          <div>
                            <p className="font-bold text-foreground">{item.member_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.member_id_insurance || item.national_id}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[10px] font-semibold border-none px-2 py-0.5",
                              item.action_type === 'add' 
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" 
                                : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            )}
                          >
                            {item.action_type === 'add' ? 'Addition Request' : 'Cancellation Request'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{item.endorsement_number}</td>
                        <td className="p-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right pe-6">
                          <Badge variant="outline" className="bg-amber-50/50 text-amber-700 dark:text-amber-400 border-amber-200/50 text-[10px] font-bold gap-1 px-2.5 py-0.5">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending Review
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* A. Request Member Additions Dialog (Manual Form + Excel Upload) */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Request Membership Additions
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add new employees or dependents to the contract census document. This generates a pending Addition Endorsement.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 border rounded-lg h-10">
              <TabsTrigger value="manual" className="text-xs font-semibold py-1.5">Single Addition</TabsTrigger>
              <TabsTrigger value="excel" className="text-xs font-semibold py-1.5">Bulk Excel Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleManualAddSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="member_name" className="text-xs font-semibold">Full Name *</Label>
                    <Input 
                      id="member_name" 
                      required 
                      value={formData.member_name} 
                      onChange={e => setFormData(prev => ({ ...prev, member_name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="national_id" className="text-xs font-semibold">National ID / Passport *</Label>
                    <Input 
                      id="national_id" 
                      required 
                      value={formData.national_id} 
                      onChange={e => setFormData(prev => ({ ...prev, national_id: e.target.value }))}
                      placeholder="e.g. 100028823"
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_birth" className="text-xs font-semibold">Date Of Birth *</Label>
                    <Input 
                      id="date_of_birth" 
                      type="date"
                      required 
                      value={formData.date_of_birth} 
                      onChange={e => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold">Gender *</Label>
                    <Select value={formData.gender} onValueChange={val => setFormData(prev => ({ ...prev, gender: val }))}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="relation" className="text-xs font-semibold">Relation *</Label>
                    <Select value={formData.relation} onValueChange={val => setFormData(prev => ({ ...prev, relation: val }))}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Select Relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employee">Employee</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="plan_category" className="text-xs font-semibold">Plan Category / Class</Label>
                    <Input 
                      id="plan_category" 
                      value={formData.plan_category} 
                      onChange={e => setFormData(prev => ({ ...prev, plan_category: e.target.value }))}
                      placeholder="e.g. A+, B"
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="staff_code" className="text-xs font-semibold">Staff Code</Label>
                    <Input 
                      id="staff_code" 
                      value={formData.staff_code} 
                      onChange={e => setFormData(prev => ({ ...prev, staff_code: e.target.value }))}
                      placeholder="e.g. EMP-90"
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="job_title" className="text-xs font-semibold">Job Title</Label>
                    <Input 
                      id="job_title" 
                      value={formData.job_title} 
                      onChange={e => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="e.g. Software Engineer"
                      className="h-10 bg-background"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border/60">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="excel" className="mt-4 space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-8 hover:border-primary/50 transition-colors duration-200 bg-slate-50/30 dark:bg-slate-900/10">
                <Upload className="w-10 h-10 text-muted-foreground mb-4 animate-pulse" />
                <h4 className="font-bold text-sm text-foreground mb-1">Upload Excel Spreadsheet</h4>
                <p className="text-xs text-muted-foreground text-center mb-6 max-w-sm">
                  Drag and drop your membership spreadsheet file here, or click to browse. Supports Excel formats (.xlsx, .xls).
                </p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleExcelUpload} 
                  className="hidden" 
                  accept=".xlsx, .xls" 
                />
                
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDownloadTemplate} 
                    className="gap-2 h-10 text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Template
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground font-bold h-10 text-xs gap-2"
                  >
                    {isSubmitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Choose File
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* B. Confirm Deletion Request Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Request Membership Cancellation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm your request to cancel membership for this covered individual. This generates a pending Deletion Endorsement.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 border rounded-xl space-y-2 mt-4 text-xs md:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Name:</span>
                <span className="font-bold text-foreground">{selectedMember.member_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">National ID:</span>
                <span className="font-mono text-foreground">{selectedMember.national_id || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Insurance Code:</span>
                <span className="font-mono text-foreground">{selectedMember.member_id_insurance || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Relation:</span>
                <span className="font-semibold text-foreground">{selectedMember.relation}</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button 
              type="button" 
              onClick={handleDeleteConfirm} 
              disabled={isSubmitting} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
