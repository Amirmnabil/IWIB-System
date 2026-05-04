
'use client';
import React, { useState } from "react";
import { UserCircle, Mail, Phone, Building2, Edit, Trash2, Star } from "lucide-react";
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
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Contact, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState, flexRender } from "@tanstack/react-table";
import { useCollection, useMemoFirebase, useFirestore, collection, addDoc, updateDoc, deleteDoc, doc } from "@/firebase";

const ROLE_TYPES = ["HR", "Finance", "CEO", "Procurement", "Broker Contact", "Claims Manager", "Other"];
const CONTACT_METHODS = ["Email", "Phone", "WhatsApp", "In Person"];

const emptyForm: Omit<Contact, 'id' | 'created_at'> = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  mobile: "",
  job_title: "",
  role_type: "",
  company_id: "",
  company_name: "",
  preferred_contact_method: "Email",
  is_primary: false,
  notes: ""
};

export default function Contacts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const contactsRef = useMemoFirebase(() => collection(firestore!, 'contacts'), [firestore]);
  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);

  const { data: contactsData, isLoading } = useCollection<Contact>(contactsRef);
  const contacts = contactsData || [];
  const { data: companiesData } = useCollection<Company>(companiesRef);
  const companies = companiesData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: contact.mobile || "",
      job_title: contact.job_title || "",
      role_type: contact.role_type || "",
      company_id: contact.company_id || "",
      company_name: contact.company_name || "",
      preferred_contact_method: contact.preferred_contact_method || "Email",
      is_primary: contact.is_primary || false,
      notes: contact.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    try {
        if (selectedContact) {
            const contactRef = doc(firestore, "contacts", selectedContact.id);
            await updateDoc(contactRef, {...formData, created_at: selectedContact.created_at});
            toast({ title: "Contact updated successfully" });
        } else {
            await addDoc(collection(firestore, "contacts"), {...formData, created_at: new Date().toISOString()});
            toast({ title: "Contact created successfully" });
        }
        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedContact && firestore) {
      try {
        const contactRef = doc(firestore, "contacts", selectedContact.id);
        await deleteDoc(contactRef);
        toast({ title: "Contact deleted successfully" });
      } catch (error) {
        console.error("Error deleting document: ", error);
        toast({ title: "An error occurred while deleting.", variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedContact(null);
  }

  const columns = [
    {
      header: "Contact",
      accessorKey: "first_name",
      cell: ({row}: any) => {
        const contact = row.original as Contact;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-600">
                {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{contact.first_name} {contact.last_name}</p>
                {contact.is_primary && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-sm text-slate-500">{contact.job_title}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Company",
      accessorKey: "company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.company_name || '-'}</span>
        </div>
      )
    },
    {
      header: "Role",
      accessorKey: "role_type",
      cell: ({row}: any) => row.original.role_type ? <Badge variant="outline">{row.original.role_type}</Badge> : '-'
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400" />
          <a href={`mailto:${row.original.email}`} className="text-indigo-600 hover:text-indigo-700">
            {row.original.email}
          </a>
        </div>
      )
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-400" />
          <span>{row.original.phone || row.original.mobile || '-'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const contact = row.original as Contact;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(contact); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedContact(contact);
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
      data: contacts,
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
        title="Contacts"
        description="Manage your business contacts"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Contact"
        ActionIcon={UserCircle}
      />

      <Card>
        <CardContent className="p-6">
          {contacts.length === 0 && !isLoading ? (
            <EmptyState
              icon={UserCircle}
              title="No contacts yet"
              description="Start by adding your first contact."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Contact"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search contacts..."
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
        title={selectedContact ? "Edit Contact" : "Add New Contact"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Last name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g., HR Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>Role Type</Label>
              <Select value={formData.role_type} onValueChange={(v) => setFormData({ ...formData, role_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_TYPES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select 
                value={formData.company_id} 
                onValueChange={(v) => {
                  const company = companies.find(c => c.id === v);
                  setFormData({ 
                    ...formData, 
                    company_id: v,
                    company_name: company?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Contact Method</Label>
              <Select value={formData.preferred_contact_method} onValueChange={(v) => setFormData({ ...formData, preferred_contact_method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Switch
              checked={formData.is_primary}
              onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
            />
            <div>
              <Label className="text-amber-700">Primary Contact</Label>
              <p className="text-sm text-amber-600">Mark as the main contact for this company</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {selectedContact ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedContact?.first_name} {selectedContact?.last_name}"? This action cannot be undone.
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
