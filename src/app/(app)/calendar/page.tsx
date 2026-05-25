
'use client';
import React, { useState, useMemo } from "react";
import { 
  format, addDays, subDays, startOfDay, isSameDay, setHours, setMinutes, parseISO, 
  eachDayOfInterval, startOfWeek, endOfWeek, addMinutes, differenceInMinutes, isWithinInterval
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  Video, 
  User, 
  Plus, 
  Filter,
  Users,
  LayoutGrid,
  List
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import FormDialog from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Activity, User as AppUser, Company, Prospect } from "@/lib/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM
const HOUR_HEIGHT = 100;

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-100 border-blue-200 text-blue-700",
  meeting: "bg-purple-100 border-purple-200 text-purple-700",
  task: "bg-amber-100 border-amber-200 text-amber-700",
  follow_up: "bg-emerald-100 border-emerald-200 text-emerald-700",
  default: "bg-slate-100 border-slate-200 text-slate-700"
};

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  meeting: Video,
  task: CalendarIcon,
  follow_up: CalendarIcon,
  default: CalendarIcon
};

const emptyForm: Omit<Activity, 'id' | 'created_at'> = {
  activity_type: "task",
  subject: "",
  description: "",
  status: "pending",
  priority: "medium",
  due_date: "",
  end_date: "",
  related_type: "company",
  related_id: "",
  related_name: "",
  assigned_to_name: "",
  assigned_to_id: "",
  result: "",
  duration_minutes: 60
};

export default function CalendarPage() {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<Omit<Activity, 'id' | 'created_at'>>(emptyForm);
  
  // Helper moved up to avoid ReferenceError during initialization
  const endOfDayForInterval = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // Supabase Data
  const { data: activitiesData } = useSupabaseCollection<Activity>('activities');
  const activities = activitiesData || [];
  
  const { data: usersData } = useSupabaseCollection<AppUser>('users');
  const users = usersData || [];
  
  const { data: companiesRaw } = useSupabaseCollection<Company>('companies');
  const companies = companiesRaw || [];

  const leads = useMemo(() => companies.filter(c => c.status === 'lead'), [companies]);
  
  const { data: prospectsRaw } = useSupabaseCollection<Prospect>('prospects');
  const prospects = prospectsRaw || [];

  // Interval for view
  const interval = useMemo(() => {
    if (view === 'day') {
      return { start: startOfDay(currentDate), end: startOfDay(currentDate) };
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return { start, end };
  }, [currentDate, view]);

  const daysInView = useMemo(() => {
    return eachDayOfInterval({ start: interval.start, end: interval.end });
  }, [interval]);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (!activity.due_date) return false;
      const start = parseISO(activity.due_date);
      const inRange = isWithinInterval(start, { 
        start: startOfDay(interval.start), 
        end: endOfDayForInterval(interval.end) 
      });
      const matchesUser = filterUser === "all" || activity.assigned_to_name === filterUser;
      const matchesType = filterType === "all" || activity.activity_type === filterType;
      return inRange && matchesUser && matchesType;
    });
  }, [activities, interval, filterUser, filterType]);

  const relatedDataOptions = useMemo(() => {
    switch (formData.related_type) {
      case 'company': return companies.map(c => ({ id: c.id, name: c.name }));
      case 'lead': return leads.map(l => ({ id: l.id, name: l.name }));
      case 'prospect': return prospects.map(p => ({ id: p.id, name: p.company_name }));
      default: return [];
    }
  }, [formData.related_type, companies, leads, prospects]);

  const calculatePosition = (startStr: string, endStr?: string, duration?: number) => {
    const start = parseISO(startStr);
    const startMins = (start.getHours() - 8) * 60 + start.getMinutes();
    let durationMins = duration || 60;
    
    if (endStr) {
      const end = parseISO(endStr);
      durationMins = Math.max(15, differenceInMinutes(end, start));
    }

    return {
      top: (startMins / 60) * HOUR_HEIGHT,
      height: (durationMins / 60) * HOUR_HEIGHT
    };
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const slotTime = setMinutes(setHours(date, hour), 0);
    const endTime = addMinutes(slotTime, 60);
    setFormData({
      ...emptyForm,
      due_date: slotTime.toISOString().slice(0, 16),
      end_date: endTime.toISOString().slice(0, 16),
      duration_minutes: 60
    });
    setSelectedActivity(null);
    setDialogOpen(true);
  };

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormData({
      ...activity,
      due_date: activity.due_date ? activity.due_date.slice(0, 16) : "",
      end_date: activity.end_date ? activity.end_date.slice(0, 16) : "",
    } as any);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      duration_minutes: differenceInMinutes(parseISO(formData.end_date!), parseISO(formData.due_date))
    };
    try {
      if (selectedActivity) {
        await supabase.from("activities").update(data).eq("id", selectedActivity.id);
        toast({ title: "Activity updated" });
      } else {
        await supabase.from("activities").insert({ ...data, created_at: new Date().toISOString() });
        toast({ title: "Activity scheduled" });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving activity" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Schedule Calendar" 
        
      >
        <div className="flex items-center gap-2 bg-white p-1 border rounded-lg shadow-sm">
          <Button 
            variant={view === 'day' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setView('day')}
            className="h-8"
          >
            <List className="w-4 h-4 mr-2" /> Day
          </Button>
          <Button 
            variant={view === 'week' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setView('week')}
            className="h-8"
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Week
          </Button>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 border rounded-lg shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, view === 'day' ? 1 : 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 font-bold text-sm min-w-[160px] text-center">
            {view === 'day' ? format(currentDate, "EEEE, MMM d") : `${format(interval.start, "MMM d")} - ${format(interval.end, "MMM d, yyyy")}`}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, view === 'day' ? 1 : 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="follow_up">Follow-ups</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex border-b bg-slate-50/50 sticky top-0 z-20">
              <div className="w-20 border-r" />
              {daysInView.map((day) => (
                <div key={day.toISOString()} className="flex-1 p-4 text-center border-r last:border-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{format(day, "EEE")}</p>
                  <p className={cn(
                    "text-lg font-black",
                    isSameDay(day, new Date()) ? "text-indigo-600" : "text-slate-900"
                  )}>{format(day, "d")}</p>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
              {/* Time Column */}
              <div className="w-20 flex flex-col border-r bg-slate-50/50">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-[100px] border-b last:border-0 flex items-start justify-center pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Columns */}
              {daysInView.map((day) => (
                <div key={day.toISOString()} className="flex-1 relative border-r last:border-0">
                  {/* Grid Lines */}
                  {HOURS.map((hour) => (
                    <div 
                      key={hour} 
                      className="h-[100px] border-b last:border-0 cursor-pointer hover:bg-indigo-50/20 transition-colors"
                      onClick={() => handleSlotClick(day, hour)}
                    />
                  ))}

                  {/* Activities Overlay */}
                  {filteredActivities
                    .filter(a => isSameDay(parseISO(a.due_date), day))
                    .map(activity => {
                      const pos = calculatePosition(activity.due_date, activity.end_date, activity.duration_minutes);
                      const Icon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
                      const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.default;

                      return (
                        <div
                          key={activity.id}
                          onClick={(e) => { e.stopPropagation(); handleActivityClick(activity); }}
                          className={cn(
                            "absolute left-1 right-1 z-10 p-2 rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden",
                            colorClass
                          )}
                          style={{ top: pos.top + 2, height: pos.height - 4 }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Icon className="w-3 h-3 opacity-70" />
                            <span className="text-[9px] font-black opacity-60">
                              {format(parseISO(activity.due_date), 'h:mm a')}
                            </span>
                          </div>
                          <p className="font-bold text-xs leading-tight line-clamp-2">{activity.subject}</p>
                          {pos.height > 60 && (
                            <div className="mt-1">
                              <p className="text-[9px] font-bold opacity-70 uppercase truncate">{activity.related_name || "Internal"}</p>
                              <div className="flex items-center gap-1 text-[8px] opacity-50 mt-0.5">
                                <Clock className="w-2 h-2" />
                                <span>{activity.duration_minutes || 60}m</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedActivity ? "Modify Appointment" : "New Schedule Entry"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Type *</Label>
              <Select value={formData.activity_type} onValueChange={(v) => setFormData({ ...formData, activity_type: v as any })}>
                <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formData.assigned_to_name} onValueChange={(v) => setFormData({ ...formData, assigned_to_name: v })}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Assign Agent" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Related Entity Type</Label>
              <Select value={formData.related_type} onValueChange={(v) => setFormData({ ...formData, related_type: v as any, related_id: '', related_name: '' })}>
                <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Related Name</Label>
              <Select 
                value={formData.related_id} 
                onValueChange={(v) => {
                  const selected = relatedDataOptions.find(o => o.id === v);
                  setFormData({ ...formData, related_id: v, related_name: selected?.name || '' });
                }}
              >
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder={`Select ${formData.related_type}`} />
                </SelectTrigger>
                <SelectContent>
                  {relatedDataOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes & Preparation</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Agenda or specific details..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-900 font-bold px-8 shadow-lg">
              {selectedActivity ? "Update Schedule" : "Confirm Appointment"}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
