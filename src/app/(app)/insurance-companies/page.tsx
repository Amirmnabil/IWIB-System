
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
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
import { useToast } from "@/lib/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth-provider";
import type { InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
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
  companyNameAr: "",
  companyCode: "",
  companyType: "Takaful" as 'Takaful' | 'Investment',
  type: [] as string[],
  status: "Active" as InsuranceCompany['status'],
  rating: "",
  commercialRegistration: "",
  taxCard: "",
  commission_tax_percent: 0,
  website: "",
  email: "",
  telephones: [""] as string[],
  address: "",
  notes: "",
  internalComments: "",
  // Addition & Deletion Policy
  proration_method: "monthly" as 'monthly' | 'daily',
  allowDeletionIfUtilized: false,
  waitingPeriodDays: 30,
  logo_url: ""
};

export default function InsuranceCompaniesDashboard() {
  const { t, isRtl, lang } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const { data: rawInsurersData, isLoading } = useSupabaseCollection<InsuranceCompany>('insurance_companies');
  const insurers = useMemo(() => {
    if (!rawInsurersData) return [];
    return rawInsurersData.map((insurer: any) => {
      const contactInfo = insurer.contact_info || {};
      return {
        ...insurer,
        companyNameAr: insurer.companyNameAr || contactInfo.companyNameAr || "",
        rating: insurer.rating || contactInfo.rating || "",
        type: insurer.type || contactInfo.type || [],
        email: insurer.email || contactInfo.email || "",
        telephones: (insurer.telephones?.length || 0) > 0 ? insurer.telephones : (contactInfo.telephones || []),
        website: insurer.website || contactInfo.website || "",
        internalComments: insurer.internalComments || contactInfo.internalComments || "",
        notes: insurer.notes || contactInfo.notes || "",
        address: insurer.address || contactInfo.address || "",
        commercialRegistration: insurer.commercialRegistration || contactInfo.commercialRegistration || "",
        taxCard: insurer.taxCard || contactInfo.taxCard || "",
        commission_tax_percent: insurer.commission_tax_percent || contactInfo.commission_tax_percent || 0
      };
    });
  }, [rawInsurersData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const generatedCode = formData.companyCode || (formData.companyName.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000));

    try {
      const contact_info = {
        companyNameAr: formData.companyNameAr || formData.companyName,
        rating: formData.rating,
        type: formData.type,
        email: formData.email,
        telephones: formData.telephones,
        website: formData.website,
        address: formData.address,
        commercialRegistration: formData.commercialRegistration,
        taxCard: formData.taxCard,
        internalComments: formData.internalComments,
        notes: formData.notes,
        commission_tax_percent: formData.commission_tax_percent
      };

      const payload = {
        companyName: formData.companyName,
        companyCode: generatedCode,
        companyType: formData.companyType,
        status: formData.status,
        logo_url: formData.logo_url || null,
        contact_info,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from("insurance_companies").insert(sanitizeUUIDs(payload)).select('id').single();
      if (error) throw error;

      // Seed rules for new insurer company with empty (NULL) values, forcing configuration later
      const rulesData = {
        insurer_id: data.id,
        proration_method: null,
        late_addition_threshold_month: null,
        minimum_premium_percentage_after_threshold: null,
        refund_allowed_if_utilized: null,
        refund_processing_delay_days: null,
        dependent_termination_on_main_delete: null,
        coverage_start_basis: null,
        refund_proration_method: null
      };
      
      let rulesResult = await supabase.from("insurer_endorsement_rules").insert(rulesData);
      if (rulesResult.error && (rulesResult.error.message.includes('Could not find') || rulesResult.error.code === 'PGRST204')) {
        // Fallback if schema migrations haven't run
        const { coverage_start_basis, refund_proration_method, ...fallbackData } = rulesData;
        rulesResult = await supabase.from("insurer_endorsement_rules").insert(fallbackData);
      }
      if (rulesResult.error) {
        console.error("Failed to seed rules for new insurer company:", rulesResult.error);
      }

      toast({ title: t('companyCreated') || "Company created successfully" });
      setDialogOpen(false);
      router.push(`/insurance-companies/${data.id}`);
    } catch (error: any) {
      console.error(error);
    }
  };

  const columns = [
    {
      header: t('companies'),
      accessorKey: "companyName",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {lang === 'ar' ? (row.original.companyNameAr || row.original.companyName) : row.original.companyName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.companyCode}</p>
          </div>
        </div>
      )
    },
    {
      header: t('status'),
      accessorKey: "status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: t('types') || "Types",
      accessorKey: "type",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.original.type?.map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-slate-100 text-muted-foreground rounded text-[10px] uppercase font-bold">
              {t}
            </span>
          )) || '-'}
        </div>
      )
    },
    {
      header: t('rating') || "Rating",
      accessorKey: "rating",
      cell: ({ row }: any) => row.original.rating ? <Badge variant="secondary" className="bg-primary/10 text-indigo-700">{row.original.rating}</Badge> : '-'
    },
    {
      header: t('location') || "Location",
      accessorKey: "address",
      cell: ({ row }: any) => {
        const address = row.original.address;
        let addressStr = '-';
        if (typeof address === 'string') {
          addressStr = address;
        } else if (typeof address === 'object' && address !== null) {
          addressStr = address.fullAddress || [address.city, address.country].filter(Boolean).join(', ');
        }
        return <span className="text-xs text-muted-foreground line-clamp-1">{addressStr}</span>;
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
              {t('viewDetails')}
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
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('insurancePartners')}
        
        onAction={() => { setFormData(emptyForm); setDialogOpen(true); }}
        actionLabel={t('addPartner')}
        ActionIcon={Plus}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t('searchPlaceholder') || "Search by name or code..."}
            className={cn(isRtl ? "pr-10" : "pl-10")}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className={cn("w-4 h-4 text-slate-400", isRtl ? "ml-2" : "mr-2")} />
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {INSURER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setProductTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className={cn("w-4 h-4 text-slate-400", isRtl ? "ml-2" : "mr-2")} />
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
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
        title={t('addPartner')}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-500" /> {t('basicInformation')}
            </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company Name (EN) *</Label>
                <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required placeholder={t('insuranceCompanies')} />
              </div>
              <div className="space-y-2">
                <Label>Company Name (AR) *</Label>
                <Input value={formData.companyNameAr || ''} onChange={(e) => setFormData({ ...formData, companyNameAr: e.target.value })} required placeholder="الاسم باللغة العربية" className="font-arabic" dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t('companyCode')}</Label>
                <Input value={formData.companyCode} onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })} placeholder={t('searchPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('companyType')}</Label>
                <Select value={formData.companyType} onValueChange={(v) => setFormData({ ...formData, companyType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('status')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('rating')}</Label>
                <Input value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} placeholder="e.g. A+" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-sm font-black uppercase tracking-widest text-slate-400">{t('insuranceLinesPortfolio')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRODUCT_TYPES.map(type => (
                <label key={type} className={cn(
                  "flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors",
                  formData.type.includes(type) ? "bg-primary/10 border-indigo-200" : "hover:bg-background"
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
                    className="rounded text-primary focus:ring-indigo-500"
                  />
                  <span className="text-standard">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* New Addition & Deletion Policy Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" /> {t('additionDeletionPolicy')}
            </h3>

            {/* Row 1: Addition Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-background/30">
              <div className="space-y-2 md:col-span-2 flex items-center gap-2 border-b pb-2">
                <PlusCircle className="w-4 h-4 text-success" />
                <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Addition Policy Settings</span>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold">
                  Proration Method
                  <Info className="w-3 h-3 text-slate-400" />
                </Label>
                <Select value={formData.proration_method} onValueChange={(v) => setFormData({ ...formData, proration_method: v as any })}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground font-medium">Monthly: charge full/prorated month. Daily: charge per exact day count.</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold">
                  {t('waitingPeriodDays')}
                  <Info className="w-3 h-3 text-slate-400" />
                </Label>
                <Input
                  type="number"
                  value={formData.waitingPeriodDays}
                  onChange={(e) => setFormData({ ...formData, waitingPeriodDays: Number(e.target.value) })}
                  placeholder="e.g. 30"
                  className="bg-card"
                />
                <p className="text-[10px] text-muted-foreground font-medium">Days before issuing Addition/Deletion invoice after transaction date.</p>
              </div>
            </div>

            {/* Row 2: Deletion Policy */}
            <div className="grid grid-cols-1 gap-6 p-4 border rounded-xl bg-background/30">
              <div className="space-y-2 flex items-center gap-2 border-b pb-2">
                <X className="w-4 h-4 text-destructive" />
                <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">{t('additionDeletionPolicy')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">{t('utilizationCheck')}</Label>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('internalComments')}</p>
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
              <FileText className="w-4 h-4 text-indigo-500" /> {t('legalRegistration')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('commercialRegistration')}</Label>
                <Input value={formData.commercialRegistration} onChange={(e) => setFormData({ ...formData, commercialRegistration: e.target.value })} placeholder="CR Number" />
              </div>
              <div className="space-y-2">
                <Label>{t('taxCard')}</Label>
                <Input value={formData.taxCard} onChange={(e) => setFormData({ ...formData, taxCard: e.target.value })} placeholder="Tax ID" />
              </div>
              <div className="space-y-2">
                <Label>Commission Tax (%)</Label>
                <Input type="number" step="0.01" value={formData.commission_tax_percent} onChange={(e) => setFormData({ ...formData, commission_tax_percent: Number(e.target.value) })} placeholder="e.g. 5" />
              </div>
              <div className="space-y-2">
                <Label>{t('website')}</Label>
                <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="corporate@email.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('telephoneNumbers')}</Label>
                <div className="space-y-2">
                  {formData.telephones.map((phone, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input value={phone} onChange={(e) => handlePhoneChange(idx, e.target.value)} placeholder="Enter phone number" />
                      <Button type="button" variant="outline" size="icon" onClick={() => handleRemovePhone(idx)} disabled={formData.telephones.length === 1}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddPhone} className="text-primary">
                    <Plus className="w-4 h-4 mr-1" /> {t('addNumber')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('address')}</Label>
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
              <Lock className="w-4 h-4 text-indigo-500" /> {t('internalSection')}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>{t('generalNotes')}</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={t('generalNotes')} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t('internalComments')}</Label>
                <Textarea value={formData.internalComments} onChange={(e) => setFormData({ ...formData, internalComments: e.target.value })} placeholder={t('internalComments')} rows={2} className="bg-amber-50/30 border-amber-100" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700 shadow-md">{t('createPartner')}</Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
