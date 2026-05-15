
'use client';
import React, { useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { getColumns } from "./columns";
import { PlusCircle, FileText, Trash2, Edit } from "lucide-react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc } from "@/firebase";
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

export default function ClaimsPage() {
    const { t, isRtl } = useI18n();
    const firestore = useFirestore();
    const claimsRef = useMemoFirebase(() => collection(firestore!, 'claims'), [firestore]);
    const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
    const membersRef = useMemoFirebase(() => collection(firestore!, 'census'), [firestore]);

    // Master Data
    const claimTypesRef = useMemoFirebase(() => collection(firestore!, 'master_claim_types'), [firestore]);
    const { data: claimTypesData } = useCollection<any>(claimTypesRef);
    const claimTypes = claimTypesData || [];

    const claimStatusesRef = useMemoFirebase(() => collection(firestore!, 'master_claim_statuses'), [firestore]);
    const { data: claimStatusesData } = useCollection<any>(claimStatusesRef);
    const claimStatuses = claimStatusesData || [];

    const { data: claimsData, isLoading } = useCollection<Claim>(claimsRef);
    const claims = claimsData || [];
    const { data: companiesData } = useCollection<Company>(companiesRef);
    const companies = companiesData || [];
    const { data: membersData } = useCollection<CensusMember>(membersRef);
    const members = membersData || [];
    
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [formData, setFormData] = useState<Omit<Claim, 'id' | 'created_at'>>(emptyForm);
    
    const { toast } = useToast();

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
        if (!firestore) return;
        try {
            const claimData = { ...formData, created_at: selectedClaim?.created_at || new Date().toISOString() };
            if (selectedClaim) {
                await updateDoc(doc(firestore, "claims", selectedClaim.id), claimData);
                toast({ title: t('claimUpdated') || "Claim updated successfully" });
            } else {
                await addDoc(collection(firestore, "claims"), claimData);
                toast({ title: t('claimFiled') || "Claim filed successfully" });
            }
            setDialogOpen(false);
            resetForm();
        } catch(error) {
            console.error("Error submitting claim: ", error);
            toast({ title: "An error occurred.", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (selectedClaim && firestore) {
            try {
                await deleteDoc(doc(firestore, "claims", selectedClaim.id));
                toast({ title: t('claimDeleted') || "Claim deleted successfully" });
            } catch (error) {
                console.error("Error deleting claim: ", error);
                toast({ title: "An error occurred while deleting.", variant: "destructive" });
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
                                    {claimStatuses.length === 0 && <SelectItem value="submitted">{t('submitted') || "Submitted"}</SelectItem>}
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
                                            company_id: member.company_id,
                                            company_name: member.company_name,
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
                                    {claimTypes.length === 0 && <SelectItem value="medical">Medical</SelectItem>}
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
