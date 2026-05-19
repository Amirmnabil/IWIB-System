'use client';

import React, { useState } from 'react';
import { Phone, Calendar, Mail, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormDialog from '@/components/shared/FormDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface LogActivityButtonProps {
  companyId: string;
  companyName: string;
  currentUserId?: string;
  currentUserName?: string;
  onSuccess?: () => void;
  variant?: 'icon' | 'full';
  prefillType?: 'call' | 'meeting' | 'email' | 'task' | 'note';
  label?: string;
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'task', label: 'Task', icon: FileText },
  { value: 'note', label: 'Note', icon: FileText },
];

export function LogActivityButton({
  companyId,
  companyName,
  currentUserId,
  currentUserName,
  onSuccess,
  variant = 'icon',
  prefillType,
  label = 'Log Activity',
}: LogActivityButtonProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState<{
    activity_type: 'call' | 'meeting' | 'email' | 'task' | 'note';
    subject: string;
    description: string;
    result: string;
    status: string;
    priority: string;
    due_date: string;
    duration_minutes: number;
  }>({
    activity_type: (prefillType || 'call') as any,
    subject: '',
    description: '',
    result: '',
    status: 'completed',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0],
    duration_minutes: 0,
  });

  const handleOpen = () => {
    setForm({
      activity_type: (prefillType || 'call') as any,
      subject: prefillType === 'call' ? `Call with ${companyName}` : prefillType === 'meeting' ? `Meeting with ${companyName}` : prefillType === 'email' ? `Email to ${companyName}` : '',
      description: '',
      result: '',
      status: 'completed',
      priority: 'medium',
      due_date: new Date().toISOString().split('T')[0],
      duration_minutes: 0,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('activities').insert({
        activity_type: form.activity_type as any,
        subject: form.subject,
        description: form.description || null,
        result: form.result || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || new Date().toISOString(),
        duration_minutes: form.duration_minutes || 0,
        related_type: 'company',
        related_id: companyId,
        related_name: companyName,
        assigned_to_name: currentUserName || null,
        assigned_to_id: currentUserId || null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Activity logged successfully!' });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to log activity', description: error?.message });
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = ACTIVITY_TYPES.find(t => t.value === form.activity_type) || ACTIVITY_TYPES[0];
  const Icon = typeConfig.icon;

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${prefillType === 'call' ? 'text-blue-500' : prefillType === 'meeting' ? 'text-purple-500' : prefillType === 'email' ? 'text-indigo-500' : 'text-emerald-500'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-700">{label}</span>
          </div>
          <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
        </button>
      ) : (
        <Button onClick={handleOpen} className="gap-2">
          <Plus className="w-4 h-4" /> {label}
        </Button>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Log Activity for ${companyName}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.activity_type} onValueChange={v => setForm({ ...form, activity_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Follow-up call with HR Manager"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              placeholder="e.g. 30"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What was discussed?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Outcome / Result</Label>
            <Textarea
              value={form.result}
              onChange={e => setForm({ ...form, result: e.target.value })}
              placeholder="What happened as a result?"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving ? 'Saving...' : 'Log Activity'}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
