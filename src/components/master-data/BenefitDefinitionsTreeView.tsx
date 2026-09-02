'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Folder, FolderOpen, FileText, ChevronDown, ChevronRight, 
  Plus, Edit, Trash2, Shield, Eye, HelpCircle, Loader2, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FormDialog from "@/components/shared/FormDialog";
import { useToast } from "@/lib/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-context";

interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

interface BenefitDefinition {
  id: string;
  category_id: string;
  parent_benefit_id: string | null;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function BenefitDefinitionsTreeView() {
  const { lang, isRtl } = useI18n();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [definitions, setDefinitions] = useState<BenefitDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedDefinition, setSelectedDefinition] = useState<BenefitDefinition | null>(null);
  const [parentBenefit, setParentBenefit] = useState<BenefitDefinition | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category_id: '',
    parent_benefit_id: null as string | null,
    sort_order: 0,
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cats, error: catsErr } = await supabase
        .from('benefit_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (catsErr) throw catsErr;

      const { data: defs, error: defsErr } = await supabase
        .from('benefit_definitions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (defsErr) throw defsErr;

      setCategories(cats || []);
      setDefinitions(defs || []);

      // Auto-expand all categories by default for good UX
      const initialExpandedCats: Record<string, boolean> = {};
      cats?.forEach((c: any) => { initialExpandedCats[c.id] = true; });
      setExpandedCategories(initialExpandedCats);
      
      const initialExpandedParents: Record<string, boolean> = {};
      defs?.forEach((d: any) => { if (!d.parent_benefit_id) initialExpandedParents[d.id] = true; });
      setExpandedParents(initialExpandedParents);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Fetch error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleParent = (id: string) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddNew = (categoryId: string, parentId: string | null = null) => {
    setSelectedDefinition(null);
    setDefaultCategory(categoryId);
    
    let parentObj = null;
    if (parentId) {
      parentObj = definitions.find(d => d.id === parentId) || null;
    }
    setParentBenefit(parentObj);

    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      category_id: categoryId,
      parent_benefit_id: parentId,
      sort_order: 0,
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleEdit = (def: BenefitDefinition) => {
    setSelectedDefinition(def);
    const parentObj = def.parent_benefit_id ? (definitions.find(d => d.id === def.parent_benefit_id) || null) : null;
    setParentBenefit(parentObj);
    setDefaultCategory(def.category_id);

    setFormData({
      name_en: def.name_en,
      name_ar: def.name_ar,
      description_en: def.description_en || '',
      description_ar: def.description_ar || '',
      category_id: def.category_id,
      parent_benefit_id: def.parent_benefit_id,
      sort_order: def.sort_order,
      is_active: def.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (def: BenefitDefinition) => {
    // 1. Check if used in plan_benefit_config
    try {
      const { count, error: countErr } = await supabase
        .from('plan_benefit_config')
        .select('*', { count: 'exact', head: true })
        .eq('benefit_id', def.id);
      
      if (countErr) throw countErr;

      if (count && count > 0) {
        // Blocked - suggest deactivation
        const confirmDeactivate = window.confirm(
          lang === 'ar' 
            ? 'هذه المنفعة مستخدمة حالياً في عروض أو خطط تأمينية. لا يمكن حذفها نهائياً. هل تريد إلغاء تنشيطها بدلاً من ذلك؟'
            : 'This benefit definition is in use by configured Plan Tiers and cannot be hard-deleted. Would you like to deactivate it instead?'
        );
        if (confirmDeactivate) {
          const { error: updateErr } = await supabase
            .from('benefit_definitions')
            .update({ is_active: false })
            .eq('id', def.id);
          if (updateErr) throw updateErr;
          toast({ title: lang === 'ar' ? 'تم إلغاء التنشيط' : 'Deactivated successfully' });
          fetchData();
        }
        return;
      }

      // 2. Safe to delete
      const confirmDelete = window.confirm(
        lang === 'ar' ? 'هل أنت متأكد من حذف هذه المنفعة؟' : 'Are you sure you want to delete this benefit definition?'
      );
      if (confirmDelete) {
        const { error: delErr } = await supabase
          .from('benefit_definitions')
          .delete()
          .eq('id', def.id);
        if (delErr) throw delErr;
        toast({ title: 'Deleted successfully' });
        fetchData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error deleting', description: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_en || !formData.name_ar) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Bilingual names (EN and AR) are required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category_id: formData.category_id,
        parent_benefit_id: formData.parent_benefit_id,
        name_en: formData.name_en,
        name_ar: formData.name_ar,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        sort_order: Number(formData.sort_order) || 0,
        is_active: formData.is_active
      };

      if (selectedDefinition) {
        const { error } = await supabase
          .from('benefit_definitions')
          .update(payload)
          .eq('id', selectedDefinition.id);
        if (error) throw error;
        toast({ title: 'Benefit definition updated successfully' });
      } else {
        const { error } = await supabase
          .from('benefit_definitions')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Benefit definition created successfully' });
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-slate-400 font-semibold">Loading Benefit Definitions Catalogue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Catalogue Info bar */}
      <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Master Definitions Catalogue</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Configure bilingual benefit rules and parent/child sub-items that plan templates instantiate</p>
          </div>
        </div>
        <Button size="sm" onClick={() => handleAddNew(categories[0]?.id || '')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 rounded-lg">
          <Plus className="w-4 h-4" /> Add Master Benefit
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map(cat => {
          const catDefs = definitions.filter(d => d.category_id === cat.id);
          const rootDefs = catDefs.filter(d => !d.parent_benefit_id);
          const isExpanded = expandedCategories[cat.id];

          return (
            <Card key={cat.id} className="border border-slate-100 shadow-sm overflow-hidden bg-card transition-all duration-300">
              <div 
                onClick={() => toggleCategory(cat.id)}
                className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/20 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <Folder className="w-4 h-4 text-indigo-500 fill-indigo-50" />
                  <span className="font-bold text-slate-800 text-sm">
                    {lang === 'ar' ? cat.name_ar : cat.name_en}
                  </span>
                  <Badge variant="secondary" className="font-semibold text-[10px] py-0 px-2 bg-indigo-50 border-indigo-100 text-indigo-700 ml-2">
                    {rootDefs.length} Benefits
                  </Badge>
                  {!cat.is_active && (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px]">Inactive</Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 font-bold text-xs"
                  onClick={(e) => { e.stopPropagation(); handleAddNew(cat.id); }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Benefit
                </Button>
              </div>

              {isExpanded && (
                <CardContent className="p-0">
                  {rootDefs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">No benefits defined under this category.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {rootDefs.map(parent => {
                        const subDefs = catDefs.filter(d => d.parent_benefit_id === parent.id);
                        const isParentExpanded = expandedParents[parent.id];
                        
                        return (
                          <div key={parent.id} className="transition-all duration-300">
                            {/* Parent Row */}
                            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/30 group">
                              <div className="flex items-center gap-3 pl-2">
                                {subDefs.length > 0 ? (
                                  <button 
                                    onClick={() => toggleParent(parent.id)} 
                                    className="p-1 rounded hover:bg-slate-100 shrink-0"
                                  >
                                    {isParentExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                  </button>
                                ) : (
                                  <div className="w-5.5 shrink-0" />
                                )}
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 text-xs">
                                    {lang === 'ar' ? parent.name_ar : parent.name_en}
                                  </p>
                                  {(parent.description_en || parent.description_ar) && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-lg">
                                      {lang === 'ar' ? parent.description_ar : parent.description_en}
                                    </p>
                                  )}
                                </div>
                                {!parent.is_active && (
                                  <Badge variant="outline" className="text-red-500 border-red-100 bg-red-50 text-[9px] py-0">Inactive</Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs"
                                  onClick={() => handleAddNew(cat.id, parent.id)}
                                >
                                  Add Sub-item
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                  onClick={() => handleEdit(parent)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(parent)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Sub items */}
                            {isParentExpanded && subDefs.length > 0 && (
                              <div className="bg-slate-50/20 divide-y divide-slate-100/50 border-t border-slate-100/50">
                                {subDefs.map(child => (
                                  <div key={child.id} className="p-3 pl-12 flex items-center justify-between hover:bg-slate-50/60 group">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                      <div className="space-y-0.5">
                                        <p className="font-semibold text-slate-700 text-xs">
                                          {lang === 'ar' ? child.name_ar : child.name_en}
                                        </p>
                                        {(child.description_en || child.description_ar) && (
                                          <p className="text-[10px] text-slate-400 truncate max-w-lg">
                                            {lang === 'ar' ? child.description_ar : child.description_en}
                                          </p>
                                        )}
                                      </div>
                                      {!child.is_active && (
                                        <Badge variant="outline" className="text-red-500 border-red-100 bg-red-50 text-[9px] py-0">Inactive</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                        onClick={() => handleEdit(child)}
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(child)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Form modal */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedDefinition ? 'Edit Benefit Definition' : 'Add Benefit Definition'}
        size="default"
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {parentBenefit && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Adding Sub-item under:</span>
              <p className="text-xs font-bold text-indigo-900">{lang === 'ar' ? parentBenefit.name_ar : parentBenefit.name_en}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Name (English) *</Label>
            <Input 
              value={formData.name_en} 
              onChange={e => setFormData({ ...formData, name_en: e.target.value })} 
              placeholder="e.g. Intensive Care Unit Stay"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Name (Arabic) *</Label>
            <Input 
              value={formData.name_ar} 
              onChange={e => setFormData({ ...formData, name_ar: e.target.value })} 
              className="font-arabic"
              dir="rtl"
              placeholder="مثال: الإقامة بالعناية المركزة"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Description (English)</Label>
            <Textarea 
              value={formData.description_en} 
              onChange={e => setFormData({ ...formData, description_en: e.target.value })} 
              placeholder="Detailed description of coverage rules..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Arabic)</Label>
            <Textarea 
              value={formData.description_ar} 
              onChange={e => setFormData({ ...formData, description_ar: e.target.value })} 
              className="font-arabic"
              dir="rtl"
              placeholder="تفاصيل التغطية والشروط..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input 
                type="number" 
                value={formData.sort_order} 
                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })} 
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50/50">
            <Switch 
              checked={formData.is_active} 
              onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} 
            />
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-slate-800">Active Catalogue Status</Label>
              <p className="text-[10px] text-slate-400">If inactive, this benefit cannot be added to new policy configs.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSubmitting ? 'Saving...' : 'Save Definition'}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
