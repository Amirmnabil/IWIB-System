
'use client';
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Search, Filter, MoreHorizontal, ExternalLink,
  X, PlusCircle, FileText, Lock, Scale, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useUser, useMemoFirebase, addDoc, collection, serverTimestamp } from "@/firebase";
import type { InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const INSURER_STATUSES = ["Active", "Inactive", "Suspended", "Under Negotiation", "Contract Expired", "Blacklisted"];
const PRODUCT_TYPES = [
  "Medical", "Life", "Motor", "Property", "Liability",
  "Marine", "Engineering", "Financial Lines", "Cyber",
  "Travel", "Personal Accident"
];
const COMPANY_TYPES = ["Takaful", "Investment"];

const emptyForm = {
  companyName: "",
  companyCode: "",
  companyType: "Takaful" as 'Takaful' | 'Investment',
  type: [] as string[],
  status: "Active" as InsuranceCompany['status'],
  rating: "",
  commercialRegistration: "",
  taxCard: "",
  website: "",
  email: "",
  telephones: [""] as string[],
  address: "",
  notes: "",
  internalComments: "",
  // Addition & Deletion Policy
  calculationMethod: "Monthly" as 'Monthly' | 'Daily',
  allowDeletionIfUtilized: false,
  waitingPeriodDays: 30
};

export default function InsuranceCompaniesDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const insurersRef = useMemoFirebase(() => collection(firestore!, 'insurance_companies'), [firestore]);
  const { data: insurersData, isLoading } = useCollection<InsuranceCompany>(insurersRef);
  const insurers = insurersData || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setProductTypeFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredInsurers = useMemo(() => {
    return insurers.filter(insurer => {
      const matchesStatus = statusFilter === 'all' || insurer.status === statusFilter;
      const matchesType = typeFilter === 'all' || insurer.type?.includes(typeFilter);
      return matchesStatus && matchesType;
    });
  }, [insurers, statusFilter, typeFilter]);

  const handleAddPhone = () => setFormData({ ...formData, telephones: [...formData.telephones, ""] });
  const handleRemovePhone = (idx: number) => setFormData({ ...formData, telephones: formData.telephones.filter((_, i) => i !== idx) });
  const handlePhoneChange = (idx: number, val: string) => {
    const newPhones = [...formData.telephones];
    newPhones[idx] = val;
    setFormData({ ...formData, telephones: newPhones });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    const generatedCode = formData.companyCode || (formData.companyName.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000));

    const insurerData = {
      ...formData,
      companyCode: generatedCode,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: user?.uid || "system_user"
    };

    console.log("[handleSubmit] Attempting to add insurer:", insurerData);
    const colRef = collection(firestore, "insurance_companies");

    addDoc(colRef, insurerData)
      .then((docRef) => {
        toast({ title: "Company created successfully" });
        setDialogOpen(false);
        router.push(`/insurance-companies/${docRef.id}`);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: insurerData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const columns = [
    {
      header: "Company",
      accessorKey: "companyName",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.original.companyName}</p>
            <p className="text-xs text-slate-500 font-mono">{row.original.companyCode}</p>
          </div>
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Types",
      accessorKey: "type",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.original.type?.map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">
              {t}
            </span>
          )) || '-'}
        </div>
      )
    },
    {
      header: "Rating",
      accessorKey: "rating",
      cell: ({ row }: any) => row.original.rating ? <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{row.original.rating}</Badge> : '-'
    },
    {
      header: "Location",
      accessorKey: "address",
      cell: ({ row }: any) => {
        const address = row.original.address;
        let addressStr = '-';
        if (typeof address === 'string') {
          addressStr = address;
        } else if (typeof address === 'object' && address !== null) {
          addressStr = address.fullAddress || [address.city, address.country].filter(Boolean).join(', ');
        }
        return <span className="text-xs text-slate-500 line-clamp-1">{addressStr}</span>;
      }
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/insurance-companies/${row.original.id}`)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const table = useReactTable({
    data: filteredInsurers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Partners"
        description="Comprehensive management of insurance providers and agreements"
        onAction={() => { setFormData(emptyForm); setDialogOpen(true); }}
        actionLabel="Add Partner"
        ActionIcon={Plus}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or code..."
            className="pl-10"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {INSURER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setProductTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            table={table}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/insurance-companies/${row.id}`)}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add New Insurance Partner"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-500" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Company Name *</Label>
                <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required placeholder="Enter insurer name" />
              </div>
              <div className="space-y-2">
                <Label>Company Code</Label>
                <Input value={formData.companyCode} onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })} placeholder="Leave blank to auto-generate" />
              </div>
              <div className="space-y-2">
                <Label>Company Type</Label>
                <Select value={formData.companyType} onValueChange={(v) => setFormData({ ...formData, companyType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Input value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} placeholder="e.g. A+" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Insurance Lines Portfolio</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRODUCT_TYPES.map(type => (
                <label key={type} className={cn(
                  "flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors",
                  formData.type.includes(type) ? "bg-indigo-50 border-indigo-200" : "hover:bg-slate-50"
                )}>
                  <input
                    type="checkbox"
                    checked={formData.type.includes(type)}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...formData.type, type]
                        : formData.type.filter(t => t !== type);
                      setFormData({ ...formData, type: types });
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* New Addition & Deletion Policy Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" /> Addition & Deletion Policy
            </h3>

            {/* Row 1: Addition Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-slate-50/30">
              <div className="space-y-2 md:col-span-2 flex items-center gap-2 border-b pb-2">
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Addition Policy Settings</span>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold">
                  Calculation Method
                  <Info className="w-3 h-3 text-slate-400" />
                </Label>
                <Select value={formData.calculationMethod} onValueChange={(v) => setFormData({ ...formData, calculationMethod: v as any })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500 font-medium">Monthly: charge full/prorated month. Daily: charge per exact day count.</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold">
                  Waiting Period (Days)
                  <Info className="w-3 h-3 text-slate-400" />
                </Label>
                <Input
                  type="number"
                  value={formData.waitingPeriodDays}
                  onChange={(e) => setFormData({ ...formData, waitingPeriodDays: Number(e.target.value) })}
                  placeholder="e.g. 30"
                  className="bg-white"
                />
                <p className="text-[10px] text-slate-500 font-medium">Days before issuing Addition/Deletion invoice after transaction date.</p>
              </div>
            </div>

            {/* Row 2: Deletion Policy */}
            <div className="grid grid-cols-1 gap-6 p-4 border rounded-xl bg-slate-50/30">
              <div className="space-y-2 flex items-center gap-2 border-b pb-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Deletion Policy Settings</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Utilization Check</Label>
                  <p className="text-[10px] text-slate-500 font-medium">Allow deletion if member has medical utilization?</p>
                </div>
                <Switch
                  checked={formData.allowDeletionIfUtilized}
                  onCheckedChange={(v) => setFormData({ ...formData, allowDeletionIfUtilized: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Legal & Registration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commercial Registration Number</Label>
                <Input value={formData.commercialRegistration} onChange={(e) => setFormData({ ...formData, commercialRegistration: e.target.value })} placeholder="CR Number" />
              </div>
              <div className="space-y-2">
                <Label>Tax Card Number</Label>
                <Input value={formData.taxCard} onChange={(e) => setFormData({ ...formData, taxCard: e.target.value })} placeholder="Tax ID" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Primary Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="corporate@email.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Telephone Numbers</Label>
                <div className="space-y-2">
                  {formData.telephones.map((phone, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input value={phone} onChange={(e) => handlePhoneChange(idx, e.target.value)} placeholder="Enter phone number" />
                      <Button type="button" variant="outline" size="icon" onClick={() => handleRemovePhone(idx)} disabled={formData.telephones.length === 1}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddPhone} className="text-indigo-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Number
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={typeof formData.address === 'string' ? formData.address : ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full physical address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" /> Internal Section (System Users Only)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>General Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Public notes..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Internal Comments</Label>
                <Textarea value={formData.internalComments} onChange={(e) => setFormData({ ...formData, internalComments: e.target.value })} placeholder="Confidential broker comments..." rows={2} className="bg-amber-50/30 border-amber-100" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 shadow-md">Create Insurance Partner</Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
