
'use client';
import React, { useState, useRef, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings as SettingsIcon, User, Bell, Shield, Database, 
  Users, Plus, Edit, Trash2, Download, Upload, FileText, 
  Building2, Users as UsersIcon, FileCheck, Receipt, DollarSign, 
  Loader2, Car, Calculator, Search, Filter, AlertTriangle, CheckCircle2,
  Table as TableIcon, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import FormDialog from "@/components/shared/FormDialog";
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
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc, writeBatch, setDoc, serverTimestamp } from "@/firebase";
import type { User as AppUser, SMEPlan } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useI18n } from "@/components/i18n-context";
import * as XLSX from 'xlsx';
import { SME_PLANS } from "@/lib/plans-data";
import { PLAN_PRICING_STYLE_MAP, getPremium } from "@/lib/pricing-matrix";
import { CAR_BRANDS } from "@/lib/car-data";
import { sampleInsuranceCompanies, sampleTPAs } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";

const emptyUserForm: Omit<AppUser, 'id' | 'created_at'> = {
  name: "",
  email: "",
  role: "User",
  status: "active",
};

const USER_ROLES: AppUser['role'][] = ["Admin", "Broker", "User"];
const USER_STATUSES: AppUser['status'][] = ["active", "inactive"];

const CENSUS_HEADERS = [
  "Insurance Company Name", "Insurance company Code", "insurance line", "Policy Name", "Policy Number", 
  "TPA Name", "Start Date", "Expiry Date", "Member Code", "Staff Code", "Head Family Code", 
  "Member Full Name", "Nationality", "National ID", "Date Of Birth", "Gender", "Relation", 
  "Category", "Branch", "Area", "Department", "Job Title", "Salary", "Premium", 
  "Addition Date", "Deletion Date", "Mobile Number", "Notes"
];

function DatabaseTab() {
  const { t, isRtl } = useI18n();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCollection, setSelectedCollection] = useState('companies');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const COLLECTIONS = [
    { id: 'companies', label: t('companies'), icon: Building2 },
    { id: 'contacts', label: t('contacts'), icon: UsersIcon },
    { id: 'activities', label: t('activities'), icon: FileText },
    { id: 'census', label: t('census'), icon: Users },
    { id: 'policies', label: t('policies'), icon: FileCheck },
    { id: 'claims', label: t('allClaims'), icon: AlertTriangle },
    { id: 'insurance_companies', label: t('insuranceCompanies'), icon: Building2 },
    { id: 'tpas', label: t('tpas'), icon: Shield },
    { id: 'invoices', label: t('invoices'), icon: Receipt },
    { id: 'payments', label: t('payments'), icon: DollarSign },
    { id: 'commissions', label: t('commissions'), icon: DollarSign },
    { id: 'kyc-documents', label: t('kycDocs'), icon: FileCheck },
    { id: 'sme_plans', label: t('insurancePlans'), icon: FileText },
    { id: 'sme_premiums', label: t('planPremiums'), icon: DollarSign },
    { id: 'motor_brands', label: t('motorBrands'), icon: Car },
    { id: 'motor_models', label: t('motorModels'), icon: Car },
    { id: 'motor_plans', label: t('motorPlans'), icon: Calculator },
    { id: 'sme_quotations', label: 'SME Quotations', icon: Calculator },
    { id: 'motor_quotations', label: 'Motor Quotations', icon: Car },
  ];

  const collectionRef = useMemoFirebase(() => collection(firestore!, selectedCollection), [firestore, selectedCollection]);
  const { data: recordsData, isLoading } = useCollection<any>(collectionRef);
  const records = recordsData || [];

  const columns = useMemo(() => {
    if (records.length === 0) {
      return [
        { header: "ID", accessorKey: "id" },
        { header: "Info", accessorKey: "info", cell: () => <span className="text-slate-400 italic">No data yet</span> }
      ];
    }
    
    // Auto-generate columns from data keys
    const firstRecord = records[0];
    const cols: any[] = Object.keys(firstRecord)
      .filter(key => !['id', 'created_at', 'updated_at', 'user_id'].includes(key))
      .slice(0, 5) // Show first 5 columns for clarity
      .map(key => ({
        header: key.replace(/_/g, ' ').toUpperCase(),
        accessorKey: key,
        cell: ({ row }: any) => {
          const val = row.original[key];
          if (typeof val === 'object' && val !== null) return <Badge variant="outline">Object</Badge>;
          return <span className="truncate max-w-[150px] inline-block">{String(val || '-')}</span>;
        }
      }));

    cols.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedRecord(row.original); setDeleteDialogOpen(true); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    });

    return cols;
  }, [records, selectedCollection]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
  });

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setFormData({ ...record });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !selectedRecord?.id) return;
    try {
      const recordRef = doc(firestore, selectedCollection, selectedRecord.id);
      await updateDoc(recordRef, formData);
      toast({ title: "Record updated successfully" });
      setDialogOpen(false);
    } catch (error) {
      toast({ title: "Error updating record", variant: "destructive" });
    }
  };


  const handleDelete = async () => {
    if (selectedRecord && firestore) {
      try {
        await deleteDoc(doc(firestore, selectedCollection, selectedRecord.id));
        toast({ title: "Record removed" });
      } catch (error) {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            {t('databaseManager')}
          </CardTitle>
          <CardDescription>Directly edit and manage any system record.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-[240px] h-11 bg-white">
              <TableIcon className="w-4 h-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="Select Collection" />
            </SelectTrigger>
            <SelectContent>
              {COLLECTIONS.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <c.icon className="w-4 h-4 text-slate-400" />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder={`Search ${selectedCollection}...`}
          onRowClick={handleEdit}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
      </CardContent>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={`Edit Record: ${selectedCollection}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(formData).filter(k => k !== 'id').map(key => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                {typeof formData[key] === 'boolean' ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                    <Switch checked={formData[key]} onCheckedChange={(val) => setFormData({...formData, [key]: val})} />
                    <span className="text-sm">{formData[key] ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : typeof formData[key] === 'object' && formData[key] !== null ? (
                  <Textarea 
                    value={JSON.stringify(formData[key], null, 2)} 
                    onChange={(e) => {
                      try { 
                        const parsed = JSON.parse(e.target.value);
                        setFormData({...formData, [key]: parsed}); 
                      } catch(err) {
                        // Keep current text while user is typing invalid JSON
                      }
                    }} 
                    rows={4} 
                    className="font-mono text-xs bg-slate-50" 
                  />
                ) : (

                  <Input value={formData[key] || ''} onChange={(e) => setFormData({...formData, [key]: e.target.value})} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove this record from the <strong>{selectedCollection}</strong> collection. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function UserManagementTab() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);
  const { data: usersData, isLoading } = useCollection<AppUser>(usersRef);
  const users = usersData || [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<Omit<AppUser, 'id' | 'created_at'>>(emptyUserForm);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const resetForm = () => {
    setFormData(emptyUserForm);
    setSelectedUser(null);
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "User",
      status: user.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    try {
      const userData = { ...formData, created_at: selectedUser?.created_at || new Date().toISOString() };
      if (selectedUser) {
        const userRef = doc(firestore, "users", selectedUser.id);
        await updateDoc(userRef, userData);
        toast({ title: "User updated successfully" });
      } else {
        await addDoc(collection(firestore, "users"), userData);
        toast({ title: "User added successfully" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error submitting user form: ", error);
      toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedUser && firestore) {
      try {
        await deleteDoc(doc(firestore, "users", selectedUser.id));
        toast({ title: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user: ", error);
        toast({ title: "An error occurred while deleting.", variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }: any) => <p className="font-medium">{row.original.name}</p>,
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }: any) => <StatusBadge status={row.original.role} />,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              setSelectedUser(row.original);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Add, edit, or remove users from the system.</CardDescription>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search users..."
          onRowClick={handleEdit}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
      </CardContent>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={selectedUser ? "Edit User" : "Add New User"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as AppUser['role'] })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as AppUser['status'] })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{USER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{selectedUser ? "Update User" : "Create User"}</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedUser?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DataManagementTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const entities = [
    { name: t('companies'), key: 'companies', icon: Building2 },
    { name: t('policies'), key: 'policies', icon: FileCheck },
    { name: t('allClaims'), key: 'claims', icon: FileText },
    { name: t('leads'), key: 'leads', icon: UsersIcon },
    { name: t('census'), key: 'census', icon: UsersIcon },
    { name: t('invoices'), key: 'invoices', icon: Receipt },
    { name: t('insurancePlans'), key: 'sme_plans', icon: FileText },
    { name: t('planPremiums'), key: 'sme_premiums', icon: DollarSign },
    { name: t('motorBrands'), key: 'motor_brands', icon: Car },
    { name: t('motorModels'), key: 'motor_models', icon: Car },
    { name: t('motorPlans'), key: 'motor_plans', icon: Calculator },
  ];

  const handleDownload = async (key: string) => {
    let data: any[] = [];
    let fileName = `${key}_export.xlsx`;

    if (key === 'census') {
      data = [{}];
      fileName = "Census_Data_Export.xlsx";
      const ws = XLSX.utils.json_to_sheet(data, { header: CENSUS_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Census");
      XLSX.writeFile(wb, fileName);
      toast({ title: "Template Generated" });
      return;
    }

    if (key === 'sme_plans') {
      data = SME_PLANS.map(({ expiryDate, ...rest }: any) => rest);
      fileName = "SME_Insurance_Plans.xlsx";
    } else if (key === 'sme_premiums') {
      const allPlanIds = Object.keys(PLAN_PRICING_STYLE_MAP);
      data = allPlanIds.flatMap(planId => {
        const style = PLAN_PRICING_STYLE_MAP[planId];
        const points = [];
        for (let age = 1; age <= 65; age++) {
          points.push({
            planId,
            age,
            emp: getPremium(style, age, 'Employee'),
            spouse: getPremium(style, age, 'Spouse'),
            child: getPremium(style, age, 'Child'),
            expiryDate: "2025-12-31"
          });
        }
        return points;
      });
      fileName = "SME_Plan_Premiums.xlsx";
    } else if (key === 'motor_brands') {
      data = CAR_BRANDS.map(b => ({ id: b.name.toLowerCase().replace(/\s+/g, '_'), name: b.name }));
      fileName = "Motor_Brands.xlsx";
    } else if (key === 'motor_models') {
      data = CAR_BRANDS.flatMap(b => b.models.map(m => ({
        id: `${b.name.toLowerCase().replace(/\s+/g, '_')}_${m.toLowerCase().replace(/\s+/g, '_')}`,
        brandId: b.name.toLowerCase().replace(/\s+/g, '_'),
        name: m
      })));
      fileName = "Motor_Models.xlsx";
    } else if (key === 'motor_plans') {
      data = sampleInsuranceCompanies.map((insurer, idx) => ({
        id: insurer.id,
        insurerId: insurer.id,
        insurerName: insurer.name,
        name: "Comprehensive Plan",
        baseRate: 0.025 + (idx % 5) * 0.005,
        tplLimit: 10000 + (idx % 3) * 5000,
        deductible: idx % 4 === 0 ? "Zero" : "500 EGP",
        agencyRepair: idx % 2 === 0,
        naturalPerils: true,
        roadsideAssistance: true,
        totalLoss: true,
        theft: true,
        expiryDate: "2025-12-31"
      }));
      fileName = "Motor_Insurance_Plans.xlsx";
    } else {
      toast({ title: "Feature not implemented", description: "This export is coming soon." });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, fileName);
    toast({ title: "Export Successful" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !activeKey) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast({ variant: "destructive", title: "Upload Failed", description: "The Excel sheet is empty." });
          setIsProcessing(false);
          return;
        }

        const chunks = [];
        for (let i = 0; i < data.length; i += 400) {
          chunks.push(data.slice(i, i + 400));
        }

        toast({ title: `Uploading ${activeKey.replace('_', ' ')}`, description: `Processing ${data.length} records...` });
        
        for (const chunk of chunks) {
          const batch = writeBatch(firestore);
          chunk.forEach((item) => {
            let itemRef;
            let finalData;

            if (activeKey === 'census') {
              itemRef = doc(collection(firestore, "census"));
              finalData = {
                insurance_company_name: item["Insurance Company Name"] || "",
                insurance_company_code: item["Insurance company Code"] || "",
                insurance_line: item["insurance line"] || "Medical",
                policy_name: item["Policy Name"] || "",
                policy_number: item["Policy Number"] || "",
                tpa_name: item["TPA Name"] || "",
                start_date: item["Start Date"] || "",
                expiry_date: item["Expiry Date"] || "",
                member_code: item["Member Code"] || "",
                staff_code: item["Staff Code"] || "",
                head_family_code: item["Head Family Code"] || "",
                member_full_name: item["Member Full Name"] || "",
                nationality: item["Nationality"] || "",
                national_id: item["National ID"] || "",
                date_of_birth: item["Date Of Birth"] || "",
                gender: item["Gender"] || "Male",
                relation: item["Relation"] || "Employee",
                category: item["Category"] || "",
                branch: item["Branch"] || "",
                area: item["Area"] || "",
                department: item["Department"] || "",
                job_title: item["Job Title"] || "",
                salary: Number(item["Salary"]) || 0,
                premium: Number(item["Premium"]) || 0,
                addition_date: item["Addition Date"] || "",
                deletion_date: item["Deletion Date"] || "",
                mobile_number: item["Mobile Number"] || "",
                notes: item["Notes"] || "",
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              };
            } else {
              itemRef = doc(firestore, activeKey, String(item.id || Math.random().toString(36).substr(2, 9)));
              finalData = { ...item, updated_at: new Date().toISOString() };
            }
            batch.set(itemRef, finalData);
          });
          await batch.commit();
        }
        
        toast({ title: "Import Successful", description: `${data.length} records synchronized.` });

      } catch (err) {
        console.error("Import error:", err);
        toast({ variant: "destructive", title: "Import Error", description: "Please ensure the file follows the template format." });
      } finally {
        setIsProcessing(false);
        setActiveKey(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSeedMasterData = async () => {
    if (!firestore) return;
    setIsProcessing(true);
    toast({ title: t('seedingData'), description: t('initializingReferenceLists') });

    const masterData: Record<string, any[]> = {
      providers: [
        { name: 'City Central Hospital', type: 'hospital', city: 'Cairo', status: 'active' },
        { name: 'Global Health Clinic', type: 'clinic', city: 'Giza', status: 'active' }
      ],
      insurance_companies: sampleInsuranceCompanies.map(i => ({
        companyName: i.companyName,
        companyCode: i.companyCode,
        companyType: i.companyType,
        status: 'Active'
      })),
      tpas: sampleTPAs.map(t => ({
        name: t.name,
        code: t.code,
        status: 'active'
      })),
      // Add reference data for dropdowns
      audit_logs: [] // Empty init
    };

    try {
      for (const [table, items] of Object.entries(masterData)) {
        if (items.length === 0) continue;
        const { error } = await supabase.from(table).upsert(
          items.map(item => ({ ...item, created_at: new Date().toISOString() }))
        );
        if (error) console.error(`Error seeding ${table}:`, error.message);
      }

      toast({ title: t('masterDataSeeded') });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: t('seedingFailed') });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-amber-50/50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Initialize System Data
              </CardTitle>
              <CardDescription>Populate all master reference lists and entities from pre-defined standards.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-bold"
              onClick={handleSeedMasterData}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Seed All Master Data
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dataManagement')}</CardTitle>
          <CardDescription>{t('manageYourData')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entities.map((entity) => (
              <div key={entity.key} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <entity.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-slate-900">{entity.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2"
                    disabled={isProcessing}
                    onClick={() => {
                      setActiveKey(entity.key);
                      fileInputRef.current?.click();
                    }}
                  >
                    {isProcessing && activeKey === entity.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span className="hidden sm:inline">{t('upload')}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2"
                    onClick={() => handleDownload(entity.key)}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('download')}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<{ full_name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        const u = session.user;
        setCurrentUser({
          full_name: u.user_metadata?.full_name || u.email || 'User',
          email: u.email || '',
          role: u.user_metadata?.role || 'User',
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        const u = session.user;
        setCurrentUser({
          full_name: u.user_metadata?.full_name || u.email || 'User',
          email: u.email || '',
          role: u.user_metadata?.role || 'User',
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = currentUser?.role === 'Admin';

  const handleSaveProfile = async () => {
    toast({ title: "Profile settings saved" });
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings')}
        description="Manage your account and application settings"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border flex-wrap h-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            {t('profile')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="database" className="gap-2">
              <Database className="w-4 h-4" />
              {t('database')}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="data" className="gap-2">
              <Database className="w-4 h-4" />
              {t('dataManagement')}
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{currentUser?.full_name || 'User'}</h3>
                  <p className="text-sm text-slate-500">{currentUser?.email}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize">Role: {currentUser?.role || 'User'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={currentUser?.full_name || ''} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={currentUser?.email || ''} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={currentUser?.role || ''} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="Enter phone number" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="database">
            <DatabaseTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="data">
            <DataManagementTab />
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-slate-500">Receive notifications via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Renewal Reminders</p>
                    <p className="text-sm text-slate-500">Get alerts before policies expire</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Claim Updates</p>
                    <p className="text-sm text-slate-500">Notifications on claim status changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Commission Alerts</p>
                    <p className="text-sm text-slate-500">Get notified about commission payments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Task Reminders</p>
                    <p className="text-sm text-slate-500">Reminders for upcoming tasks and activities</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast({ title: "Notification settings saved" })} className="bg-indigo-600 hover:bg-indigo-700">
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-2">Password</h3>
                <p className="text-sm text-slate-500 mb-4">Change your account password</p>
                <Button variant="outline">Change Password</Button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mb-4">Add an extra layer of security to your account</p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Application-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">General Settings</h3>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Input value="MMM d, yyyy" readOnly className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value="EGP (EGP)" readOnly className="bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Business Rules</h3>
                  <div className="space-y-2">
                    <Label>Default Commission Rate (%)</Label>
                    <Input placeholder="7.5" type="number" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Renewal Reminder (days before)</Label>
                    <Input placeholder="90" type="number" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: "System settings saved" })} className="bg-indigo-600 hover:bg-indigo-700">
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
