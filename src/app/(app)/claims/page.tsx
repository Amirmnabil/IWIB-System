'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { getColumns } from "./columns";
import { PlusCircle, FileText, Trash2, Edit } from "lucide-react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { Claim, Company, Policy, CensusMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import FormDialog from "@/components/shared/FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Supabase & React Query Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useQueryClient } from "@tanstack/react-query";

const emptyForm: Omit<Claim, 'id' | 'created_at'> = {
  claim_number: "",
  policy_id: "",
  policy_number: "",
  member_id: "",
  member_name: "",
  company_id: "",
  company_name: "",
  insurer_name: "",
  insurer_id: "",
  claim_type: "medical",
  incident_date: "",
  submission_date: new Date().toISOString().split('T')[0],
  claim_amount: 0,
  status: "submitted",
};

// Static Fallback Dropdowns for Premium UX if DB tables are empty
const STATIC_CLAIM_TYPES = [
  { id: "1", code: "medical", name: "Medical" },
  { id: "2", code: "life", name: "Life" },
  { id: "3", code: "motor", name: "Motor" },
  { id: "4", code: "property", name: "Property" }
];

const STATIC_CLAIM_STATUSES = [
  { id: "1", code: "submitted", name: "Submitted" },
  { id: "2", code: "under_review", name: "Under Review" },
  { id: "3", code: "approved", name: "Approved" },
  { id: "4", code: "paid", name: "Paid" },
  { id: "5", code: "rejected", name: "Rejected" }
];

export default function ClaimsPage() {
    const { t, isRtl } = useI18n();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Supabase Hooks
    const { data: claimsData, isLoading } = useSupabaseCollection<Claim>('claims');
    const claims = claimsData || [];

    const { data: companiesData } = useSupabaseCollection<Company>('companies');
    const companies = companiesData || [];

    const { data: membersData } = useSupabaseCollection<CensusMember>('census_members');
    const members = membersData || [];

    const { data: dbTypes } = useSupabaseCollection<any>('master_claim_types');
    const claimTypes = dbTypes && dbTypes.length > 0 ? dbTypes : STATIC_CLAIM_TYPES;

    const { data: dbStatuses } = useSupabaseCollection<any>('master_claim_statuses');
    const claimStatuses = dbStatuses && dbStatuses.length > 0 ? dbStatuses : STATIC_CLAIM_STATUSES;

    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [formData, setFormData] = useState<Omit<Claim, 'id' | 'created_at'>>(emptyForm);

    const resetForm = () => {
        setFormData(emptyForm);
        setSelectedClaim(null);
    };

    const handleEdit = (claim: Claim) => {
        setSelectedClaim(claim);
        setFormData({
            claim_number: claim.claim_number || "",
            policy_id: claim.policy_id || "",
            policy_number: claim.policy_number || "",
            member_id: claim.member_id || "",
            member_name: claim.member_name || "",
            company_id: claim.company_id || "",
            company_name: claim.company_name || "",
            insurer_name: claim.insurer_name || "",
            insurer_id: claim.insurer_id || "",
            claim_type: claim.claim_type || "medical",
            incident_date: claim.incident_date ? claim.incident_date.split('T')[0] : "",
            submission_date: claim.submission_date ? claim.submission_date.split('T')[0] : "",
            claim_amount: claim.claim_amount || 0,
            status: claim.status || "submitted",
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const claimData = { 
              ...formData, 
              created_at: selectedClaim?.created_at || new Date().toISOString() 
            };

            if (selectedClaim) {
                const { error } = await supabase
                  .from("claims")
                  .update(claimData)
                  .eq("id", selectedClaim.id);

                if (error) throw error;
                toast({ title: t('claimUpdated') || "Claim updated successfully" });
            } else {
                const { error } = await supabase
                  .from("claims")
                  .insert(sanitizeUUIDs(claimData));

                if (error) throw error;
                toast({ title: t('claimFiled') || "Claim filed successfully" });
            }
            queryClient.invalidateQueries({ queryKey: ['supabase', 'claims'] });
            setDialogOpen(false);
            resetForm();
        } catch(error: any) {
            console.error("Error submitting claim: ", error);
            toast({ title: "An error occurred.", description: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (selectedClaim) {
            try {
                const { error } = await supabase
                  .from("claims")
                  .delete()
                  .eq("id", selectedClaim.id);

                if (error) throw error;
                toast({ title: t('claimDeleted') || "Claim deleted successfully" });
                queryClient.invalidateQueries({ queryKey: ['supabase', 'claims'] });
            } catch (error: any) {
                console.error("Error deleting claim: ", error);
                toast({ title: "An error occurred while deleting.", description: error.message, variant: "destructive" });
            }
        }
        setDeleteDialogOpen(false);
        setSelectedClaim(null);
    }

    const columns = getColumns({
      onEdit: handleEdit,
      onDelete: (claim) => {
        setSelectedClaim(claim);
        setDeleteDialogOpen(true);
      },
      t
    });

    const table = useReactTable({
        data: claims,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    return (
        <div>
            <PageHeader 
                title={t('allClaims') || "All Claims"} 
                actionLabel={t('fileNewClaim') || "File New Claim"}
                ActionIcon={PlusCircle}
                onAction={() => { resetForm(); setDialogOpen(true); }}
            />
            <DataTable 
                table={table}
                columns={columns} 
                isLoading={isLoading}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                onRowClick={handleEdit}
                searchPlaceholder={t('searchPlaceholder') || "Search..."}
                emptyState={{
                    icon: FileText,
                    title: t('noClaimsFound') || "No claims found",
                    description: t('fileFirstClaimDesc') || "File the first claim to get started.",
                    actionLabel: t('fileNewClaim') || "File New Claim",
                    onAction: () => { resetForm(); setDialogOpen(true); },
                }}
            />

            <FormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={selectedClaim ? t('edit') || "Edit Claim" : t('fileNewClaim') || "File New Claim"}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('claimNumber') || "Claim Number"} *</Label>
                            <Input
                                value={formData.claim_number}
                                onChange={(e) => setFormData({ ...formData, claim_number: e.target.value })}
                                placeholder="CLM-2024-001"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('status')}</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectStatus') || "Select status"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {claimStatuses.map(s => (
                                        <SelectItem key={s.id} value={s.code?.toLowerCase() || s.name.toLowerCase()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('member') || "Member"} *</Label>
                            <Select 
                                value={formData.member_id} 
                                onValueChange={(v) => {
                                    const member = members.find(m => m.id === v);
                                    if (member) {
                                        setFormData({ 
                                            ...formData, 
                                            member_id: v, 
                                            member_name: member.member_full_name,
                                            company_id: member.company_id || "",
                                            company_name: member.policy_number || "", // Fallback
                                            policy_id: member.policy_id || "",
                                            policy_number: member.policy_number || ""
                                        });
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectMember') || "Select member"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.member_full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('policies')}</Label>
                            <Input value={formData.policy_number} readOnly disabled className="bg-slate-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('claimType') || "Claim Type"}</Label>
                            <Select value={formData.claim_type} onValueChange={(v) => setFormData({ ...formData, claim_type: v as any })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectType') || "Select type"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {claimTypes.map(t => (
                                        <SelectItem key={t.id} value={t.code?.toLowerCase() || t.name.toLowerCase()}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('claimAmount') || "Claim Amount"} ({t('egp')}) *</Label>
                            <Input
                                type="number"
                                value={isNaN(formData.claim_amount) ? "" : formData.claim_amount}
                                onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('incidentDate') || "Incident Date"}</Label>
                            <Input
                                type="date"
                                value={formData.incident_date}
                                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('submissionDate') || "Submission Date"}</Label>
                            <Input
                                type="date"
                                value={formData.submission_date}
                                onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        {selectedClaim && (
                            <Button 
                                type="button" 
                                variant="destructive" 
                                onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                                className="mr-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete')}
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                            {selectedClaim ? t('updateClaim') || "Update Claim" : t('fileClaim') || "File Claim"}
                        </Button>
                    </div>
                </form>
            </FormDialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteClaim') || "Delete Claim"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {(t('confirmDeleteClaim') || 'Are you sure you want to delete claim "{number}"? This action cannot be undone.').replace('{number}', selectedClaim?.claim_number || '')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
