'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState } from "react";
import { format } from "date-fns";
import { Hospital, MapPin, Phone, Mail, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { syncContact } from "@/lib/contact-sync";
import type { Provider, TPA } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

const PROVIDER_TYPES = ["hospital", "clinic", "lab", "pharmacy", "dental", "optical"];
const STATUSES = ["active", "inactive", "suspended"];

const emptyForm = {
  name: "",
  type: "hospital",
  license_number: "",
  address: "",
  city: "",
  country: "",
  is_in_network: true,
  tpa_names: [],
  capabilities: [],
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  status: "active",
  notes: ""
};

export default function Providers() {
  const { t, isRtl } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const { toast } = useToast();
  const { data: providersData, isLoading } = useSupabaseCollection<Provider>('providers');
  const providers = providersData || [];
  const { data: tpasData } = useSupabaseCollection<TPA>('tpas');
  const tpas = tpasData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedProvider(null);
  };

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setFormData({
      name: provider.name || "",
      type: provider.type || "hospital",
      license_number: provider.license_number || "",
      address: provider.address || "",
      city: provider.city || "",
      country: provider.country || "",
      is_in_network: provider.is_in_network !== false,
      tpa_names: provider.tpa_names || [],
      capabilities: provider.capabilities || [],
      contact_name: provider.contact_name || "",
      contact_phone: provider.contact_phone || "",
      contact_email: provider.contact_email || "",
      status: provider.status || "active",
      notes: provider.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedProvider) {
        await supabase.from("providers").update({ ...formData, updated_at: new Date().toISOString() }).eq("id", selectedProvider.id);
        
        if (formData.contact_name && formData.contact_email) {
          await syncContact(null, {
            name: formData.contact_name,
            email: formData.contact_email,
            phone: formData.contact_phone,
            company_name: formData.name,
            role_type: "Provider Contact",
            is_primary: true
          });
        }
        
        toast({ title: t('providerUpdated') || "Provider updated successfully" });
      } else {
        const { data: newProvider, error } = await supabase.from("providers").insert(sanitizeUUIDs(
          { ...formData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        )).select('id').single();
        if (error) throw error;
        
        if (formData.contact_name && formData.contact_email) {
          await syncContact(null, {
            name: formData.contact_name,
            email: formData.contact_email,
            phone: formData.contact_phone,
            company_name: formData.name,
            role_type: "Provider Contact",
            is_primary: true
          });
        }
        
        toast({ title: t('providerCreated') || "Provider created successfully" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error submitting provider:", error);
      toast({ variant: 'destructive', title: t('persistenceError') });
    }
  };

  const handleDelete = async () => {
    if (selectedProvider) {
      await supabase.from("providers").delete().eq("id", selectedProvider.id);
      toast({ title: t('providerDeleted') || "Provider deleted successfully" });
    }
    setDeleteDialogOpen(false);
    setSelectedProvider(null);
  }

  const columns = [
    {
      header: t('providerNetwork') || "Provider",
      accessorKey: "name",
      cell: ({row}: any) => {
        const provider = row.original as Provider;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              provider.type === 'hospital' ? 'bg-red-100' :
              provider.type === 'clinic' ? 'bg-emerald-100' :
              provider.type === 'lab' ? 'bg-amber-100' : 'bg-violet-100'
            }`}>
              <Hospital className={`w-5 h-5 ${
                provider.type === 'hospital' ? 'text-red-600' :
                provider.type === 'clinic' ? 'text-emerald-600' :
                provider.type === 'lab' ? 'text-amber-600' : 'text-violet-600'
              }`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{provider.name}</p>
              <p className="text-sm text-slate-500 capitalize">{provider.type}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('types') || "Type",
      accessorKey: "type",
      cell: ({row}: any) => <StatusBadge status={row.original.type} />
    },
    {
      header: t('location') || "Location",
      accessorKey: "city",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{[row.original.city, row.original.country].filter(Boolean).join(', ') || '-'}</span>
        </div>
      )
    },
    {
      header: t('inNetwork') || "In Network",
      accessorKey: "is_in_network",
      cell: ({row}: any) => row.original.is_in_network ? (
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )
    },
    {
      header: t('status'),
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: t('phone'),
      accessorKey: "contact_phone",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-400" />
          <span>{row.original.contact_phone || '-'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}: any) => {
        const provider = row.original as Provider;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(provider); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedProvider(provider);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )
      }
    }
  ];

  const table = useReactTable({
      data: providers,
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
        title={t('providerNetwork') || "Provider Network"}
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('addProvider')}
        ActionIcon={Hospital}
      />

      <Card>
        <CardContent className="p-6">
          {providers.length === 0 && !isLoading ? (
            <EmptyState
              icon={Hospital}
              title={t('noProvidersYet') || "No providers yet"}
              
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel={t('addProvider')}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPlaceholder') || "Search..."}
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedProvider ? t('edit') || "Edit Provider" : t('addProvider')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('contacts')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('types')} *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectType') || "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('licenseNumber') || "License Number"}</Label>
              <Input
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus') || "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('city')}</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('country')}</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('address')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <Switch
              checked={formData.is_in_network}
              onCheckedChange={(checked) => setFormData({ ...formData, is_in_network: checked })}
            />
            <div>
              <Label className="text-emerald-700">{t('inNetwork') || "In Network"}</Label>
              <p className="text-sm text-emerald-600">{t('inNetwork') || "Provider is part of the approved network"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-slate-900 mb-4">{t('contactInformation') || "Contact Information"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('contactName') || "Contact Name"}</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('associatedTpas') || "Associated TPAs"}</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {tpas.map((tpa: TPA) => (
                <label key={tpa.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tpa_names.includes(tpa.name)}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setFormData((prev: any) => ({
                        ...prev,
                        tpa_names: checked 
                          ? [...prev.tpa_names, tpa.name] 
                          : prev.tpa_names.filter((t: string) => t !== tpa.name)
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{tpa.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('internalNotes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {selectedProvider ? t('save') : t('create')}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProvider') || "Delete Provider"}</AlertDialogTitle>
            <AlertDialogDescription>
              {(t('confirmDeleteProvider') || 'Are you sure you want to delete "{name}"?').replace('{name}', selectedProvider?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
