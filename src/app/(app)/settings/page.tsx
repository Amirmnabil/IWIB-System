
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";

import { supabase } from "@/lib/supabase";
import {
  Settings as SettingsIcon, User, Bell, Shield, Database,
  Users, Plus, Edit, Trash2, Download, Upload, FileText,
  Building2, FileCheck, Receipt, DollarSign,
  Loader2, Car, Calculator, Search, Filter, AlertTriangle, CheckCircle2,
  Table as TableIcon, RefreshCw, Lock, Check, X, ShieldCheck,
  Eye, EyeOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
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
import { useToast } from "@/lib/hooks/use-toast";
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
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { User as AppUser, SMEPlan } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useI18n } from "@/components/i18n-context";
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
  level: "",
  status: "active",
};

const DEPARTMENTS = ["Sales", "Underwriting", "Policy Issuance", "Account Manager", "Finance", "Admin", "Management", "Operations"];
const USER_STATUSES: AppUser['status'][] = ["active", "inactive"];

const CENSUS_HEADERS = [
  "Insurance Company Name", "Insurance company Code", "insurance line", "Policy Name", "Policy Number",
  "TPA Name", "Start Date", "Expiry Date", "Member Ins Code", "Staff Code", "Member TPA Code", "Head Family Code",
  "Member Full Name", "Nationality", "National ID", "Date Of Birth", "Gender", "Relation",
  "Category", "Branch", "Area", "Department", "Job Title", "Salary", "Premium",
  "Addition Date", "Deletion Date", "Mobile Number", "Notes"
];

function UserManagementTab() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [availableRoleLevels, setAvailableRoleLevels] = useState<{ id: string; role_id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<Omit<AppUser, 'id' | 'created_at'> & { password?: string }>(emptyUserForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const [usersRes, rolesRes, levelsRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name').order('name'),
      supabase.from('role_levels').select('id, role_id, name').eq('is_active', true).order('name')
    ]);
    if (!usersRes.error && usersRes.data) setUsers(usersRes.data as AppUser[]);
    if (!rolesRes.error && rolesRes.data) setAvailableRoles(rolesRes.data);
    if (!levelsRes.error && levelsRes.data) setAvailableRoleLevels(levelsRes.data);
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
      level: user.level || "",
      status: user.status || "active",
      password: "",
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedUser) {
        // Update existing user via Admin API (updates Auth user + DB entry)
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            id: selectedUser.id,
            ...formData
          }),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to update user');
          toast({ title: t('userUpdated') || "User updated successfully" });
        } else {
          throw new Error(`Server returned an unexpected response (${response.status}).`);
        }
      } else {
        // Create new user via Admin API (creates Auth user + DB entry)
        if (!formData.password) {
          throw new Error("Password is required for new users");
        }

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(formData),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to create user');
          toast({ title: t('userAdded') || "User added successfully" });
        } else {
          // Handle HTML error pages (404, 500, etc.)
          throw new Error(`Server returned an unexpected response (${response.status}). Please ensure the API route exists and environment variables are configured.`);
        }
      }
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
        if (error) throw error;
        toast({ title: t('userDeleted') || "User deleted successfully" });
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
      header: t('name'),
      accessorKey: "name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <p className="font-medium">{row.original.name}</p>
          {row.original.is_admin && <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200">{t('adminRole')}</Badge>}
        </div>
      ),
    },
    { header: t('email'), accessorKey: "email" },
    { header: t('department'), accessorKey: "department", cell: ({ row }: any) => <Badge variant="outline">{row.original.department || 'N/A'}</Badge> },
    { header: t('level') || 'Level', accessorKey: "level", cell: ({ row }: any) => <Badge variant="outline" className={row.original.level ? "bg-primary/10 border-indigo-100 text-indigo-700" : ""}>{row.original.level || 'N/A'}</Badge> },
    { header: t('role'), accessorKey: "role", cell: ({ row }: any) => <StatusBadge status={row.original.role} /> },
    { header: t('status'), accessorKey: "status", cell: ({ row }: any) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: t('actions'),
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-red-700" onClick={() => { setSelectedUser(row.original); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ),
    },
  ], [handleEdit, t]);

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
          <CardTitle>{t('userManagement')}</CardTitle>

        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('add')}
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder={`${t('search')}...`}
          onRowClick={handleEdit}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
      </CardContent>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={selectedUser ? t('edit') : t('add')}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('name')} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('email')} *</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('department')}</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('level') || 'Level'}</Label>
              <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Base Role (No Level)</SelectItem>
                  {Array.from(new Set(availableRoleLevels
                    .filter(l => !formData.role || availableRoles.find(r => r.name === formData.role)?.id === l.role_id)
                    .map(l => l.name)
                  )).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0
                    ? availableRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)
                    : [t('adminRole'), t('salesRole'), t('underwritingRole'), t('financeRole')].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as AppUser['status'] })}>
                <SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger>
                <SelectContent>{USER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('password')} {selectedUser ? `(${t('optional') || 'Optional'})` : '*'}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!selectedUser}
                  placeholder={selectedUser ? (t('leaveBlankKeep') || "Leave blank to keep current") : "••••••••"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="col-span-2 p-4 bg-background rounded-lg flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-foreground">{t('superAdminAccess')}</Label>
                <p className="text-sm text-muted-foreground">{t('superAdminAccessDesc')}</p>
              </div>
              <Switch checked={formData.is_admin} onCheckedChange={(val) => setFormData({ ...formData, is_admin: val })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedUser ? t('save') : t('create')}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userDeleted')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('deletePermanently')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function RoleManagementTab() {
  const { t } = useI18n();
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
  
  const [addLevelDialogOpen, setAddLevelDialogOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  const [systemPages, setSystemPages] = useState<any[]>([]);
  const [rolePagePermissions, setRolePagePermissions] = useState<any[]>([]);
  const [roleLevels, setRoleLevels] = useState<any[]>([]);
  const [roleLevelPagePermissions, setRoleLevelPagePermissions] = useState<any[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  
  const [layoutView, setLayoutView] = useState<'matrix' | 'tree' | 'card'>('matrix');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, modulesRes, permissionsRes, pagesRes, rppRes, rlRes, rlppRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('system_modules').select('*').order('name'),
        supabase.from('permissions').select('*').order('code'),
        supabase.from('system_pages').select('*').order('name'),
        supabase.from('role_page_permissions').select('*'),
        supabase.from('role_levels').select('*').order('name'),
        supabase.from('role_level_page_permissions').select('*')
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (modulesRes.data) setModules(modulesRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data);
      if (pagesRes.data) setSystemPages(pagesRes.data);
      if (rppRes.data) setRolePagePermissions(rppRes.data);
      if (rlRes.data) setRoleLevels(rlRes.data);
      if (rlppRes.data) setRoleLevelPagePermissions(rlppRes.data);
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
      const { data, error } = await supabase.from('roles').insert(sanitizeUUIDs([{ name: newRoleName, is_system: false }])).select().single();
      if (error) throw error;
      setRoles(prev => [...prev, data]);
      setNewRoleName("");
      setDialogOpen(false);
      toast({ title: t('roleCreated') || "Role created successfully" });
    } catch (error: any) {
      toast({ title: "Error creating role", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateRoleLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim() || !selectedRole) return;
    try {
      const { data, error } = await supabase.from('role_levels').insert(sanitizeUUIDs([{ 
        role_id: selectedRole.id, 
        name: newLevelName.trim(),
        is_active: true
      }])).select().single();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error(`The level "${newLevelName.trim()}" already exists for this role.`);
        }
        throw error;
      }
      
      setRoleLevels(prev => [...prev, data]);
      setNewLevelName("");
      setAddLevelDialogOpen(false);
      setSelectedLevelId(data.id);
      toast({ title: "Level created successfully" });
    } catch (error: any) {
      toast({ title: "Error creating level", description: error.message, variant: "destructive" });
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
      toast({ title: t('roleDeleted') || "Role deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const hasPagePermission = (roleId: string, pageId: string, permissionId: string) => {
    if (selectedLevelId) {
      const override = roleLevelPagePermissions.find(rp => rp.role_level_id === selectedLevelId && rp.page_id === pageId && rp.permission_id === permissionId);
      if (override) return override.is_granted;
      // fallback to base role if no override
    }
    return rolePagePermissions.some(rp => rp.role_id === roleId && rp.page_id === pageId && rp.permission_id === permissionId);
  };

  const handleTogglePagePermission = (roleId: string, pageId: string, permissionId: string) => {
    if (selectedLevelId) {
      const existing = roleLevelPagePermissions.find(rp => rp.role_level_id === selectedLevelId && rp.page_id === pageId && rp.permission_id === permissionId);
      if (existing) {
        setRoleLevelPagePermissions(prev => prev.map(p => p.id === existing.id ? { ...p, is_granted: !p.is_granted } : p));
      } else {
        const baseHasIt = rolePagePermissions.some(rp => rp.role_id === roleId && rp.page_id === pageId && rp.permission_id === permissionId);
        setRoleLevelPagePermissions(prev => [...prev, { id: 'temp-'+Date.now(), role_level_id: selectedLevelId, page_id: pageId, permission_id: permissionId, is_granted: !baseHasIt }]);
      }
    } else {
      const existing = rolePagePermissions.find(rp => rp.role_id === roleId && rp.page_id === pageId && rp.permission_id === permissionId);
      if (existing) {
        setRolePagePermissions(prev => prev.filter(p => p.id !== existing.id));
      } else {
        setRolePagePermissions(prev => [...prev, { id: 'temp-'+Date.now(), role_id: roleId, page_id: pageId, permission_id: permissionId }]);
      }
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      if (selectedLevelId) {
        await supabase.from('role_level_page_permissions').delete().eq('role_level_id', selectedLevelId);
        const toInsert = roleLevelPagePermissions.filter(rp => rp.role_level_id === selectedLevelId).map(rp => ({
          role_level_id: selectedLevelId,
          page_id: rp.page_id,
          permission_id: rp.permission_id,
          is_granted: rp.is_granted
        }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('role_level_page_permissions').insert(sanitizeUUIDs(toInsert));
          if (error) throw error;
        }
      } else {
        await supabase.from('role_page_permissions').delete().eq('role_id', selectedRole.id);
        const toInsert = rolePagePermissions.filter(rp => rp.role_id === selectedRole.id).map(rp => ({
          role_id: selectedRole.id,
          page_id: rp.page_id,
          permission_id: rp.permission_id
        }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('role_page_permissions').insert(sanitizeUUIDs(toInsert));
          if (error) throw error;
        }
      }
      toast({ title: "Permissions Saved Successfully" });
      fetchData(); // Refresh to get real IDs
    } catch (err: any) {
      toast({ title: "Error saving permissions", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t('roles')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {roles.map(role => (
              <div key={role.id} className="group flex items-center gap-1 pr-2">
                <Button
                  variant={selectedRole?.id === role.id && !selectedLevelId ? "default" : "ghost"}
                  className={`flex-1 justify-start gap-2 h-10 ${selectedRole?.id === role.id && !selectedLevelId ? 'bg-primary' : ''}`}
                  onClick={() => { setSelectedRole(role); setSelectedLevelId(null); }}
                >
                  {role.is_system ? <ShieldCheck className="w-4 h-4 text-indigo-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <span className="truncate">{role.name}</span>
                </Button>
                {!role.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { setRoleToDelete(role); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-[calc(100%-8px)] mx-1 mt-4 border-dashed border-slate-300 text-muted-foreground" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addRole') || "Add Role"}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>{selectedRole ? `${t('permissionMatrix')}: ${selectedRole.name}` : t('selectRole')}</CardTitle>
                {selectedRole && (
                  <div className="flex items-center gap-2 mt-2">
                    <Select value={selectedLevelId || 'base'} onValueChange={(val) => setSelectedLevelId(val === 'base' ? null : val)}>
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Select Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">Base Role Permissions</SelectItem>
                        {roleLevels.filter(l => l.role_id === selectedRole.id).map(l => (
                           <SelectItem key={l.id} value={l.id}>Level: {l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" onClick={handleSavePermissions}>
                       <CheckCircle2 className="w-3 h-3 mr-1" /> Save Permissions
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAddLevelDialogOpen(true)}>
                       <Plus className="w-3 h-3 mr-1" /> Add Level
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={layoutView} onValueChange={(val: any) => setLayoutView(val)}>
                  <SelectTrigger className="w-[180px] h-9 bg-card">
                    <SelectValue placeholder="Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matrix">Matrix View</SelectItem>
                    <SelectItem value="tree">Tree View</SelectItem>
                    <SelectItem value="card">Card-Based View</SelectItem>
                  </SelectContent>
                </Select>
                {selectedRole && selectedRole.is_system && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">{t('systemImmutable')}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-background/50">
                <Shield className="w-12 h-12 mb-2 opacity-20" />
                <p>{t('selectRole')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {layoutView === 'matrix' && (
                  <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full border-collapse bg-card">
                      <thead>
                        <tr className="bg-background/80">
                          <th className="p-4 text-left border-b border-border font-semibold text-slate-700 sticky left-0 bg-background z-10 min-w-[200px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Section / Page</th>
                          {permissions.map(p => (
                            <th key={p.id} className="p-4 text-center border-b border-border font-semibold text-slate-700 text-xs capitalize">{p.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map(mod => {
                          const pages = systemPages.filter(p => p.module_id === mod.id);
                          if (pages.length === 0) return null;
                          return (
                            <React.Fragment key={mod.id}>
                              <tr className="bg-slate-100/50">
                                <td colSpan={permissions.length + 1} className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">{mod.name}</td>
                              </tr>
                              {pages.map(page => (
                                <tr key={page.id} className="hover:bg-primary/10/30 transition-colors group">
                                  <td className="px-4 py-3 border-b border-border font-medium text-foreground sticky left-0 bg-card group-hover:bg-primary/10/30 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-2" />
                                    {page.name}
                                  </td>
                                  {permissions.map(perm => {
                                    const checked = hasPagePermission(selectedRole.id, page.id, perm.id);
                                    const isDisabled = selectedRole.name === 'Admin';
                                    return (
                                      <td key={perm.id} className="p-2 border-b border-border text-center">
                                        <button
                                          disabled={isDisabled}
                                          onClick={() => handleTogglePagePermission(selectedRole.id, page.id, perm.id)}
                                          className={`w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-all shadow-sm ${checked
                                            ? 'bg-primary text-white hover:bg-indigo-700 scale-105'
                                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-400'
                                            } ${isDisabled ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                                        >
                                          {checked ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3 h-3" />}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {layoutView === 'tree' && (
                  <div className="space-y-4">
                    {modules.map(mod => {
                      const pages = systemPages.filter(p => p.module_id === mod.id);
                      if (pages.length === 0) return null;
                      return (
                        <div key={mod.id} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                          <div className="bg-background px-4 py-3 font-semibold text-foreground flex items-center gap-2 border-b border-border">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {mod.name}
                          </div>
                          <div className="p-0">
                            {pages.map(page => (
                              <div key={page.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border last:border-0 hover:bg-background/50 transition-colors gap-4">
                                <div className="flex items-center gap-2 pl-4">
                                  <FileText className="w-4 h-4 text-indigo-400" />
                                  <span className="font-medium text-slate-700">{page.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 md:justify-end">
                                  {permissions.map(perm => {
                                    const checked = hasPagePermission(selectedRole.id, page.id, perm.id);
                                    const isDisabled = selectedRole.name === 'Admin';
                                    return (
                                      <div key={perm.id} className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1.5 rounded-md shadow-sm">
                                        <Switch
                                          id={`${page.id}-${perm.id}`}
                                          checked={checked}
                                          disabled={isDisabled}
                                          onCheckedChange={() => handleTogglePagePermission(selectedRole.id, page.id, perm.id)}
                                          className="scale-75 data-[state=checked]:bg-primary"
                                        />
                                        <Label htmlFor={`${page.id}-${perm.id}`} className={`text-xs cursor-pointer ${checked ? 'text-indigo-700 font-semibold' : 'text-muted-foreground'}`}>
                                          {perm.name}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {layoutView === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {modules.map(mod => {
                      const pages = systemPages.filter(p => p.module_id === mod.id);
                      if (pages.length === 0) return null;
                      return (
                        <Card key={mod.id} className="shadow-sm border-border">
                          <CardHeader className="bg-background/80 border-b border-border pb-3 pt-4">
                            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                              <Shield className="w-4 h-4 text-indigo-500" />
                              {mod.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {pages.map(page => (
                              <div key={page.id} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                  {page.name}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {permissions.map(perm => {
                                    const checked = hasPagePermission(selectedRole.id, page.id, perm.id);
                                    const isDisabled = selectedRole.name === 'Admin';
                                    return (
                                      <button
                                        key={perm.id}
                                        disabled={isDisabled}
                                        onClick={() => handleTogglePagePermission(selectedRole.id, page.id, perm.id)}
                                        className={`flex items-center gap-2 p-1.5 rounded border text-xs text-left transition-all ${checked
                                            ? 'bg-primary/10 border-indigo-200 text-indigo-700 shadow-sm'
                                            : 'bg-card border-border text-muted-foreground hover:border-indigo-300'
                                          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                      >
                                        <div className={`w-3 h-3 rounded-sm flex items-center justify-center ${checked ? 'bg-primary text-white' : 'bg-slate-100 border border-slate-300'}`}>
                                          {checked && <Check className="w-2.5 h-2.5" />}
                                        </div>
                                        {perm.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t('createRole')}>
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('name')}</Label>
            <Input
              placeholder="e.g. Senior Underwriter"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700">{t('createRole')}</Button>
          </div>
        </form>
      </FormDialog>

      <FormDialog open={addLevelDialogOpen} onOpenChange={setAddLevelDialogOpen} title="Add Role Level">
        <form onSubmit={handleCreateRoleLevel} className="space-y-4">
          <div className="space-y-2">
            <Label>Level Name</Label>
            <Input
              placeholder="e.g. Senior, Manager, Specialist"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setAddLevelDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700">Add Level</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roleDeleted')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700">{t('deleteRole') || "Delete Role"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border flex-wrap h-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            {t('profile')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              {t('userManagement')}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="roles" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              {t('roleManagement')}
            </TabsTrigger>
          )}


          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            {t('notifications')}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            {t('security')}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            {t('systemStatus')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('profileInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-metric text-primary">
                    {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{currentUser?.full_name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize">Role: {currentUser?.role || 'User'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fullName')}</Label>
                  <Input value={currentUser?.full_name || ''} readOnly className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>{t('email')}</Label>
                  <Input value={currentUser?.email || ''} readOnly className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Input value={currentUser?.role || ''} readOnly className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>{t('phone')}</Label>
                  <Input placeholder={t('phone')} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="bg-primary hover:bg-indigo-700">
                  {t('saveChanges')}
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

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationPreferences')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{t('emailNotifications')}</p>
                    <p className="text-sm text-muted-foreground">{t('emailNotificationsDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{t('renewalReminders')}</p>
                    <p className="text-sm text-muted-foreground">{t('renewalRemindersDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{t('claimUpdates')}</p>
                    <p className="text-sm text-muted-foreground">{t('claimUpdatesDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{t('commissionAlerts')}</p>
                    <p className="text-sm text-muted-foreground">{t('commissionAlertsDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{t('taskReminders')}</p>
                    <p className="text-sm text-muted-foreground">{t('taskRemindersDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast({ title: t('recordUpdated') })} className="bg-primary hover:bg-indigo-700">
                  {t('savePreferences')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('securitySettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background rounded-lg">
                <h3 className="font-medium mb-2">{t('password')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('changePassword')}</p>
                <Button variant="outline">{t('changePassword')}</Button>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h3 className="font-medium mb-2">{t('twoFactorAuthentication')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('enable2fa')}</p>
                <Button variant="outline">{t('enable2fa')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>{t('systemConfiguration')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">{t('generalSettings')}</h3>
                  <div className="space-y-2">
                    <Label>{t('dateFormat')}</Label>
                    <Input value="MMM d, yyyy" readOnly className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('currency')}</Label>
                    <Input value="EGP (EGP)" readOnly className="bg-background" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">{t('businessRules')}</h3>
                  <div className="space-y-2">
                    <Label>{t('defaultCommissionRate')}</Label>
                    <Input placeholder="7.5" type="number" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('renewalReminderDays')}</Label>
                    <Input placeholder="90" type="number" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: t('recordUpdated') })} className="bg-primary hover:bg-indigo-700">
                  {t('saveSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
