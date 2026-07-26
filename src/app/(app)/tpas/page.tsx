
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useEffect, useRef } from "react";
import { Heart, Globe, Mail, Clock, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/lib/hooks/use-toast";
import { sampleTPAs } from "@/lib/data";
import type { TPA, InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { syncContact } from "@/lib/contact-sync";

const emptyForm: Omit<TPA, 'id' | 'created_at'> = {
  name: "",
  name_ar: "",
  code: "",
  primary_contact_title: "",
  primary_contact_name: "",
  primary_contact_email: "",
  primary_contact_phone: "",
  primary_contact_mobile: "",
  additional_contacts: [
    { title: "", name: "", mobile: "", email: "" },
    { title: "", name: "", mobile: "", email: "" }
  ],
  portal_url: "",
  sla_approval_hours: 0,
  sla_response_hours: 0,
  network_strength_score: 0,
  associated_insurers: [],
  status: "active",
  address: "",
  notes: ""
};

export default function TPAs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTPA, setSelectedTPA] = useState<TPA | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const { toast } = useToast();
  const { data: tpasData, isLoading } = useSupabaseCollection<TPA>('tpas');
  const { data: insurersData } = useSupabaseCollection<InsuranceCompany>('insurance_companies');
  
  const tpas = tpasData || [];
  const insurers = insurersData || [];
  


  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')


  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedTPA(null);
  };

  const handleEdit = (tpa: TPA) => {
    setSelectedTPA(tpa);
    setFormData({
      name: tpa.name || "",
      name_ar: tpa.name_ar || "",
      code: tpa.code || "",
      primary_contact_title: tpa.primary_contact_title || "",
      primary_contact_name: tpa.primary_contact_name || "",
      primary_contact_email: tpa.primary_contact_email || "",
      primary_contact_phone: tpa.primary_contact_phone || "",
      primary_contact_mobile: tpa.primary_contact_mobile || "",
      additional_contacts: tpa.additional_contacts?.length === 2 ? tpa.additional_contacts : [
        { title: "", name: "", mobile: "", email: "" },
        { title: "", name: "", mobile: "", email: "" }
      ],
      portal_url: tpa.portal_url || "",
      sla_approval_hours: (tpa.sla_approval_hours || "").toString(),
      sla_response_hours: (tpa.sla_response_hours || "").toString(),
      network_strength_score: (tpa.network_strength_score || "").toString(),
      associated_insurers: tpa.associated_insurers || [],
      status: tpa.status || "active",
      address: tpa.address || "",
      notes: tpa.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const tpaData = { ...formData, created_at: selectedTPA?.created_at || new Date().toISOString() };
        if (selectedTPA) {
            await supabase.from("tpas").update(tpaData).eq("id", selectedTPA.id);
            
            if (formData.primary_contact_name && formData.primary_contact_email) {
              await syncContact(null, {
                name: formData.primary_contact_name,
                email: formData.primary_contact_email,
                phone: formData.primary_contact_phone,
                company_name: formData.name,
                role_type: "TPA Contact",
                is_primary: true
              });
            }
            
            toast({ title: "TPA updated successfully" });
        } else {
            const { data: newTPA, error } = await supabase.from("tpas").insert(sanitizeUUIDs(tpaData)).select('id').single();
            if (error) throw error;
            
            if (formData.primary_contact_name && formData.primary_contact_email) {
              await syncContact(null, {
                name: formData.primary_contact_name,
                email: formData.primary_contact_email,
                phone: formData.primary_contact_phone,
                company_name: formData.name,
                role_type: "TPA Contact",
                is_primary: true
              });
            }
            
            toast({ title: "TPA created successfully" });
        }
        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedTPA) {
        try {
            await supabase.from("tpas").delete().eq("id", selectedTPA.id);
            toast({ title: "TPA deleted successfully" });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedTPA(null);
  }

  const columns = [
    {
      header: "TPA",
      accessorKey: "name",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">{tpa.name}</p>
              <p className="text-sm text-muted-foreground">{tpa.code}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Network Score",
      accessorKey: "network_strength_score",
      cell: ({row}: any) => (
        <div className="w-24">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{row.original.network_strength_score || 0}/10</span>
          </div>
          <Progress value={(row.original.network_strength_score || 0) * 10} className="h-2" />
        </div>
      )
    },
    {
      header: "SLA",
      accessorKey: "sla_approval_hours",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{row.original.sla_approval_hours || '-'}h approval</span>
        </div>
      )
    },
    {
      header: "Portal",
      accessorKey: "portal_url",
      cell: ({row}: any) => row.original.portal_url ? (
        <a 
          href={row.original.portal_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:text-indigo-700"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe className="w-4 h-4" />
          Portal
        </a>
      ) : '-'
    },
    {
      header: "Contact",
      accessorKey: "primary_contact_email",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="space-y-1">
            {tpa.primary_contact_name && (
              <p className="text-standard">{tpa.primary_contact_name}</p>
            )}
            {tpa.primary_contact_email && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                {tpa.primary_contact_email}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(tpa); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedTPA(tpa);
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
      data: tpas,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      autoResetPageIndex: false,
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
        title="TPA Companies"
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add TPA"
        ActionIcon={Heart}
      />

      <Card>
        <CardContent className="p-6">
          {tpas.length === 0 && !isLoading ? (
            <EmptyState
              icon={Heart}
              title="No TPAs yet"
              
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add TPA"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search TPAs..."
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
        title={selectedTPA ? "Edit TPA" : "Add TPA"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TPA Name (English) *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="TPA company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>TPA Name (Arabic)</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="اسم الشركة"
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code || "Auto-generated"}
                disabled
                placeholder="Generated automatically"
              />
            </div>
            <div className="space-y-2">
              <Label>Portal URL</Label>
              <Input
                value={formData.portal_url}
                onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
                placeholder="https://portal.tpa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SLA - Approval Time (hours)</Label>
              <Input
                type="number"
                value={formData.sla_approval_hours}
                onChange={(e) => setFormData({ ...formData, sla_approval_hours: e.target.value })}
                placeholder="e.g., 24"
              />
            </div>
            <div className="space-y-2">
              <Label>SLA - Response Time (hours)</Label>
              <Input
                type="number"
                value={formData.sla_response_hours}
                onChange={(e) => setFormData({ ...formData, sla_response_hours: e.target.value })}
                placeholder="e.g., 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Network Strength Score (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.network_strength_score}
                onChange={(e) => setFormData({ ...formData, network_strength_score: e.target.value })}
                placeholder="1-10"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-foreground mb-4">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.primary_contact_title}
                  onChange={(e) => setFormData({ ...formData, primary_contact_title: e.target.value })}
                  placeholder="Mr. / Ms. / Dr."
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={formData.primary_contact_mobile}
                  onChange={(e) => setFormData({ ...formData, primary_contact_mobile: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                  placeholder="email@tpa.com"
                />
              </div>
            </div>
          </div>

          {[0, 1].map((index) => (
            <div key={index} className="border-t pt-4">
              <h3 className="font-medium text-muted-foreground mb-4 text-sm">Additional Contact {index + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.additional_contacts?.[index]?.title || ""}
                    onChange={(e) => {
                      const newContacts = [...(formData.additional_contacts || [{}, {}])];
                      newContacts[index] = { ...newContacts[index], title: e.target.value };
                      setFormData({ ...formData, additional_contacts: newContacts });
                    }}
                    placeholder="Mr. / Ms. / Dr."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.additional_contacts?.[index]?.name || ""}
                    onChange={(e) => {
                      const newContacts = [...(formData.additional_contacts || [{}, {}])];
                      newContacts[index] = { ...newContacts[index], name: e.target.value };
                      setFormData({ ...formData, additional_contacts: newContacts });
                    }}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={formData.additional_contacts?.[index]?.mobile || ""}
                    onChange={(e) => {
                      const newContacts = [...(formData.additional_contacts || [{}, {}])];
                      newContacts[index] = { ...newContacts[index], mobile: e.target.value };
                      setFormData({ ...formData, additional_contacts: newContacts });
                    }}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.additional_contacts?.[index]?.email || ""}
                    onChange={(e) => {
                      const newContacts = [...(formData.additional_contacts || [{}, {}])];
                      newContacts[index] = { ...newContacts[index], email: e.target.value };
                      setFormData({ ...formData, additional_contacts: newContacts });
                    }}
                    placeholder="email@tpa.com"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label>Associated Insurers</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {insurers.map(insurer => (
                <label key={insurer.id} className="flex items-center gap-2 p-2 hover:bg-background rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.associated_insurers.includes(insurer.companyName)}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setFormData((prev: any) => ({
                        ...prev,
                        associated_insurers: checked 
                          ? [...prev.associated_insurers, insurer.companyName] 
                          : prev.associated_insurers.filter((i: string) => i !== insurer.companyName)
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{insurer.companyName}</span>
                </label>
              ))}
              {insurers.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No insurers available</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-indigo-700"
            >
              {selectedTPA ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TPA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTPA?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
