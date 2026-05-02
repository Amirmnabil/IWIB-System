
'use client';
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Phone, Calendar, Mail, FileText, User, Edit, Trash2, Clock, CheckCircle2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { Activity, User as AppUser, Company, Policy, Claim, Contact, Prospect } from "@/lib/types";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const activityIcons = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  task: FileText,
  note: FileText
};

const emptyForm: Omit<Activity, 'id' | 'created_at'> = {
  activity_type: "task",
  subject: "",
  description: "",
  status: "pending",
  priority: "medium",
  due_date: "",
  related_type: "company",
  related_id: "",
  related_name: "",
  assigned_to_name: "",
  assigned_to_id: "",
  result: "",
  duration_minutes: 0
};

export default function Activities() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<Omit<Activity, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const activitiesRef = useMemoFirebase(() => collection(firestore!, 'activities'), [firestore]);
  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);
  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
  const policiesRef = useMemoFirebase(() => collection(firestore!, 'policies'), [firestore]);
  const claimsRef = useMemoFirebase(() => collection(firestore!, 'claims'), [firestore]);
  const contactsRef = useMemoFirebase(() => collection(firestore!, 'contacts'), [firestore]);
  const prospectsRef = useMemoFirebase(() => collection(firestore!, 'prospects'), [firestore]);

  // Master Data collections
  const activityTypesRef = useMemoFirebase(() => collection(firestore!, 'master_activity_types'), [firestore]);
  const { data: activityTypesData } = useCollection<any>(activityTypesRef);
  const activityTypes = activityTypesData || [];

  const statusesRef = useMemoFirebase(() => collection(firestore!, 'master_activity_statuses'), [firestore]);
  const { data: activityStatusesData } = useCollection<any>(statusesRef);
  const activityStatuses = activityStatusesData || [];

  const prioritiesRef = useMemoFirebase(() => collection(firestore!, 'master_priorities'), [firestore]);
  const { data: prioritiesData } = useCollection<any>(prioritiesRef);
  const priorities = prioritiesData || [];

  const relatedTypesRef = useMemoFirebase(() => collection(firestore!, 'master_related_types'), [firestore]);
  const { data: relatedTypesData } = useCollection<any>(relatedTypesRef);
  const relatedTypes = relatedTypesData || [];

  const { data: activitiesData, isLoading } = useCollection<Activity>(activitiesRef);
  const { data: usersData } = useCollection<AppUser>(usersRef);
  const { data: companiesData } = useCollection<Company>(companiesRef);
  const { data: policiesData } = useCollection<Policy>(policiesRef);
  const { data: claimsData } = useCollection<Claim>(claimsRef);
  const { data: contactsData } = useCollection<Contact>(contactsRef);
  const { data: prospectsData } = useCollection<Prospect>(prospectsRef);

  const activities = activitiesData || [];
  const users = usersData || [];
  const companies = companiesData || [];
  const policies = policiesData || [];
  const claims = claimsData || [];
  const contacts = contactsData || [];
  const prospects = prospectsData || [];

  const leads = useMemo(() => companies.filter(c => c.status === 'lead'), [companies]);
  

  const relatedDataOptions = useMemo(() => {
    switch (formData.related_type) {
      case 'company':
        return companies.map(c => ({ id: c.id, name: c.name }));
      case 'lead':
        return leads.map(l => ({ id: l.id, name: l.name }));
      case 'prospect':
        return prospects.map(p => ({ id: p.id, name: p.company_name }));
      case 'policy':
        return policies.map(p => ({ id: p.id, name: p.policy_number }));
      case 'claim':
        return claims.map(c => ({ id: c.id, name: c.claim_number }));
      case 'contact':
        return contacts.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }));
      default:
        return [];
    }
  }, [formData.related_type, companies, leads, prospects, policies, claims, contacts]);

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedActivity(null);
  };

  const handleEdit = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormData({
      activity_type: activity.activity_type || "task",
      subject: activity.subject || "",
      description: activity.description || "",
      status: activity.status || "pending",
      priority: activity.priority || "medium",
      due_date: activity.due_date ? activity.due_date.split('T')[0] : "",
      related_type: activity.related_type,
      related_id: activity.related_id,
      related_name: activity.related_name,
      assigned_to_name: activity.assigned_to_name,
      assigned_to_id: activity.assigned_to_id,
      result: activity.result,
      duration_minutes: activity.duration_minutes
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    const isUpdate = !!selectedActivity;
    const activityRef = isUpdate 
      ? doc(firestore, "activities", selectedActivity!.id)
      : doc(collection(firestore, "activities"));

    const dataToSave = isUpdate 
      ? formData 
      : { ...formData, created_at: new Date().toISOString() };

    (isUpdate ? updateDoc(activityRef, dataToSave as any) : addDoc(collection(firestore, "activities"), dataToSave as any))
      .then(() => {
        toast({ title: isUpdate ? "Activity updated successfully" : "Activity created successfully" });
        setDialogOpen(false);
        resetForm();
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: activityRef.path,
          operation: isUpdate ? 'update' : 'create',
          requestResourceData: dataToSave,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDelete = () => {
    if (selectedActivity && firestore) {
      const activityRef = doc(firestore, "activities", selectedActivity.id);
      deleteDoc(activityRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: activityRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
      toast({ title: "Activity deleted successfully" });
    }
    setDeleteDialogOpen(false);
    setSelectedActivity(null);
  }

  const columns = [
    {
      header: "Activity",
      accessorKey: "subject",
      cell: ({row}: any) => {
        const activity = row.original as Activity;
        const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || FileText;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activity.activity_type === 'call' ? 'bg-blue-100' :
              activity.activity_type === 'meeting' ? 'bg-purple-100' :
              activity.activity_type === 'email' ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                activity.activity_type === 'call' ? 'text-blue-600' :
                activity.activity_type === 'meeting' ? 'text-purple-600' :
                activity.activity_type === 'email' ? 'text-emerald-600' : 'text-slate-600'
              }`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{activity.subject}</p>
              <p className="text-sm text-slate-500 capitalize">{activity.activity_type}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={(row.original as Activity).status} />
    },
    {
      header: "Priority",
      accessorKey: "priority",
      cell: ({row}: any) => <StatusBadge status={(row.original as Activity).priority || 'medium'} />
    },
    {
      header: "Due Date",
      accessorKey: "due_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{(row.original as Activity).due_date ? format(new Date((row.original as Activity).due_date!), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: "Related To",
      accessorKey: "related_name",
      cell: ({row}: any) => (
        <div>
          <p className="text-sm">{(row.original as Activity).related_name || '-'}</p>
          {(row.original as Activity).related_type && (
            <p className="text-xs text-slate-500 capitalize">{(row.original as Activity).related_type}</p>
          )}
        </div>
      )
    },
    {
      header: "Assigned To",
      accessorKey: "assigned_to_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span>{(row.original as Activity).assigned_to_name || '-'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const activity = row.original as Activity;
        return (
          <div className="flex items-center gap-1">
            {activity.status !== 'completed' && (
              <Button 
                variant="ghost" 
                size="icon"
                className="text-emerald-600"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const activityRef = doc(firestore!, "activities", activity.id);
                  updateDoc(activityRef, { status: 'completed' });
                  toast({ title: "Activity marked as completed" });
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(activity); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedActivity(activity);
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
      data: activities,
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
        title="Activities"
        description="Track calls, meetings, tasks, and emails"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Activity"
        ActionIcon={Phone}
      />

      <Card>
        <CardContent className="p-6">
          {activities.length === 0 && !isLoading ? (
            <EmptyState
              icon={Phone}
              title="No activities yet"
              description="Start by adding your first activity to track your tasks and communications."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Activity"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search activities..."
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedActivity ? "Edit Activity" : "Add New Activity"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Type *</Label>
              <Select value={formData.activity_type} onValueChange={(v) => setFormData({ ...formData, activity_type: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map(t => (
                    <SelectItem key={t.id} value={t.code?.toLowerCase() || t.name.toLowerCase()}>{t.name}</SelectItem>
                  ))}
                  {activityTypes.length === 0 && <SelectItem value="task">Task</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Activity subject"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {activityStatuses.map(s => (
                    <SelectItem key={s.id} value={s.code?.toLowerCase() || s.name.toLowerCase()}>{s.name}</SelectItem>
                  ))}
                  {activityStatuses.length === 0 && <SelectItem value="pending">Pending</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p.id} value={p.code?.toLowerCase() || p.name.toLowerCase()}>{p.name}</SelectItem>
                  ))}
                  {priorities.length === 0 && <SelectItem value="medium">Medium</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                placeholder="Duration"
              />
            </div>
            <div className="space-y-2">
              <Label>Related To (Type)</Label>
              <Select value={formData.related_type} onValueChange={(v) => setFormData({ ...formData, related_type: v as any, related_id: '', related_name: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {relatedTypes.map(t => (
                    <SelectItem key={t.id} value={t.code?.toLowerCase() || t.name.toLowerCase()}>{t.name}</SelectItem>
                  ))}
                  {relatedTypes.length === 0 && <SelectItem value="company">Company</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Related Name</Label>
              <Select 
                value={formData.related_id} 
                onValueChange={(v) => {
                  const selected = relatedDataOptions.find(o => o.id === v);
                  setFormData({ ...formData, related_id: v, related_name: selected?.name || '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${formData.related_type || 'item'}`} />
                </SelectTrigger>
                <SelectContent>
                  {relatedDataOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formData.assigned_to_name} onValueChange={(v) => setFormData({ ...formData, assigned_to_name: v })}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                      {users.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Activity details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Result/Outcome</Label>
            <Textarea
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              placeholder="Activity outcome..."
              rows={2}
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
              {selectedActivity ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedActivity?.subject}"? This action cannot be undone.
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
