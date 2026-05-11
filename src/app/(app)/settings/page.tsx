
'use client';
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";

import { supabase } from "@/lib/supabase";
import {
  Settings as SettingsIcon, User, Bell, Shield, Database,
  Users, Plus, Edit, Trash2, Download, Upload, FileText,
  Building2, FileCheck, Receipt, DollarSign,
  Loader2, Car, Calculator, Search, Filter, AlertTriangle, CheckCircle2,
  Table as TableIcon, RefreshCw, Lock, Check, X, ShieldCheck
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
  is_admin: false,
  department: "",
  status: "active",
};

const DEPARTMENTS = ["Sales", "Underwriting", "Policy Issuance", "Account Manager", "Finance", "Admin", "Management", "Operations"];
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
    { id: 'contacts', label: t('contacts'), icon: Users },
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
                    <Switch checked={formData[key]} onCheckedChange={(val) => setFormData({ ...formData, [key]: val })} />
                    <span className="text-sm">{formData[key] ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : typeof formData[key] === 'object' && formData[key] !== null ? (
                  <Textarea
                    value={JSON.stringify(formData[key], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({ ...formData, [key]: parsed });
                      } catch (err) {
                        // Keep current text while user is typing invalid JSON
                      }
                    }}
                    rows={4}
                    className="font-mono text-xs bg-slate-50"
                  />
                ) : (

                  <Input value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<Omit<AppUser, 'id' | 'created_at'>>(emptyUserForm);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name').order('name'),
    ]);
    if (!usersRes.error && usersRes.data) setUsers(usersRes.data as AppUser[]);
    if (!rolesRes.error && rolesRes.data) setAvailableRoles(rolesRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = useCallback(() => {
    setFormData(emptyUserForm);
    setSelectedUser(null);
  }, []);

  const handleEdit = useCallback((user: AppUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "User",
      is_admin: user.is_admin || false,
      department: user.department || "",
      status: user.status || "active",
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        const { error } = await supabase.from('users').update(formData).eq('id', selectedUser.id);
        if (error) throw error;
        toast({ title: "User updated successfully" });
      } else {
        const { error } = await supabase.from('users').insert([{ ...formData, created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast({ title: "User added successfully" });
      }
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
        if (error) throw error;
        toast({ title: "User deleted successfully" });
        fetchUsers();
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const columns = useMemo(() => [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <p className="font-medium">{row.original.name}</p>
          {row.original.is_admin && <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200">Admin</Badge>}
        </div>
      ),
    },
    { header: "Email", accessorKey: "email" },
    { header: "Department", accessorKey: "department", cell: ({ row }: any) => <Badge variant="outline">{row.original.department || 'N/A'}</Badge> },
    { header: "Role", accessorKey: "role", cell: ({ row }: any) => <StatusBadge status={row.original.role} /> },
    { header: "Status", accessorKey: "status", cell: ({ row }: any) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedUser(row.original); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ),
    },
  ], [handleEdit]);

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
          <CardDescription>Manage your team, departments, and administrative access.</CardDescription>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search users by name, email or department..."
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
              <Label>Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0
                    ? availableRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)
                    : ['Admin', 'Sales', 'Underwriting', 'Finance'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as AppUser['status'] })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{USER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-slate-900">Super Admin Access</Label>
                <p className="text-sm text-slate-500">Admins bypass all permission checks and have full system access.</p>
              </div>
              <Switch checked={formData.is_admin} onCheckedChange={(val) => setFormData({ ...formData, is_admin: val })} />
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
            <AlertDialogDescription>Are you sure you want to delete "{selectedUser?.name}"? This will remove their system access.</AlertDialogDescription>
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

function RoleManagementTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, modulesRes, permissionsRes, rpRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('system_modules').select('*').order('name'),
        supabase.from('permissions').select('*').order('code'),
        supabase.from('role_permissions').select('*')
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (modulesRes.data) setModules(modulesRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data);
      if (rpRes.data) setRolePermissions(rpRes.data);
    } catch (err: any) {
      toast({ title: "Error fetching data", description: err.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const { data, error } = await supabase.from('roles').insert([{ name: newRoleName, is_system: false }]).select().single();
      if (error) throw error;
      setRoles(prev => [...prev, data]);
      setNewRoleName("");
      setDialogOpen(false);
      toast({ title: "Role created successfully" });
    } catch (error: any) {
      toast({ title: "Error creating role", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleToDelete.id);
      if (error) throw error;
      setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
      if (selectedRole?.id === roleToDelete.id) setSelectedRole(null);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      toast({ title: "Role deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleTogglePermission = async (roleId: string, moduleId: string, permissionId: string) => {
    const existing = rolePermissions.find(rp => rp.role_id === roleId && rp.module_id === moduleId && rp.permission_id === permissionId);

    if (existing) {
      const { error } = await supabase.from('role_permissions').delete().eq('id', existing.id);
      if (!error) setRolePermissions(prev => prev.filter(p => p.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('role_permissions').insert([{ role_id: roleId, module_id: moduleId, permission_id: permissionId }]).select().single();
      if (!error && data) setRolePermissions(prev => [...prev, data]);
    }
  };

  const hasPermission = (roleId: string, moduleId: string, permissionId: string) => {
    return rolePermissions.some(rp => rp.role_id === roleId && rp.module_id === moduleId && rp.permission_id === permissionId);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Roles</CardTitle>
            <CardDescription>Select a role to manage.</CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {roles.map(role => (
              <div key={role.id} className="group flex items-center gap-1 pr-2">
                <Button
                  variant={selectedRole?.id === role.id ? "default" : "ghost"}
                  className={`flex-1 justify-start gap-2 h-10 ${selectedRole?.id === role.id ? 'bg-indigo-600' : ''}`}
                  onClick={() => setSelectedRole(role)}
                >
                  {role.is_system ? <ShieldCheck className="w-4 h-4 text-indigo-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <span className="truncate">{role.name}</span>
                </Button>
                {!role.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { setRoleToDelete(role); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-[calc(100%-8px)] mx-1 mt-4 border-dashed border-slate-300 text-slate-600" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedRole ? `Permission Matrix: ${selectedRole.name}` : "Select a Role"}</CardTitle>
                <CardDescription>Grant or revoke actions per system module.</CardDescription>
              </div>
              {selectedRole && selectedRole.is_system && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">System Immutable</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50/50">
                <Shield className="w-12 h-12 mb-2 opacity-20" />
                <p>Select a role from the sidebar to view the matrix</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="p-4 text-left border-b border-slate-200 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 w-48 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Module</th>
                      {permissions.map(p => (
                        <th key={p.id} className="p-4 text-center border-b border-slate-200 font-semibold text-slate-700 text-sm capitalize">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(mod => (
                      <tr key={mod.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-4 border-b border-slate-100 font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-indigo-50/30 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">{mod.name}</td>
                        {permissions.map(perm => {
                          const checked = hasPermission(selectedRole.id, mod.id, perm.id);
                          const isDisabled = selectedRole.name === 'Admin';
                          return (
                            <td key={perm.id} className="p-4 border-b border-slate-100 text-center">
                              <button
                                disabled={isDisabled}
                                onClick={() => handleTogglePermission(selectedRole.id, mod.id, perm.id)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${checked
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 scale-105'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-400'
                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                              >
                                {checked ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-4 h-4" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Create Custom Role">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input
              placeholder="e.g. Senior Underwriter"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Create Role</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"?
              Users currently assigned to this role will lose its associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700">Delete Role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
    { name: t('leads'), key: 'leads', icon: Users },
    { name: t('census'), key: 'census', icon: Users },
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
  const [currentUser, setCurrentUser] = useState<{
    full_name: string;
    email: string;
    role: string;
    is_admin?: boolean;
    department?: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async (session: any) => {
      if (session) {
        const u = session.user;

        // Fetch extended profile info from users table
        const { data: dbUser } = await supabase
          .from('users')
          .select('is_admin, role, department')
          .eq('id', u.id)
          .single();

        setCurrentUser({
          full_name: u.user_metadata?.full_name || u.email || 'User',
          email: u.email || '',
          role: dbUser?.role || u.user_metadata?.role || 'User',
          is_admin: dbUser?.is_admin || false,
          department: dbUser?.department || ""
        });
      }
    };

    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => fetchProfile(data?.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      fetchProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin =
    currentUser?.is_admin === true ||
    currentUser?.role?.toLowerCase() === 'admin' ||
    currentUser?.email === 'amir.nabil@iwib-eg.com';

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
            <TabsTrigger value="roles" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Roles & Permissions
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
              <RefreshCw className="w-4 h-4" />
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
            <SettingsIcon className="w-4 h-4" />
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
          <TabsContent value="roles">
            <RoleManagementTab />
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
