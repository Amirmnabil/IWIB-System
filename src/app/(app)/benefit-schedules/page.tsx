'use client';

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { 
  Building2, Plus, Shield, ListTree, DollarSign, 
  Settings, Clock, Percent, ClipboardList, HelpCircle, 
  Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  Loader2, Info, ChevronDown, ChevronRight, Copy, Printer, Network, Globe, CreditCard, Search, FolderOpen, Undo2, Redo2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import PrintTableOfBenefits from "@/components/sme-pricing/PrintTableOfBenefits";
import FormDialog from "@/components/shared/FormDialog";

export default function PlanTierBenefitBuilder() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Language views: split EN and AR fully
  const [viewLang, setViewLang] = useState<'en' | 'ar'>('en');
  const viewRtl = viewLang === 'ar';

  const tBuilder = {
    en: {
      title: "Plan Tiers & Benefits Matrix",
      subtitle: "High-density Notion-style spreadsheet editor for plan specs, limits, co-payments and shared pools",
      createTier: "Create Tier",
      cloneTier: "Clone Tier",
      printPlan: "Print Plan",
      planTiers: "Plan Tiers",
      activeTier: "Active Tier Profile",
      annualLimit: "Annual Limit (AAL)",
      network: "Medical Network",
      regionalScope: "Regional Scope",
      cardType: "Card Type",
      validity: "Validity Window",
      unlimited: "Unlimited",
      none: "None",
      pools: "Combined Limit Pools",
      addPool: "Add Pool",
      poolsEmpty: "No shared pools configured.",
      matrixTitle: "Benefits Matrix",
      matrixSubtitle: "Configure coverage limits, co-payments and pools for each benefit definition.",
      searchPlaceholder: "Search benefit definitions...",
      saveConfig: "Save Configuration",
      tierNameEn: "Tier Name (English) *",
      tierNameAr: "Tier Name (Arabic) *",
      limitValue: "Limit Value",
      currency: "Limit Currency",
      scope: "Regional Scope",
      validityPeriod: "Validity Period",
      cancel: "Cancel",
      create: "Create Tier",
      dupTitle: "Duplicate Plan Tier",
      dupSubmit: "Duplicate Tier",
      poolLimit: "Pool Limit Value *",
      poolBasis: "Basis",
      poolRule: "Depletion Rule",
      savePool: "Save Pool",
      referralLetter: "Referral Letter Required",
      reimbursementTitle: "Reimbursement Settings",
      reimbursementCovered: "Reimbursement Covered",
      reimbursementPercent: "Reimbursement Percentage (%)",
      priceList: "Reimbursement Price List",
      saveReimbursement: "Save Reimbursement",
      yes: "Yes",
      no: "No",
      coverageScope: "Coverage Scope Type",
      scopeValue: "Scope Value",
      allMembers: "All Members",
      specificCount: "Specific Number of Members",
      specificPercent: "Percentage of Members",
      accommodationCat: "Accommodation Category",
      maxIcuDays: "Max ICU Days Allowed",
      specialCoverageType: "Coverage Type",
      fullCoverage: "Full Coverage",
      separateLimit: "Separate Limit",
      sharedLimit: "Shared Limit with Another Benefit",
      uncovered: "Uncovered",
      separateContainer: "Covered via Separate Container",
      sharedContainer: "Covered via Shared Container",
      missing: "Missing",
      partial: "Partial",
      complete: "Complete",
      applyToAll: "Apply to All",
      duplicateFromTier: "Duplicate from another Tier",
      selected: "selected",
      apply: "Apply",
      clear: "Clear",
      saving: "Auto-saving changes...",
      saved: "All changes saved",
      undo: "Undo",
      redo: "Redo",
      tabMatrix: "Benefits Spreadsheet Matrix",
      tabPools: "Shared pools & containers",
      tabReimb: "Reimbursement Rules",
    },
    ar: {
      title: "مصفوفة فئات ومنافع التأمين",
      subtitle: "جدول بيانات عالي الكثافة على نمط Notion لإعداد المنافع، الحدود، ونسب التحمل والحدود المشتركة",
      createTier: "إنشاء فئة جديدة",
      cloneTier: "نسخ الفئة",
      printPlan: "طباعة الجدول",
      planTiers: "فئات التأمين",
      activeTier: "ملف الفئة الحالية",
      annualLimit: "الحد السنوي الأقصى AAL",
      network: "الشبكة الطبية",
      regionalScope: "النطاق الجغرافي",
      cardType: "نوع البطاقة",
      validity: "فترة الصلاحية",
      unlimited: "بدون حد أقصى",
      none: "لا يوجد",
      pools: "مجمعات الحدود المشتركة",
      addPool: "إضافة مجمع",
      poolsEmpty: "لا توجد مجمعات حدود مشتركة.",
      matrixTitle: "مصفوفة التغطيات والمنافع",
      matrixSubtitle: "إعداد حدود التغطية، نسب التحمل، والمجمعات لكل منفعة تأمينية.",
      searchPlaceholder: "البحث في المنافع التأمينية...",
      saveConfig: "حفظ الإعدادات",
      tierNameEn: "اسم الفئة (إنجليزي) *",
      tierNameAr: "اسم الفئة (عربي) *",
      limitValue: "قيمة الحد الأقصى",
      currency: "العملة",
      scope: "النطاق الجغرافي",
      validityPeriod: "فترة التغطية",
      cancel: "إلغاء",
      create: "إنشاء الفئة",
      dupTitle: "نسخ فئة تأمينية",
      dupSubmit: "نسخ الفئة",
      poolLimit: "قيمة مجمع الحدود *",
      poolBasis: "دورية المجمع",
      poolRule: "قاعدة الصرف",
      savePool: "حفظ المجمع",
      referralLetter: "يتطلب خطاب تحويل من طبيب",
      reimbursementTitle: "إعدادات استرداد المصاريف",
      reimbursementCovered: "تغطية استرداد المصاريف",
      reimbursementPercent: "نسبة استرداد المصاريف (%)",
      priceList: "قائمة أسعار الاسترداد",
      saveReimbursement: "حفظ إعدادات الاسترداد",
      yes: "نعم",
      no: "لا",
      coverageScope: "نطاق توزيع التغطية للأعضاء",
      scopeValue: "قيمة النطاق",
      allMembers: "كل الأعضاء",
      specificCount: "عدد محدد من الأعضاء",
      specificPercent: "نسبة مئوية من الأعضاء",
      accommodationCat: "فئة الإقامة والتمريض",
      maxIcuDays: "أقصى عدد أيام للعناية المركزة",
      specialCoverageType: "طريقة التغطية",
      fullCoverage: "تغطية كاملة",
      separateLimit: "حد فرعي منفصل",
      sharedLimit: "حد مشترك مع منفعة أخرى",
      uncovered: "غير مغطى",
      separateContainer: "مغطى عبر وعاء منفصل",
      sharedContainer: "مغطى عبر وعاء مشترك",
      missing: "غير معرّف",
      partial: "معرّف جزئياً",
      complete: "مكتمل",
      applyToAll: "تطبيق على الكل",
      duplicateFromTier: "نسخ من فئة أخرى",
      selected: "تم تحديدها",
      apply: "تطبيق",
      clear: "مسح",
      saving: "جاري حفظ التغييرات تلقائياً...",
      saved: "تم حفظ جميع التغييرات",
      undo: "تراجع",
      redo: "إعادة",
      tabMatrix: "جدول مصفوفة المنافع",
      tabPools: "الأوعية والمجمعات المشتركة",
      tabReimb: "قواعد استرداد المصاريف",
    }
  }[viewLang];

  // Selected entities
  const [selectedTierId, setSelectedTierId] = useState<string>("");

  // Master Data lists
  const [networks, setNetworks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [benefitDefs, setBenefitDefs] = useState<any[]>([]);

  // Selected Tier Data
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [pools, setPools] = useState<any[]>([]);
  const [oonRules, setOonRules] = useState<Record<string, any>>({});

  // UI state
  const [benefitSearch, setBenefitSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // History stack for Undo/Redo
  const [undoStack, setUndoStack] = useState<Record<string, any>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, any>[]>([]);

  // Auto-save feedback indicators
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [tierFormData, setTierFormData] = useState({
    tier_name_en: "",
    tier_name_ar: "",
    annual_aggregate_limit_value: "",
    annual_aggregate_limit_currency: "EGP",
    regional_scope: "local" as any,
    network_id: "",
    card_type: "electronic" as any,
    policy_start_date: "",
    policy_end_date: "",
    referral_letter: false
  });

  // Reimbursement settings local form state (saved on plan_tiers)
  const [reimbForm, setReimbForm] = useState({
    reimbursement_covered: false,
    reimbursement_percent: "80",
    reimbursement_price_list_id: "none"
  });

  // Duplicate Tier state
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [dupSubmitting, setDupSubmitting] = useState(false);
  const [dupFormData, setDupFormData] = useState({
    source_tier_id: "",
    tier_name_en: "",
    tier_name_ar: ""
  });

  // Combined Pools Modal state
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [poolSubmitting, setPoolSubmitting] = useState(false);
  const [poolFormData, setPoolFormData] = useState({
    id: "",
    pool_name_en: "",
    pool_name_ar: "",
    pool_limit_value: "",
    pool_limit_currency: "EGP",
    pool_basis: "annual" as any,
    depletion_rule: "first_come_first_served"
  });

  // Bulk Panel fields state
  const [bulkFields, setBulkFields] = useState({
    coverage_status: "covered",
    limit_type: "included_in_aal",
    limit_value: "",
    limit_currency: "EGP",
    limit_basis: "annual",
    co_payment_percent: "0",
    combined_pool_id: "none",
    coverage_scope_type: "all"
  });

  // Print Preview state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // 1. Initial Master Data Fetching
  const fetchMasterData = async () => {
    try {
      const { data: networksData } = await supabase.from("medical_networks").select("id, name_en, name_ar").eq("is_active", true).order("name_en");
      setNetworks(networksData || []);

      const { data: catsData } = await supabase.from("benefit_categories").select("id, name_en, name_ar").eq("is_active", true).order("sort_order");
      setCategories(catsData || []);

      const { data: defsData } = await supabase.from("benefit_definitions").select("id, category_id, parent_benefit_id, name_en, name_ar, description_en, description_ar").eq("is_active", true).order("sort_order");
      setBenefitDefs(defsData || []);

    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching catalogues", description: err.message });
    }
  };

  // 2. Fetch Tiers (Global levels)
  const fetchTiers = async () => {
    try {
      const { data } = await supabase
        .from("plan_tiers")
        .select("*, medical_networks(name_en, name_ar)")
        .order("created_at", { ascending: false });
      setTiers(data || []);
      if (data && data.length > 0 && !selectedTierId) {
        setSelectedTierId(data[0].id);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Tiers fetch failed", description: err.message });
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchTiers();
  }, []);

  // 3. Fetch Selected Tier Detailed Configs
  const fetchTierDetails = async (tierId: string) => {
    if (!tierId) {
      setSelectedTier(null);
      setConfigs({});
      setPools([]);
      setOonRules({});
      return;
    }

    try {
      // Find tier object
      const tierObj = tiers.find(t => t.id === tierId) || null;
      setSelectedTier(tierObj);

      if (tierObj) {
        setReimbForm({
          reimbursement_covered: tierObj.reimbursement_covered || false,
          reimbursement_percent: String(tierObj.reimbursement_percent || 80),
          reimbursement_price_list_id: tierObj.reimbursement_price_list_id || "none"
        });
      }

      // Pools
      const { data: poolsData } = await supabase.from("combined_pools").select("*").eq("tier_id", tierId).order("created_at");
      setPools(poolsData || []);

      // Configs
      const { data: configsData } = await supabase.from("plan_benefit_config").select("*").eq("tier_id", tierId);
      const confMap: Record<string, any> = {};
      configsData?.forEach((c: any) => {
        confMap[c.benefit_id] = c;
      });
      setConfigs(confMap);

      // Out of network rules
      if (configsData && configsData.length > 0) {
        const configIds = configsData.map((c: any) => c.id);
        const { data: oonData } = await supabase.from("oon_reimbursement_rules").select("*").in("plan_benefit_config_id", configIds);
        const oonMap: Record<string, any> = {};
        oonData?.forEach((r: any) => {
          oonMap[r.plan_benefit_config_id] = r;
        });
        setOonRules(oonMap);
      } else {
        setOonRules({});
      }

    } catch (err: any) {
      toast({ variant: "destructive", title: "Tier details failed", description: err.message });
    }
  };

  useEffect(() => {
    fetchTierDetails(selectedTierId);
  }, [selectedTierId, tiers]);

  // 4. Save Tier general fields automatically
  const handleSaveTierField = async (fieldName: string, value: any) => {
    if (!selectedTierId || !selectedTier) return;
    setIsSaving(true);
    try {
      const payload = {
        [fieldName]: value,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from("plan_tiers").update(payload).eq("id", selectedTierId);
      if (error) throw error;
      
      // Local sync
      setSelectedTier({ ...selectedTier, ...payload });
      setTiers(prev => prev.map(t => t.id === selectedTierId ? { ...t, ...payload } : t));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Tier update failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Reimbursement settings automatically
  const handleSaveReimbursement = async (updatedReimb: Partial<typeof reimbForm>) => {
    if (!selectedTierId) return;
    setIsSaving(true);
    try {
      const updated = { ...reimbForm, ...updatedReimb };
      setReimbForm(updated);

      const payload = {
        reimbursement_covered: updated.reimbursement_covered,
        reimbursement_percent: Number(updated.reimbursement_percent) || 80,
        reimbursement_price_list_id: updated.reimbursement_price_list_id === "none" ? null : updated.reimbursement_price_list_id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("plan_tiers").update(payload).eq("id", selectedTierId);
      if (error) throw error;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reimbursement update failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Inline Grid Configuration Editor Auto-Save
  const handleUpdateConfigValue = async (benefitId: string, updatedFields: Record<string, any>) => {
    if (!selectedTierId) return;

    // Push into Undo history stack
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(configs))]);
    setRedoStack([]); // Clear redo stack on new action

    // Update local state first for ultra-fast UX
    const existing = configs[benefitId] || {};
    const mergedConfig = {
      ...existing,
      ...updatedFields,
      tier_id: selectedTierId,
      benefit_id: benefitId
    };
    
    setConfigs(prev => ({
      ...prev,
      [benefitId]: mergedConfig
    }));

    setIsSaving(true);
    try {
      const payload = {
        tier_id: selectedTierId,
        benefit_id: benefitId,
        coverage_status: mergedConfig.coverage_status || "covered",
        limit_type: mergedConfig.limit_type || "included_in_aal",
        limit_value: mergedConfig.limit_value !== undefined && mergedConfig.limit_value !== "" && mergedConfig.limit_value !== null ? Number(mergedConfig.limit_value) : null,
        limit_currency: mergedConfig.limit_currency || selectedTier?.annual_aggregate_limit_currency || "EGP",
        limit_basis: mergedConfig.limit_basis || "annual",
        payment_mechanism: mergedConfig.payment_mechanism || "direct_billing",
        co_payment_percent: Number(mergedConfig.co_payment_percent) || 0,
        co_payment_cap: mergedConfig.co_payment_cap !== undefined && mergedConfig.co_payment_cap !== "" && mergedConfig.co_payment_cap !== null ? Number(mergedConfig.co_payment_cap) : null,
        network_scope: mergedConfig.network_scope || "in_network_only",
        waiting_period_days: Number(mergedConfig.waiting_period_days) || 0,
        combined_pool_id: (mergedConfig.combined_pool_id && mergedConfig.combined_pool_id !== 'none') ? mergedConfig.combined_pool_id : null,
        
        coverage_scope_type: mergedConfig.coverage_scope_type || "all",
        coverage_scope_value: mergedConfig.coverage_scope_value !== undefined && mergedConfig.coverage_scope_value !== "" && mergedConfig.coverage_scope_value !== null ? Number(mergedConfig.coverage_scope_value) : null,
        accommodation_category: mergedConfig.accommodation_category || null,
        max_icu_days: mergedConfig.max_icu_days !== undefined && mergedConfig.max_icu_days !== "" && mergedConfig.max_icu_days !== null ? Number(mergedConfig.max_icu_days) : null,
        special_coverage_type: mergedConfig.special_coverage_type || null,

        updated_at: new Date().toISOString()
      };

      if (existing.id) {
        const { error } = await supabase.from("plan_benefit_config").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("plan_benefit_config").insert(payload).select("id").single();
        if (error) throw error;
        setConfigs(prev => ({
          ...prev,
          [benefitId]: { ...mergedConfig, id: data.id }
        }));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Undo/Redo Action Handlers
  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(configs))]);
    
    setConfigs(previous);
    setIsSaving(true);
    try {
      for (const [bId, conf] of Object.entries(previous)) {
        if (conf.id) {
          await supabase.from("plan_benefit_config").update(conf).eq("id", conf.id);
        }
      }
      toast({ title: "Undo applied" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Undo sync failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(configs))]);

    setConfigs(next);
    setIsSaving(true);
    try {
      for (const [bId, conf] of Object.entries(next)) {
        if (conf.id) {
          await supabase.from("plan_benefit_config").update(conf).eq("id", conf.id);
        }
      }
      toast({ title: "Redo applied" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Redo sync failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Bulk Edit Application
  const handleApplyBulkEdits = async () => {
    if (selectedRows.size === 0 || !selectedTierId) return;

    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(configs))]);
    setRedoStack([]);

    setIsSaving(true);
    try {
      const rowsArray = Array.from(selectedRows);
      for (const benefitId of rowsArray) {
        const existing = configs[benefitId] || {};
        const updated = {
          coverage_status: bulkFields.coverage_status,
          limit_type: bulkFields.limit_type,
          limit_value: bulkFields.limit_value !== "" ? Number(bulkFields.limit_value) : null,
          limit_currency: bulkFields.limit_currency,
          limit_basis: bulkFields.limit_basis,
          co_payment_percent: Number(bulkFields.co_payment_percent) || 0,
          combined_pool_id: bulkFields.combined_pool_id === "none" ? null : bulkFields.combined_pool_id,
          coverage_scope_type: bulkFields.coverage_scope_type
        };

        const payload = {
          tier_id: selectedTierId,
          benefit_id: benefitId,
          ...updated,
          updated_at: new Date().toISOString()
        };

        if (existing.id) {
          await supabase.from("plan_benefit_config").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("plan_benefit_config").insert(payload);
        }
      }

      toast({ title: `Bulk edits applied to ${selectedRows.size} benefits` });
      setSelectedRows(new Set());
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Bulk edit failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 9. Duplicate from Another Tier
  const handleDuplicateFromTier = async (sourceTierId: string) => {
    if (!selectedTierId || !sourceTierId) return;
    const confirmCopy = window.confirm("This will overwrite all benefits specs on the active tier. Do you want to proceed?");
    if (!confirmCopy) return;

    setIsSaving(true);
    try {
      // 1. Delete active configs
      await supabase.from("plan_benefit_config").delete().eq("tier_id", selectedTierId);

      // 2. Fetch source configs
      const { data: sourceConfigs } = await supabase.from("plan_benefit_config").select("*").eq("tier_id", sourceTierId);

      if (sourceConfigs && sourceConfigs.length > 0) {
        const clonedPayloads = sourceConfigs.map((c: any) => ({
          tier_id: selectedTierId,
          benefit_id: c.benefit_id,
          coverage_status: c.coverage_status,
          limit_type: c.limit_type,
          limit_value: c.limit_value,
          limit_currency: c.limit_currency,
          limit_basis: c.limit_basis,
          payment_mechanism: c.payment_mechanism,
          co_payment_percent: c.co_payment_percent,
          co_payment_cap: c.co_payment_cap,
          network_scope: c.network_scope,
          waiting_period_days: c.waiting_period_days,
          combined_pool_id: c.combined_pool_id,
          coverage_scope_type: c.coverage_scope_type,
          coverage_scope_value: c.coverage_scope_value,
          accommodation_category: c.accommodation_category,
          max_icu_days: c.max_icu_days,
          special_coverage_type: c.special_coverage_type
        }));

        const { error } = await supabase.from("plan_benefit_config").insert(clonedPayloads);
        if (error) throw error;
      }

      toast({ title: "Plan details duplicated successfully" });
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Duplication failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 10. Creation, cloning, combined pools handlers
  const handleAddNewTier = () => {
    setTierFormData({
      tier_name_en: "",
      tier_name_ar: "",
      annual_aggregate_limit_value: "",
      annual_aggregate_limit_currency: "EGP",
      regional_scope: "local",
      network_id: networks[0]?.id || "",
      card_type: "electronic",
      policy_start_date: "",
      policy_end_date: "",
      referral_letter: false
    });
    setTierDialogOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierFormData.tier_name_en || !tierFormData.tier_name_ar) {
      toast({ variant: "destructive", title: "Name fields required" });
      return;
    }
    setTierSubmitting(true);
    try {
      const payload = {
        tier_name_en: tierFormData.tier_name_en,
        tier_name_ar: tierFormData.tier_name_ar,
        annual_aggregate_limit_value: tierFormData.annual_aggregate_limit_value === "" ? null : Number(tierFormData.annual_aggregate_limit_value),
        annual_aggregate_limit_currency: tierFormData.annual_aggregate_limit_currency,
        regional_scope: tierFormData.regional_scope,
        network_id: tierFormData.network_id || null,
        card_type: tierFormData.card_type,
        policy_start_date: tierFormData.policy_start_date || null,
        policy_end_date: tierFormData.policy_end_date || null,
        referral_letter: tierFormData.referral_letter
      };
      const { data, error } = await supabase.from("plan_tiers").insert(payload).select("id").single();
      if (error) throw error;

      toast({ title: "Tier created successfully" });
      setTierDialogOpen(false);
      fetchTiers().then(() => setSelectedTierId(data.id));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Create tier failed", description: err.message });
    } finally {
      setTierSubmitting(false);
    }
  };

  const handleOpenDuplicate = () => {
    if (!selectedTierId) return;
    setDupFormData({
      source_tier_id: selectedTierId,
      tier_name_en: `${selectedTier?.tier_name_en} - Copy`,
      tier_name_ar: `${selectedTier?.tier_name_ar} - نسخة`,
    });
    setDupDialogOpen(true);
  };

  const handleDuplicateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setDupSubmitting(true);
    try {
      const targetTier = {
        tier_name_en: dupFormData.tier_name_en,
        tier_name_ar: dupFormData.tier_name_ar,
        annual_aggregate_limit_value: selectedTier.annual_aggregate_limit_value,
        annual_aggregate_limit_currency: selectedTier.annual_aggregate_limit_currency,
        regional_scope: selectedTier.regional_scope,
        network_id: selectedTier.network_id,
        card_type: selectedTier.card_type,
        policy_start_date: selectedTier.policy_start_date,
        policy_end_date: selectedTier.policy_end_date,
        referral_letter: selectedTier.referral_letter,
        reimbursement_covered: selectedTier.reimbursement_covered,
        reimbursement_percent: selectedTier.reimbursement_percent,
        reimbursement_price_list_id: selectedTier.reimbursement_price_list_id
      };

      const { data: newTier, error: tierErr } = await supabase.from("plan_tiers").insert(targetTier).select("id").single();
      if (tierErr) throw tierErr;

      const { data: sourcePools } = await supabase.from("combined_pools").select("*").eq("tier_id", selectedTierId);
      const poolIdMap: Record<string, string> = {};

      if (sourcePools && sourcePools.length > 0) {
        for (const pool of sourcePools) {
          const newPoolPayload = {
            tier_id: newTier.id,
            pool_name_en: pool.pool_name_en,
            pool_name_ar: pool.pool_name_ar,
            pool_limit_value: pool.pool_limit_value,
            pool_limit_currency: pool.pool_limit_currency,
            pool_basis: pool.pool_basis,
            depletion_rule: pool.depletion_rule
          };
          const { data: createdPool, error: poolErr } = await supabase.from("combined_pools").insert(newPoolPayload).select("id").single();
          if (poolErr) throw poolErr;
          poolIdMap[pool.id] = createdPool.id;
        }
      }

      const { data: sourceConfigs } = await supabase.from("plan_benefit_config").select("*").eq("tier_id", selectedTierId);
      if (sourceConfigs && sourceConfigs.length > 0) {
        for (const config of sourceConfigs) {
          const newConfigPayload = {
            tier_id: newTier.id,
            benefit_id: config.benefit_id,
            coverage_status: config.coverage_status,
            limit_type: config.limit_type,
            limit_value: config.limit_value,
            limit_currency: config.limit_currency,
            limit_basis: config.limit_basis,
            payment_mechanism: config.payment_mechanism,
            co_payment_percent: config.co_payment_percent,
            co_payment_cap: config.co_payment_cap,
            network_scope: config.network_scope,
            waiting_period_days: config.waiting_period_days,
            combined_pool_id: config.combined_pool_id ? (poolIdMap[config.combined_pool_id] || null) : null,
            coverage_scope_type: config.coverage_scope_type || 'all',
            coverage_scope_value: config.coverage_scope_value,
            accommodation_category: config.accommodation_category,
            max_icu_days: config.max_icu_days,
            special_coverage_type: config.special_coverage_type
          };
          await supabase.from("plan_benefit_config").insert(newConfigPayload);
        }
      }

      toast({ title: "Tier duplicated successfully!" });
      setDupDialogOpen(false);
      fetchTiers().then(() => setSelectedTierId(newTier.id));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Duplicate failed", description: err.message });
    } finally {
      setDupSubmitting(false);
    }
  };

  const handleOpenCreatePool = () => {
    setPoolFormData({
      id: "",
      pool_name_en: "",
      pool_name_ar: "",
      pool_limit_value: "",
      pool_limit_currency: selectedTier?.annual_aggregate_limit_currency || "EGP",
      pool_basis: "annual",
      depletion_rule: "first_come_first_served"
    });
    setPoolDialogOpen(true);
  };

  const handleEditPool = (pool: any) => {
    setPoolFormData({
      id: pool.id,
      pool_name_en: pool.pool_name_en,
      pool_name_ar: pool.pool_name_ar,
      pool_limit_value: String(pool.pool_limit_value),
      pool_limit_currency: pool.pool_limit_currency,
      pool_basis: pool.pool_basis,
      depletion_rule: pool.depletion_rule
    });
    setPoolDialogOpen(true);
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoolSubmitting(true);
    try {
      const payload = {
        tier_id: selectedTierId,
        pool_name_en: poolFormData.pool_name_en,
        pool_name_ar: poolFormData.pool_name_ar,
        pool_limit_value: Number(poolFormData.pool_limit_value),
        pool_limit_currency: poolFormData.pool_limit_currency,
        pool_basis: poolFormData.pool_basis,
        depletion_rule: poolFormData.depletion_rule
      };

      if (poolFormData.id) {
        await supabase.from("combined_pools").update(payload).eq("id", poolFormData.id);
      } else {
        await supabase.from("combined_pools").insert(payload);
      }

      toast({ title: "Pool saved successfully" });
      setPoolDialogOpen(false);
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save pool failed", description: err.message });
    } finally {
      setPoolSubmitting(false);
    }
  };

  const handleDeletePool = async (id: string) => {
    const confirmDel = window.confirm("Are you sure you want to delete this pool? All benefits linked to it will revert to individual limits.");
    if (!confirmDel) return;

    try {
      await supabase.from("combined_pools").delete().eq("id", id);
      toast({ title: "Pool deleted successfully" });
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deletion failed", description: err.message });
    }
  };

  // Overall Tier completion stats
  const completionStats = useMemo(() => {
    const total = benefitDefs.length;
    if (total === 0) return { percent: 0, count: 0, total: 0 };
    const configured = Object.values(configs).filter(c => c.coverage_status).length;
    return {
      percent: Math.round((configured / total) * 100),
      count: configured,
      total
    };
  }, [benefitDefs, configs]);

  // Grouped results for visual progress calculations
  const categoryStats = useMemo(() => {
    const stats: Record<string, { configured: number; total: number; percent: number }> = {};
    categories.forEach(cat => {
      const catDefs = benefitDefs.filter(d => d.category_id === cat.id);
      const total = catDefs.length;
      const configured = catDefs.filter(d => configs[d.id]?.coverage_status).length;
      stats[cat.id] = {
        configured,
        total,
        percent: total > 0 ? Math.round((configured / total) * 100) : 0
      };
    });
    return stats;
  }, [categories, benefitDefs, configs]);

  // Filter definitions strictly based on viewLang
  const filteredBenefits = useMemo(() => {
    if (!benefitSearch.trim()) return benefitDefs;
    const query = benefitSearch.toLowerCase();
    return benefitDefs.filter(d => {
      const label = viewLang === 'ar' ? d.name_ar : d.name_en;
      const desc = viewLang === 'ar' ? d.description_ar : d.description_en;
      return label.toLowerCase().includes(query) || (desc && desc.toLowerCase().includes(query));
    });
  }, [benefitDefs, benefitSearch, viewLang]);

  // Grouping benefits logic mapping categories -> parents -> children
  const groupedBenefits = useMemo(() => {
    const map: Record<string, { parent: any; children: any[] }[]> = {};
    categories.forEach(cat => {
      map[cat.id] = [];
    });

    const filteredIds = new Set(filteredBenefits.map(b => b.id));

    // Get parent benefit definitions
    const parents = benefitDefs.filter(d => d.parent_benefit_id === null);

    parents.forEach(parent => {
      const children = benefitDefs.filter(d => d.parent_benefit_id === parent.id);
      
      const matchParent = filteredIds.has(parent.id);
      const matchedChildren = children.filter(c => filteredIds.has(c.id));

      if (matchParent || matchedChildren.length > 0) {
        if (!map[parent.category_id]) {
          map[parent.category_id] = [];
        }
        map[parent.category_id].push({
          parent,
          children: matchedChildren
        });
      }
    });

    return map;
  }, [categories, benefitDefs, filteredBenefits]);

  // Bulk checkboxes
  const handleToggleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRows(new Set(filteredBenefits.map(d => d.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleToggleRowSelect = (benefitId: string, isChecked: boolean) => {
    const updated = new Set(selectedRows);
    if (isChecked) {
      updated.add(benefitId);
    } else {
      updated.delete(benefitId);
    }
    setSelectedRows(updated);
  };

  return (
    <div dir={viewRtl ? "rtl" : "ltr"} className={cn("container mx-auto py-6 space-y-6", viewRtl ? "font-arabic" : "font-sans")}>
      
      {/* 1. STICKY TOP SUMMARY BAR */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border border-slate-200/80 shadow-md p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Tier dropdown & Completion specs */}
        <div className="flex items-center gap-4">
          <div className="w-56">
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger className="h-11 bg-card border-slate-200 rounded-xl font-bold">
                <SelectValue placeholder="Select Plan Tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {viewLang === 'ar' ? t.tier_name_ar : t.tier_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden sm:block space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion Status</span>
              <Badge className={cn("text-[9px] font-bold py-0.5", completionStats.percent === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-100")} variant="outline">
                {completionStats.percent}%
              </Badge>
            </div>
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${completionStats.percent}%` }} />
            </div>
          </div>
        </div>

        {/* Global sticky specs inputs with auto-save */}
        {selectedTier && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] items-center grow max-w-3xl border-l border-r px-4 border-slate-100">
            
            <div className="space-y-0.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase">{tBuilder.annualLimit}</Label>
              <Input 
                type="number"
                value={selectedTier.annual_aggregate_limit_value || ""}
                onChange={e => handleSaveTierField("annual_aggregate_limit_value", e.target.value === "" ? null : Number(e.target.value))}
                className="h-8 text-xs font-bold bg-transparent border-slate-200/50 focus:border-slate-300 focus:bg-white"
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase">{tBuilder.network}</Label>
              <select 
                value={selectedTier.network_id || "none"}
                onChange={e => handleSaveTierField("network_id", e.target.value === "none" ? null : e.target.value)}
                className="w-full h-8 bg-transparent border border-slate-200 rounded p-1 text-[11px]"
              >
                <option value="none">None</option>
                {networks.map(n => (
                  <option key={n.id} value={n.id}>
                    {viewLang === 'ar' ? n.name_ar : n.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase">{tBuilder.regionalScope}</Label>
              <select 
                value={selectedTier.regional_scope}
                onChange={e => handleSaveTierField("regional_scope", e.target.value)}
                className="w-full h-8 bg-transparent border border-slate-200 rounded p-1 text-[11px]"
              >
                <option value="local">Local</option>
                <option value="regional">Regional</option>
                <option value="worldwide_ex_us">Worldwide (Ex. US)</option>
                <option value="worldwide_incl_us">Worldwide (Incl. US)</option>
              </select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px] text-slate-400 font-bold uppercase">{tBuilder.cardType}</Label>
              <select 
                value={selectedTier.card_type}
                onChange={e => handleSaveTierField("card_type", e.target.value)}
                className="w-full h-8 bg-transparent border border-slate-200 rounded p-1 text-[11px]"
              >
                <option value="electronic">Electronic</option>
                <option value="physical">Physical</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="flex flex-col justify-center items-start select-none pt-2 sm:pt-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase">{tBuilder.referralLetter}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Switch 
                  checked={selectedTier.referral_letter || false}
                  onCheckedChange={checked => handleSaveTierField("referral_letter", checked)}
                  className="scale-90"
                />
                <span className="text-[10px] font-bold text-slate-600">
                  {selectedTier.referral_letter ? "Yes" : "No"}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:bg-slate-100" onClick={handleUndo} disabled={undoStack.length === 0} title={tBuilder.undo}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:bg-slate-100" onClick={handleRedo} disabled={redoStack.length === 0} title={tBuilder.redo}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold" onClick={handleAddNewTier}>
            <Plus className="w-4 h-4 mr-1.5" /> {tBuilder.createTier}
          </Button>
          {selectedTierId && (
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-slate-700 font-bold" onClick={handleOpenDuplicate}>
              <Copy className="w-4 h-4 mr-1.5" /> {tBuilder.cloneTier}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-slate-700 font-bold" onClick={() => setPrintDialogOpen(true)}>
            <Printer className="w-4 h-4 mr-1.5" /> {tBuilder.printPlan}
          </Button>
        </div>
      </div>

      {/* Auto-save status feedback banner */}
      <div className="flex items-center justify-between px-4 py-2 border rounded-xl bg-slate-50/50 text-slate-400 text-xs">
        <div className="flex items-center gap-2 font-medium">
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>{tBuilder.saving}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tBuilder.saved}</span>
            </>
          )}
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50 shrink-0 select-none">
          <button 
            onClick={() => setViewLang('en')}
            className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition-all", viewLang === 'en' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
          >
            English View
          </button>
          <button 
            onClick={() => setViewLang('ar')}
            className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition-all font-arabic", viewLang === 'ar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800")}
          >
            العربية
          </button>
        </div>
      </div>

      {selectedTierId ? (
        <Tabs defaultValue="matrix" className="w-full space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="matrix" className="rounded-lg text-xs font-bold">{tBuilder.tabMatrix}</TabsTrigger>
            <TabsTrigger value="pools" className="rounded-lg text-xs font-bold">{tBuilder.tabPools}</TabsTrigger>
            <TabsTrigger value="reimb" className="rounded-lg text-xs font-bold">{tBuilder.tabReimb}</TabsTrigger>
          </TabsList>

          {/* TAB 1: BENEFITS MATRIX SHEET */}
          <TabsContent value="matrix" className="space-y-4 outline-none">
            
            {/* Toolbar Filter & Clone from Tier */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border rounded-xl shadow-sm">
              <div className="relative w-72">
                <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder={tBuilder.searchPlaceholder}
                  value={benefitSearch}
                  onChange={e => setBenefitSearch(e.target.value)}
                  className="h-9 text-xs pl-9"
                />
              </div>

              {/* Duplicate from another Tier select dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{tBuilder.duplicateFromTier}:</span>
                <div className="w-48">
                  <select 
                    onChange={e => handleDuplicateFromTier(e.target.value)}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>Select Tier to Copy</option>
                    {tiers.filter(t => t.id !== selectedTierId).map(t => (
                      <option key={t.id} value={t.id}>
                        {viewLang === 'ar' ? t.tier_name_ar : t.tier_name_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Matrix spreadsheet-like table container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedRows.size > 0 && selectedRows.size === filteredBenefits.length}
                        onChange={e => handleToggleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-left w-1/3">{tBuilder.matrixTitle}</th>
                    <th className="p-3 text-center w-40">{tBuilder.specialCoverageType}</th>
                    <th className="p-3 text-left w-52">{tBuilder.limitValue}</th>
                    <th className="p-3 text-center w-28">Co-pay (%)</th>
                    <th className="p-3 text-center w-40">Pool</th>
                    <th className="p-3 text-center w-36">{tBuilder.coverageScope}</th>
                    <th className="p-3 text-left w-48">Stay / ICU / Custom</th>
                    <th className="p-3 text-center w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map(cat => {
                    const groupItems = groupedBenefits[cat.id] || [];
                    const isCollapsed = collapsedCategories[cat.id];
                    const catStat = categoryStats[cat.id] || { configured: 0, total: 0, percent: 0 };
                    
                    if (groupItems.length === 0) return null;

                    return (
                      <React.Fragment key={cat.id}>
                        {/* Category Progress Row (collapsible) */}
                        <tr 
                          onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          className="bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                        >
                          <td colSpan={2} className="p-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                            {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            <span>{viewLang === 'ar' ? cat.name_ar : cat.name_en}</span>
                            <Badge className="ml-2 bg-indigo-50/50 border-indigo-100/50 text-indigo-700 text-[9px]" variant="outline">
                              {catStat.configured} / {catStat.total} {tBuilder.complete}
                            </Badge>
                          </td>
                          <td colSpan={6} className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${catStat.percent}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{catStat.percent}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-lg">
                              {catStat.percent === 100 ? "🟢" : catStat.percent > 0 ? "🟡" : "🔴"}
                            </span>
                          </td>
                        </tr>

                        {!isCollapsed && groupItems.map(({ parent, children }) => {
                          const parentConf = configs[parent.id] || {};
                          const parentChecked = selectedRows.has(parent.id);
                          const isParentLinkedToPool = parentConf.combined_pool_id && parentConf.combined_pool_id !== 'none';
                          const isParentSpecial = parent.category_id === '00000000-0000-0000-0000-000000000006';

                          // Status resolvers
                          const getStatusEmoji = (c: any) => {
                            if (!c || !c.coverage_status) return "🔴";
                            if (c.limit_type === 'sub_limit' && (c.limit_value === null || c.limit_value === "")) return "🟡";
                            return "🟢";
                          };

                          return (
                            <React.Fragment key={parent.id}>
                              {/* Parent benefit row */}
                              <tr className={cn("hover:bg-slate-50/20 group transition-colors", parentChecked && "bg-indigo-50/10")}>
                                <td className="p-3 text-center">
                                  <input 
                                    type="checkbox"
                                    checked={parentChecked}
                                    onChange={e => handleToggleRowSelect(parent.id, e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">{viewLang === 'ar' ? parent.name_ar : parent.name_en}</div>
                                  {(viewLang === 'ar' ? parent.description_ar : parent.description_en) && (
                                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 group-hover:line-clamp-none">
                                      {viewLang === 'ar' ? parent.description_ar : parent.description_en}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Coverage/Special type cell */}
                                <td className="p-3">
                                  {isParentSpecial ? (
                                    <select
                                      value={parentConf.special_coverage_type || "full_coverage"}
                                      onChange={e => handleUpdateConfigValue(parent.id, { special_coverage_type: e.target.value, coverage_status: e.target.value === 'uncovered' ? 'not_covered' : 'covered' })}
                                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                    >
                                      <option value="full_coverage">{tBuilder.fullCoverage}</option>
                                      <option value="separate_limit">{tBuilder.separateLimit}</option>
                                      <option value="shared_limit_another_benefit">{tBuilder.sharedLimit}</option>
                                      <option value="uncovered">{tBuilder.uncovered}</option>
                                      <option value="covered_separate_container">{tBuilder.separateContainer}</option>
                                      <option value="covered_shared_container">{tBuilder.sharedContainer}</option>
                                    </select>
                                  ) : (
                                    <select
                                      value={parentConf.coverage_status || "not_configured"}
                                      onChange={e => handleUpdateConfigValue(parent.id, { coverage_status: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                    >
                                      <option value="not_configured">Not Configured</option>
                                      <option value="covered">Covered</option>
                                      <option value="partially_covered">Partially Covered</option>
                                      <option value="not_covered">Not Covered</option>
                                    </select>
                                  )}
                                </td>

                                {/* Limits configuration cell */}
                                <td className="p-3">
                                  {parentConf.coverage_status !== 'not_covered' && parentConf.special_coverage_type !== 'uncovered' && (
                                    <div className="flex items-center gap-1">
                                      {!isParentSpecial && (
                                        <select
                                          value={isParentLinkedToPool ? "pool" : parentConf.limit_type || "included_in_aal"}
                                          onChange={e => handleUpdateConfigValue(parent.id, { limit_type: e.target.value })}
                                          disabled={isParentLinkedToPool}
                                          className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                                        >
                                          <option value="pool">Pool</option>
                                          <option value="included_in_aal">Inc. AAL</option>
                                          <option value="sub_limit">Sub-Limit</option>
                                          <option value="unlimited">Unlimited</option>
                                          <option value="per_case">Per Case</option>
                                        </select>
                                      )}

                                      {((isParentSpecial && parentConf.special_coverage_type === 'separate_limit') || (!isParentSpecial && parentConf.limit_type === 'sub_limit')) && !isParentLinkedToPool && (
                                        <input 
                                          type="number"
                                          value={parentConf.limit_value || ""}
                                          onBlur={e => handleUpdateConfigValue(parent.id, { limit_value: e.target.value })}
                                          onChange={e => setConfigs(prev => ({ ...prev, [parent.id]: { ...parentConf, limit_value: e.target.value } }))}
                                          className="w-20 bg-white border border-slate-200 rounded p-1 text-xs text-right"
                                          placeholder="Value"
                                        />
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Copay cell */}
                                <td className="p-3 text-center">
                                  {parentConf.coverage_status !== 'not_covered' && parentConf.special_coverage_type !== 'uncovered' && (
                                    <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={parentConf.co_payment_percent || "0"}
                                      onBlur={e => handleUpdateConfigValue(parent.id, { co_payment_percent: e.target.value })}
                                      onChange={e => setConfigs(prev => ({ ...prev, [parent.id]: { ...parentConf, co_payment_percent: e.target.value } }))}
                                      className="w-12 bg-white border border-slate-200 rounded p-1 text-xs text-center"
                                    />
                                  )}
                                </td>

                                {/* Pool select cell */}
                                <td className="p-3">
                                  {parentConf.coverage_status !== 'not_covered' && parentConf.special_coverage_type !== 'uncovered' && (!isParentSpecial || parentConf.special_coverage_type === 'covered_shared_container') && (
                                    <select
                                      value={parentConf.combined_pool_id || "none"}
                                      onChange={e => handleUpdateConfigValue(parent.id, { combined_pool_id: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                    >
                                      <option value="none">None</option>
                                      {pools.map(p => (
                                        <option key={p.id} value={p.id}>{viewLang === 'ar' ? p.pool_name_ar : p.pool_name_en}</option>
                                      ))}
                                    </select>
                                  )}
                                </td>

                                {/* Coverage scope type & value cell */}
                                <td className="p-3">
                                  {parentConf.coverage_status !== 'not_covered' && parentConf.special_coverage_type !== 'uncovered' && (
                                    <div className="flex items-center gap-1">
                                      <select
                                        value={parentConf.coverage_scope_type || "all"}
                                        onChange={e => handleUpdateConfigValue(parent.id, { coverage_scope_type: e.target.value })}
                                        className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                                      >
                                        <option value="all">All</option>
                                        <option value="count">Count</option>
                                        <option value="percentage">% Scope</option>
                                      </select>
                                      {parentConf.coverage_scope_type && parentConf.coverage_scope_type !== 'all' && (
                                        <input 
                                          type="number"
                                          value={parentConf.coverage_scope_value || ""}
                                          onBlur={e => handleUpdateConfigValue(parent.id, { coverage_scope_value: e.target.value })}
                                          onChange={e => setConfigs(prev => ({ ...prev, [parent.id]: { ...parentConf, coverage_scope_value: e.target.value } }))}
                                          className="w-12 bg-white border border-slate-200 rounded p-1 text-xs text-center"
                                        />
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Custom notes stay class / max icu days cell */}
                                <td className="p-3">
                                  {parent.id === '10000000-0000-0000-0000-000000000001' && (
                                    <select
                                      value={parentConf.accommodation_category || "regular_double"}
                                      onChange={e => handleUpdateConfigValue(parent.id, { accommodation_category: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                    >
                                      <option value="suite">Suite</option>
                                      <option value="first_class_single">First Class Single</option>
                                      <option value="regular_double">Regular Double</option>
                                    </select>
                                  )}

                                  {parent.id === '10000000-0000-0000-0000-000000000002' && (
                                    <input 
                                      type="number"
                                      value={parentConf.max_icu_days || ""}
                                      onBlur={e => handleUpdateConfigValue(parent.id, { max_icu_days: e.target.value })}
                                      onChange={e => setConfigs(prev => ({ ...prev, [parent.id]: { ...parentConf, max_icu_days: e.target.value } }))}
                                      className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                      placeholder="ICU Max Days"
                                    />
                                  )}
                                </td>

                                {/* Status cell */}
                                <td className="p-3 text-center">
                                  <span className="text-base select-none">{getStatusEmoji(parentConf)}</span>
                                </td>
                              </tr>

                              {/* Child rows nested slightly */}
                              {children.map((child: any) => {
                                const childConf = configs[child.id] || {};
                                const childChecked = selectedRows.has(child.id);
                                const isChildLinkedToPool = childConf.combined_pool_id && childConf.combined_pool_id !== 'none';
                                
                                return (
                                  <tr key={child.id} className={cn("hover:bg-slate-50/10 group transition-colors bg-slate-50/10", childChecked && "bg-indigo-50/10")}>
                                    <td className="p-3 text-center">
                                      <input 
                                        type="checkbox"
                                        checked={childChecked}
                                        onChange={e => handleToggleRowSelect(child.id, e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 pl-8 text-slate-700">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span className="text-slate-300 font-bold shrink-0">↳</span>
                                        <span>{viewLang === 'ar' ? child.name_ar : child.name_en}</span>
                                      </div>
                                    </td>
                                    
                                    {/* Coverage status */}
                                    <td className="p-3">
                                      <select
                                        value={childConf.coverage_status || "not_configured"}
                                        onChange={e => handleUpdateConfigValue(child.id, { coverage_status: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                      >
                                        <option value="not_configured">Not Configured</option>
                                        <option value="covered">Covered</option>
                                        <option value="partially_covered">Partially Covered</option>
                                        <option value="not_covered">Not Covered</option>
                                      </select>
                                    </td>

                                    {/* Limits */}
                                    <td className="p-3">
                                      {childConf.coverage_status !== 'not_covered' && (
                                        <div className="flex items-center gap-1">
                                          <select
                                            value={isChildLinkedToPool ? "pool" : childConf.limit_type || "included_in_aal"}
                                            onChange={e => handleUpdateConfigValue(child.id, { limit_type: e.target.value })}
                                            disabled={isChildLinkedToPool}
                                            className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                                          >
                                            <option value="pool">Pool</option>
                                            <option value="included_in_aal">Inc. AAL</option>
                                            <option value="sub_limit">Sub-Limit</option>
                                            <option value="unlimited">Unlimited</option>
                                            <option value="per_case">Per Case</option>
                                          </select>
                                          {childConf.limit_type === 'sub_limit' && !isChildLinkedToPool && (
                                            <input 
                                              type="number"
                                              value={childConf.limit_value || ""}
                                              onBlur={e => handleUpdateConfigValue(child.id, { limit_value: e.target.value })}
                                              onChange={e => setConfigs(prev => ({ ...prev, [child.id]: { ...childConf, limit_value: e.target.value } }))}
                                              className="w-20 bg-white border border-slate-200 rounded p-1 text-xs text-right"
                                              placeholder="Value"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </td>

                                    {/* Copay */}
                                    <td className="p-3 text-center">
                                      {childConf.coverage_status !== 'not_covered' && (
                                        <input 
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={childConf.co_payment_percent || "0"}
                                          onBlur={e => handleUpdateConfigValue(child.id, { co_payment_percent: e.target.value })}
                                          onChange={e => setConfigs(prev => ({ ...prev, [child.id]: { ...childConf, co_payment_percent: e.target.value } }))}
                                          className="w-12 bg-white border border-slate-200 rounded p-1 text-xs text-center"
                                        />
                                      )}
                                    </td>

                                    {/* Pool */}
                                    <td className="p-3">
                                      {childConf.coverage_status !== 'not_covered' && (
                                        <select
                                          value={childConf.combined_pool_id || "none"}
                                          onChange={e => handleUpdateConfigValue(child.id, { combined_pool_id: e.target.value })}
                                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                                        >
                                          <option value="none">None</option>
                                          {pools.map(p => (
                                            <option key={p.id} value={p.id}>{viewLang === 'ar' ? p.pool_name_ar : p.pool_name_en}</option>
                                          ))}
                                        </select>
                                      )}
                                    </td>

                                    {/* Scope */}
                                    <td className="p-3">
                                      {childConf.coverage_status !== 'not_covered' && (
                                        <div className="flex items-center gap-1">
                                          <select
                                            value={childConf.coverage_scope_type || "all"}
                                            onChange={e => handleUpdateConfigValue(child.id, { coverage_scope_type: e.target.value })}
                                            className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                                          >
                                            <option value="all">All</option>
                                            <option value="count">Count</option>
                                            <option value="percentage">% Scope</option>
                                          </select>
                                          {childConf.coverage_scope_type && childConf.coverage_scope_type !== 'all' && (
                                            <input 
                                              type="number"
                                              value={childConf.coverage_scope_value || ""}
                                              onBlur={e => handleUpdateConfigValue(child.id, { coverage_scope_value: e.target.value })}
                                              onChange={e => setConfigs(prev => ({ ...prev, [child.id]: { ...childConf, coverage_scope_value: e.target.value } }))}
                                              className="w-12 bg-white border border-slate-200 rounded p-1 text-xs text-center"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </td>

                                    {/* Notes */}
                                    <td className="p-3">
                                      {/* Room Accommodation specific categories only on parent */}
                                    </td>

                                    {/* Status */}
                                    <td className="p-3 text-center">
                                      <span className="text-base select-none">{getStatusEmoji(childConf)}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 2: COMBINED LIMIT POOLS */}
          <TabsContent value="pools" className="outline-none">
            <Card className="border shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between p-5 border-b bg-slate-50/10">
                <div>
                  <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">{tBuilder.pools}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Configure pools to share limits across multiple benefit categories</CardDescription>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleOpenCreatePool}>
                  <Plus className="w-4 h-4 mr-1.5" /> {tBuilder.addPool}
                </Button>
              </CardHeader>
              <CardContent className="p-5">
                {pools.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic">{tBuilder.poolsEmpty}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pools.map(p => {
                      const linked = Object.values(configs).filter(c => c.combined_pool_id === p.id);
                      return (
                        <div key={p.id} className="p-4 border rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 text-xs">
                              {viewLang === 'ar' ? p.pool_name_ar : p.pool_name_en}
                            </span>
                            <div className="flex gap-2 mt-2">
                              <Badge className="font-mono text-[9px] bg-indigo-50 border-indigo-150 text-indigo-700 font-bold" variant="outline">
                                {Number(p.pool_limit_value).toLocaleString()} {p.pool_limit_currency} ({p.pool_basis})
                              </Badge>
                              <Badge className="text-[9px] bg-slate-100 text-slate-500 font-bold" variant="outline">
                                {linked.length} linked benefits
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleEditPool(p)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeletePool(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: REIMBURSEMENT RULES */}
          <TabsContent value="reimb" className="outline-none">
            <Card className="border shadow-sm rounded-xl">
              <CardHeader className="p-5 border-b bg-slate-50/10">
                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">{tBuilder.reimbursementTitle}</CardTitle>
                <CardDescription className="text-xs text-slate-400">Configure medical reimbursement rules, price lists, and percentage limits for out-of-network claims</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 max-w-xl text-xs">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-slate-700">{tBuilder.reimbursementCovered}</Label>
                    <p className="text-[10px] text-slate-400">Enable or disable cash reimbursement claims globally for this tier</p>
                  </div>
                  <Switch 
                    checked={reimbForm.reimbursement_covered}
                    onCheckedChange={checked => handleSaveReimbursement({ reimbursement_covered: checked })}
                  />
                </div>

                {reimbForm.reimbursement_covered && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-600">{tBuilder.reimbursementPercent}</Label>
                      <Input 
                        type="number"
                        value={reimbForm.reimbursement_percent}
                        onChange={e => handleSaveReimbursement({ reimbursement_percent: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-slate-600">{tBuilder.priceList}</Label>
                      <Select 
                        value={reimbForm.reimbursement_price_list_id} 
                        onValueChange={v => handleSaveReimbursement({ reimbursement_price_list_id: v })}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tBuilder.none}</SelectItem>
                          {networks.map(n => (
                            <SelectItem key={n.id} value={n.id}>
                              {viewLang === 'ar' ? n.name_ar : n.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-none shadow-sm rounded-2xl py-24 text-center">
          <CardContent className="space-y-4">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto" />
            <h2 className="text-lg font-black text-slate-700">No Tier Created</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Please create a global plan tier using the header button to start configuring medical policy benefit specifications.</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleAddNewTier}>
              <Plus className="w-4 h-4 mr-1.5" /> {tBuilder.createTier}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FLOATING BULK EDITING PANEL */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 z-50 border border-slate-800 animate-in slide-in-from-bottom-5 duration-300 text-xs">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <Badge className="bg-indigo-600 text-white font-bold">{selectedRows.size}</Badge>
            <span className="font-semibold text-slate-300">{tBuilder.selected}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Coverage Status</span>
              <select
                value={bulkFields.coverage_status}
                onChange={e => setBulkFields({ ...bulkFields, coverage_status: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded p-1 text-[11px] text-white"
              >
                <option value="covered">Covered</option>
                <option value="partially_covered">Partially Covered</option>
                <option value="not_covered">Not Covered</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Limit Type</span>
              <select
                value={bulkFields.limit_type}
                onChange={e => setBulkFields({ ...bulkFields, limit_type: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded p-1 text-[11px] text-white"
              >
                <option value="included_in_aal">Inc. AAL</option>
                <option value="sub_limit">Sub-Limit</option>
                <option value="unlimited">Unlimited</option>
                <option value="per_case">Per Case</option>
              </select>
            </div>

            {bulkFields.limit_type === 'sub_limit' && (
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Limit Value</span>
                <input 
                  type="number"
                  value={bulkFields.limit_value}
                  onChange={e => setBulkFields({ ...bulkFields, limit_value: e.target.value })}
                  placeholder="Value"
                  className="w-16 bg-slate-800 border border-slate-700 rounded p-1 text-[11px] text-white text-right"
                />
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Copay (%)</span>
              <input 
                type="number"
                value={bulkFields.co_payment_percent}
                onChange={e => setBulkFields({ ...bulkFields, co_payment_percent: e.target.value })}
                className="w-12 bg-slate-800 border border-slate-700 rounded p-1 text-[11px] text-white text-center"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Scope</span>
              <select
                value={bulkFields.coverage_scope_type}
                onChange={e => setBulkFields({ ...bulkFields, coverage_scope_type: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded p-1 text-[11px] text-white"
              >
                <option value="all">All</option>
                <option value="count">Count</option>
                <option value="percentage">% Scope</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pl-2 border-l border-slate-800">
            <Button size="sm" onClick={handleApplyBulkEdits} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              {tBuilder.apply}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())} className="text-slate-400 hover:text-white h-8 hover:bg-slate-800">
              {tBuilder.clear}
            </Button>
          </div>
        </div>
      )}

      {/* CREATE NEW TIER DIALOG */}
      <FormDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        title="Create Plan Tier"
        size="lg"
      >
        <form onSubmit={handleSaveTier} className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <Label>{tBuilder.tierNameEn}</Label>
              <Input 
                value={tierFormData.tier_name_en}
                onChange={e => setTierFormData({ ...tierFormData, tier_name_en: e.target.value })}
                placeholder="e.g. VIP Platinum"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{tBuilder.tierNameAr}</Label>
              <Input 
                value={tierFormData.tier_name_ar}
                onChange={e => setTierFormData({ ...tierFormData, tier_name_ar: e.target.value })}
                className="font-arabic"
                dir="rtl"
                placeholder="مثال: الفئة المتميزة كبار الشخصيات"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Annual Aggregate Limit (AAL)</Label>
              <Input 
                type="number"
                value={tierFormData.annual_aggregate_limit_value}
                onChange={e => setTierFormData({ ...tierFormData, annual_aggregate_limit_value: e.target.value })}
                placeholder="e.g. 150000 (Empty for unlimited)"
              />
            </div>

            <div className="space-y-2">
              <Label>Limit Currency</Label>
              <Select 
                value={tierFormData.annual_aggregate_limit_currency}
                onValueChange={(v: string) => setTierFormData({ ...tierFormData, annual_aggregate_limit_currency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Regional Scope</Label>
              <Select 
                value={tierFormData.regional_scope}
                onValueChange={(v: string) => setTierFormData({ ...tierFormData, regional_scope: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="worldwide_ex_us">Worldwide (Ex. US)</SelectItem>
                  <SelectItem value="worldwide_incl_us">Worldwide (Incl. US)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Medical Network</Label>
              <Select 
                value={tierFormData.network_id}
                onValueChange={(v: string) => setTierFormData({ ...tierFormData, network_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select Network" /></SelectTrigger>
                <SelectContent>
                  {networks.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {viewLang === 'ar' ? n.name_ar : n.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select 
                value={tierFormData.card_type}
                onValueChange={(v: string) => setTierFormData({ ...tierFormData, card_type: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tBuilder.validityPeriod}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="date"
                  value={tierFormData.policy_start_date}
                  onChange={e => setTierFormData({ ...tierFormData, policy_start_date: e.target.value })}
                />
                <Input 
                  type="date"
                  value={tierFormData.policy_end_date}
                  onChange={e => setTierFormData({ ...tierFormData, policy_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50/50 col-span-1 md:col-span-2 select-none mt-2">
              <Switch 
                checked={tierFormData.referral_letter}
                onCheckedChange={checked => setTierFormData({ ...tierFormData, referral_letter: checked })}
              />
              <Label className="font-bold text-slate-700">{tBuilder.referralLetter}</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setTierDialogOpen(false)} disabled={tierSubmitting}>
              {tBuilder.cancel}
            </Button>
            <Button type="submit" disabled={tierSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {tierSubmitting ? "Creating..." : tBuilder.create}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* CLONE/DUPLICATE TIER DIALOG */}
      <FormDialog
        open={dupDialogOpen}
        onOpenChange={setDupDialogOpen}
        title={tBuilder.dupTitle}
        size="default"
      >
        <form onSubmit={handleDuplicateTier} className="space-y-5 py-2">
          <div className="p-4 bg-slate-50 border rounded-xl space-y-1 text-xs">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Source Plan Tier:</p>
            <p className="font-bold text-slate-800">
              {viewLang === 'ar' ? selectedTier?.tier_name_ar : selectedTier?.tier_name_en}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{tBuilder.tierNameEn}</Label>
            <Input 
              value={dupFormData.tier_name_en}
              onChange={e => setDupFormData({ ...dupFormData, tier_name_en: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{tBuilder.tierNameAr}</Label>
            <Input 
              value={dupFormData.tier_name_ar}
              onChange={e => setDupFormData({ ...dupFormData, tier_name_ar: e.target.value })}
              className="font-arabic"
              dir="rtl"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDupDialogOpen(false)} disabled={dupSubmitting}>
              {tBuilder.cancel}
            </Button>
            <Button type="submit" disabled={dupSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {dupSubmitting ? "Duplicating..." : tBuilder.dupSubmit}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* COMBINED POOL CREATION/EDIT DIALOG */}
      <FormDialog
        open={poolDialogOpen}
        onOpenChange={setPoolDialogOpen}
        title={poolFormData.id ? "Edit Combined Pool" : "Add Combined Pool"}
        size="default"
      >
        <form onSubmit={handleSavePool} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Pool Name (English) *</Label>
            <Input 
              value={poolFormData.pool_name_en}
              onChange={e => setPoolFormData({ ...poolFormData, pool_name_en: e.target.value })}
              placeholder="e.g. Combined Dental & Optical"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Pool Name (Arabic) *</Label>
            <Input 
              value={poolFormData.pool_name_ar}
              onChange={e => setPoolFormData({ ...poolFormData, pool_name_ar: e.target.value })}
              className="font-arabic"
              dir="rtl"
              placeholder="مثال: مجمع الأسنان والنظارات"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tBuilder.poolLimit}</Label>
              <Input 
                type="number"
                value={poolFormData.pool_limit_value}
                onChange={e => setPoolFormData({ ...poolFormData, pool_limit_value: e.target.value })}
                placeholder="e.g. 10000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select 
                value={poolFormData.pool_limit_currency}
                onValueChange={(v: string) => setPoolFormData({ ...poolFormData, pool_limit_currency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tBuilder.poolBasis}</Label>
              <Select 
                value={poolFormData.pool_basis}
                onValueChange={(v: string) => setPoolFormData({ ...poolFormData, pool_basis: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual / سنوي</SelectItem>
                  <SelectItem value="per_case">Per Case / لكل حالة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tBuilder.poolRule}</Label>
              <Select 
                value={poolFormData.depletion_rule}
                onValueChange={(v: string) => setPoolFormData({ ...poolFormData, depletion_rule: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_come_first_served">First Come First Served</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setPoolDialogOpen(false)} disabled={poolSubmitting}>
              {tBuilder.cancel}
            </Button>
            <Button type="submit" disabled={poolSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {poolSubmitting ? "Saving..." : tBuilder.savePool}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* PRINT TABLE OF BENEFITS PREVIEW DIALOG */}
      <FormDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        title="Print Preview - Table of Benefits"
        size="xl"
      >
        <div className="py-2 space-y-4">
          <div className="flex justify-end border-b pb-3">
            <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2">
              <Printer className="w-4 h-4" /> Print Document / Export PDF
            </Button>
          </div>
          
          <div className="p-8 bg-white text-slate-900 border rounded-xl max-h-[70vh] overflow-y-auto print:max-h-none print:border-none print:p-0" id="print-tob-container">
            <PrintTableOfBenefits 
              tier={selectedTier} 
              configs={configs}
              oonRules={oonRules}
              pools={pools}
              doctorConfig={null}
              categories={categories}
              definitions={benefitDefs}
              initialLang={viewLang}
              hideLangSwitcher={true}
            />
          </div>
        </div>
      </FormDialog>

    </div>
  );
}
