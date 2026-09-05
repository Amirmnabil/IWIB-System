'use client';

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { 
  Building2, Plus, Shield, ListTree, DollarSign, 
  Settings, Clock, Percent, ClipboardList, HelpCircle, 
  Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  Loader2, Info, ChevronDown, ChevronRight, Copy, Printer, Network, Globe, CreditCard, Search, FolderOpen, Undo2, Redo2, ArrowLeft, Stethoscope, MapPin, CalendarDays
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

  // Navigation View State: 'list' (Main page plan list) | 'details' (Medical benefits matrix)
  const [activeView, setActiveView] = useState<'list' | 'details'>('list');
  const [planSearchQuery, setPlanSearchQuery] = useState("");

  const tBuilder = {
    en: {
      pageTitle: "Benefits Schedules & Plans",
      title: "Plans & Benefits Matrix",
      createTier: "Create Plan",
      cloneTier: "Clone Plan",
      printPlan: "Print Plan",
      planTiers: "Plans",
      activeTier: "Active Plan Profile",
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
      saveConfig: "Save Configuration",
      tierNameEn: "Plan Name (English) *",
      tierNameAr: "Plan Name (Arabic) *",
      limitValue: "Limit Value",
      currency: "Limit Currency",
      scope: "Regional Scope",
      validityPeriod: "Validity Period",
      cancel: "Cancel",
      submit: "Submit",
      savePlan: "Save Plan",
      create: "Submit",
      dupTitle: "Duplicate Plan",
      dupSubmit: "Duplicate Plan",
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
      tabMatrix: "Benefits Spreadsheet Matrix",
      tabPools: "Shared pools & containers",
      tabReimb: "Reimbursement Rules",
      backToList: "Back to Plans List",
      configureBenefits: "Configure Medical Benefits",
      searchPlansPlaceholder: "Search plans by name, network, or limit...",
      saving: "Auto-saving changes...",
      saved: "All changes saved",
    },
    ar: {
      pageTitle: "جدول المنافع والخطط الطبية",
      title: "مصفوفة خطط ومنافع التأمين",
      createTier: "إنشاء خطة جديدة",
      cloneTier: "نسخ الخطة",
      printPlan: "طباعة الجدول",
      planTiers: "خطط التأمين",
      activeTier: "ملف الخطة الحالية",
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
      saveConfig: "حفظ الإعدادات",
      tierNameEn: "اسم الخطة (إنجليزي) *",
      tierNameAr: "اسم الخطة (عربي) *",
      limitValue: "قيمة الحد الأقصى",
      currency: "العملة",
      scope: "النطاق الجغرافي",
      validityPeriod: "فترة التغطية",
      cancel: "إلغاء",
      submit: "إرسال",
      savePlan: "حفظ الخطة",
      create: "إرسال",
      dupTitle: "نسخ خطة تأمينية",
      dupSubmit: "نسخ الخطة",
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
      tabMatrix: "جدول مصفوفة المنافع",
      tabPools: "الأوعية والمجمعات المشتركة",
      tabReimb: "قواعد استرداد المصاريف",
      backToList: "العودة لقائمة الخطط",
      configureBenefits: "تحديد المنافع الطبية",
      searchPlansPlaceholder: "البحث في الخطط حسب الاسم، الشبكة الطبية، أو الحد...",
      saving: "جاري حفظ التغييرات تلقائياً...",
      saved: "تم حفظ جميع التغييرات",
    }
  }[viewLang];

  // Selected entities
  const [selectedTierId, setSelectedTierId] = useState<string>("");

  // Master Data lists
  const [networks, setNetworks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [benefitDefs, setBenefitDefs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  // Selected Tier Data
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [pools, setPools] = useState<any[]>([]);
  const [oonRules, setOonRules] = useState<Record<string, any>>({});

  // UI state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // History stack for Undo/Redo
  const [undoStack, setUndoStack] = useState<Record<string, any>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, any>[]>([]);

  // Auto-save feedback indicators
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [tierFormData, setTierFormData] = useState({
    tier_name_en: "",
    tier_name_ar: "",
    annual_aggregate_limit_value: "",
    annual_aggregate_limit_currency: "EGP",
    regional_scope: "local" as any,
    network_id: "",
    policy_id: "",
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
  const [poolSearchText, setPoolSearchText] = useState("");
  const [poolFormData, setPoolFormData] = useState({
    id: "",
    pool_name_en: "",
    pool_name_ar: "",
    pool_limit_value: "",
    pool_limit_currency: "EGP",
    pool_basis: "annual" as any,
    depletion_rule: "first_come_first_served",
    selected_benefit_ids: [] as string[]
  });

  // Doctor on Site (DOS) state
  const [doctorConfig, setDoctorConfig] = useState<any>({
    is_enabled: false,
    visits_per_week: 1,
    number_of_locations: 1,
    location_en: "",
    location_ar: "",
    schedule_en: "",
    schedule_ar: "",
    scope_of_service: "general_consultation",
    cost_model: "fixed_retainer"
  });
  const [dosTargetTierIds, setDosTargetTierIds] = useState<string[]>([]);

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

      const polsRes = await fetch("/api/policies");
      const polsData = await polsRes.json();
      setPolicies(polsData.data || []);

    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching catalogues", description: err.message });
    }
  };

  // 2. Fetch Tiers (Global levels via Admin API)
  const fetchTiers = async () => {
    try {
      const res = await fetch("/api/plan-tiers");
      const resData = await res.json();
      const data = resData.data || [];
      setTiers(data);
      if (data && data.length > 0 && !selectedTierId) {
        setSelectedTierId(data[0].id);
      }
      return data;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Tiers fetch failed", description: err.message });
      return [];
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchTiers();
  }, []);

  // 3. Fetch Selected Tier Detailed Configs via Admin API
  const fetchTierDetails = async (tierId: string) => {
    if (!tierId) {
      setSelectedTier(null);
      setConfigs({});
      setPools([]);
      setOonRules({});
      setDosTargetTierIds([]);
      setDoctorConfig({
        is_enabled: false,
        visits_per_week: 1,
        number_of_locations: 1,
        location_en: "",
        location_ar: "",
        schedule_en: "",
        schedule_ar: "",
        scope_of_service: "general_consultation",
        cost_model: "fixed_retainer"
      });
      return;
    }

    try {
      const tierObj = tiers.find(t => t.id === tierId) || null;
      setSelectedTier(tierObj);

      if (tierObj?.policy_id) {
        const policyLinkedTiers = tiers.filter(t => t.policy_id === tierObj.policy_id);
        setDosTargetTierIds(policyLinkedTiers.map(t => t.id));
      } else {
        setDosTargetTierIds([tierId]);
      }

      if (tierObj) {
        setReimbForm({
          reimbursement_covered: tierObj.reimbursement_covered || false,
          reimbursement_percent: String(tierObj.reimbursement_percent || 80),
          reimbursement_price_list_id: tierObj.reimbursement_price_list_id || "none"
        });
      }

      const res = await fetch(`/api/plan-tiers/details?tier_id=${tierId}`);
      const resData = await res.json();

      setPools(resData.pools || []);

      const confMap: Record<string, any> = {};
      resData.configs?.forEach((c: any) => {
        confMap[c.benefit_id] = c;
      });
      setConfigs(confMap);

      const oonMap: Record<string, any> = {};
      resData.oonRules?.forEach((r: any) => {
        oonMap[r.plan_benefit_config_id] = r;
      });
      setOonRules(oonMap);

      if (resData.doctorConfig) {
        setDoctorConfig(resData.doctorConfig);
      } else {
        setDoctorConfig({
          is_enabled: false,
          visits_per_week: 1,
          number_of_locations: 1,
          location_en: "",
          location_ar: "",
          schedule_en: "",
          schedule_ar: "",
          scope_of_service: "general_consultation",
          cost_model: "fixed_retainer"
        });
      }

    } catch (err: any) {
      toast({ variant: "destructive", title: "Tier details failed", description: err.message });
    }
  };

  const handleSaveDoctorConfig = async (updatedFields?: Partial<any>) => {
    if (!selectedTierId) return;
    setIsSaving(true);
    try {
      const payload = {
        ...(doctorConfig || {}),
        ...(updatedFields || {}),
        tier_id: selectedTierId,
        target_tier_ids: dosTargetTierIds.length > 0 ? dosTargetTierIds : [selectedTierId]
      };
      const res = await fetch("/api/plan-tiers/doctor-on-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || "Save failed");

      setDoctorConfig(resData.data);
      toast({ 
        title: viewRtl ? "تم حفظ وتطبيق إعدادات طبيب الموقع (DOS) على الخطط المحددة بنجاح!" : "Doctor on Site (DOS) settings saved & combined across selected plans!",
        className: "bg-emerald-600 text-white font-bold"
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (selectedTierId) {
      fetchTierDetails(selectedTierId);
    }
  }, [selectedTierId, tiers]);

  // 4. Save Tier general fields automatically
  const handleSaveTierField = async (fieldName: string, value: any) => {
    if (!selectedTierId || !selectedTier) return;
    setIsSaving(true);
    try {
      const payload = {
        id: selectedTierId,
        [fieldName]: value,
        updated_at: new Date().toISOString()
      };
      const res = await fetch("/api/plan-tiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || "Update failed");

      // Local sync
      setSelectedTier({ ...selectedTier, [fieldName]: value });
      setTiers(prev => prev.map(t => t.id === selectedTierId ? { ...t, [fieldName]: value } : t));
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
        id: selectedTierId,
        reimbursement_covered: updated.reimbursement_covered,
        reimbursement_percent: Number(updated.reimbursement_percent) || 80,
        reimbursement_price_list_id: updated.reimbursement_price_list_id === "none" ? null : updated.reimbursement_price_list_id,
        updated_at: new Date().toISOString()
      };

      const res = await fetch("/api/plan-tiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || "Reimbursement update failed");

      toast({ title: "Reimbursement settings saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reimbursement update failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Inline Grid Configuration Editor Auto-Save
  const handleUpdateConfigValue = async (benefitId: string, updatedFields: Record<string, any>) => {
    if (!selectedTierId) return;

    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(configs))]);
    setRedoStack([]);

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
        coverage_scope_type: mergedConfig.coverage_scope_type === 'specific_count' ? 'specific_number' : mergedConfig.coverage_scope_type === 'specific_percentage' ? 'percentage' : (mergedConfig.coverage_scope_type || "all"),
        coverage_scope_value: mergedConfig.coverage_scope_value !== undefined && mergedConfig.coverage_scope_value !== "" && mergedConfig.coverage_scope_value !== null ? Number(mergedConfig.coverage_scope_value) : null,
        accommodation_category: mergedConfig.accommodation_category || null,
        max_icu_days: mergedConfig.max_icu_days !== undefined && mergedConfig.max_icu_days !== "" && mergedConfig.max_icu_days !== null ? Number(mergedConfig.max_icu_days) : null,
        special_coverage_type: mergedConfig.special_coverage_type || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("plan_benefit_config")
        .upsert(payload, { onConflict: "tier_id,benefit_id" })
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id) {
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

  // Explicit Full Plan Save Action (Applies basic setting for any unconfigured benefits)
  const handleExplicitSavePlan = async () => {
    if (!selectedTierId) return;
    setIsSaving(true);
    try {
      // Build payloads with basic settings defaults for all active benefit definitions
      const payloadsToUpsert = benefitDefs.map(def => {
        const existing = configs[def.id] || {};
        const rowId = existing.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        }));

        return {
          id: rowId,
          tier_id: selectedTierId,
          benefit_id: def.id,
          coverage_status: existing.coverage_status || 'covered',
          limit_type: existing.limit_type === 'included_in_aal' ? 'full_cover' : (existing.limit_type || 'full_cover'),
          limit_value: existing.limit_value !== undefined && existing.limit_value !== "" && existing.limit_value !== null ? Number(existing.limit_value) : null,
          limit_currency: existing.limit_currency || 'EGP',
          limit_basis: existing.limit_basis || 'annual',
          payment_mechanism: existing.payment_mechanism || 'both',
          co_payment_percent: existing.co_payment_percent !== undefined && existing.co_payment_percent !== "" && existing.co_payment_percent !== null ? Number(existing.co_payment_percent) : 0,
          co_payment_cap: existing.co_payment_cap !== undefined && existing.co_payment_cap !== "" && existing.co_payment_cap !== null ? Number(existing.co_payment_cap) : null,
          network_scope: existing.network_scope || 'in_network_only',
          waiting_period_days: Number(existing.waiting_period_days) || 0,
          combined_pool_id: (existing.combined_pool_id && existing.combined_pool_id !== 'none') ? existing.combined_pool_id : null,
          coverage_scope_type: existing.coverage_scope_type || 'all',
          coverage_scope_value: existing.coverage_scope_value || null,
          accommodation_category: existing.accommodation_category || null,
          max_icu_days: existing.max_icu_days !== undefined && existing.max_icu_days !== "" && existing.max_icu_days !== null ? Number(existing.max_icu_days) : null,
          special_coverage_type: existing.special_coverage_type || null,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from("plan_benefit_config")
        .upsert(payloadsToUpsert, { onConflict: "tier_id,benefit_id" });

      if (error) throw error;

      await fetchTierDetails(selectedTierId);
      toast({ 
        title: viewRtl ? "تم تطبيق الإعدادات الأساسية وحفظ الخطة بجميع منافعها الطبية بنجاح!" : "Basic settings applied & Plan saved successfully!", 
        className: "bg-emerald-600 text-white font-bold" 
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Plan Tier
  const handleDeleteTier = async (tierId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(viewRtl ? "هل أنت تأكد من رغبتك في حذف هذه الخطة؟" : "Are you sure you want to delete this plan?")) return;
    try {
      const { error } = await supabase.from("plan_tiers").delete().eq("id", tierId);
      if (error) throw error;
      toast({ title: viewRtl ? "تم حذف الخطة بنجاح" : "Plan deleted successfully" });
      const updated = await fetchTiers();
      if (selectedTierId === tierId) {
        setSelectedTierId(updated[0]?.id || "");
        if (updated.length === 0) setActiveView("list");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    }
  };

  // Create Plan Handler (Submit Button Workflow)
  const handleAddNewTier = () => {
    setEditingTierId(null);
    setTierFormData({
      tier_name_en: "",
      tier_name_ar: "",
      annual_aggregate_limit_value: "",
      annual_aggregate_limit_currency: "EGP",
      regional_scope: "local",
      network_id: networks[0]?.id || "",
      policy_id: "",
      card_type: "electronic",
      policy_start_date: "",
      policy_end_date: "",
      referral_letter: false
    });
    setTierDialogOpen(true);
  };

  // Open Edit Plan Tier Dialog Handler
  const handleOpenEditTier = (tierToEdit?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tObj = tierToEdit || selectedTier;
    if (!tObj) return;

    setEditingTierId(tObj.id);
    setTierFormData({
      tier_name_en: tObj.tier_name_en || "",
      tier_name_ar: tObj.tier_name_ar || "",
      annual_aggregate_limit_value: tObj.annual_aggregate_limit_value !== null && tObj.annual_aggregate_limit_value !== undefined ? String(tObj.annual_aggregate_limit_value) : "",
      annual_aggregate_limit_currency: tObj.annual_aggregate_limit_currency || "EGP",
      regional_scope: tObj.regional_scope || "local",
      network_id: tObj.network_id || networks[0]?.id || "",
      policy_id: tObj.policy_id || "",
      card_type: tObj.card_type || "electronic",
      policy_start_date: tObj.policy_start_date || "",
      policy_end_date: tObj.policy_end_date || "",
      referral_letter: Boolean(tObj.referral_letter)
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
        annual_aggregate_limit_currency: tierFormData.annual_aggregate_limit_currency || "EGP",
        regional_scope: tierFormData.regional_scope || "local",
        network_id: (!tierFormData.network_id || tierFormData.network_id === "none") ? null : tierFormData.network_id,
        policy_id: (!tierFormData.policy_id || tierFormData.policy_id === "none") ? null : tierFormData.policy_id,
        card_type: tierFormData.card_type || "electronic",
        policy_start_date: tierFormData.policy_start_date || null,
        policy_end_date: tierFormData.policy_end_date || null,
        referral_letter: Boolean(tierFormData.referral_letter)
      };

      if (editingTierId) {
        // UPDATE existing plan tier
        const res = await fetch("/api/plan-tiers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingTierId, ...payload })
        });
        const resData = await res.json();
        if (!res.ok || resData.error) {
          throw new Error(resData.error || "Failed to update plan tier");
        }

        setTierDialogOpen(false);
        await fetchTiers();
        if (selectedTierId === editingTierId) {
          setSelectedTier((prev: any) => ({ ...prev, ...payload }));
        }
        toast({ 
          title: viewRtl ? "تم تحديث اسم وإعدادات الخطة بنجاح!" : "Plan tier name & settings updated successfully!",
          className: "bg-emerald-600 text-white font-bold"
        });
      } else {
        // CREATE new plan tier
        const res = await fetch("/api/plan-tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const resData = await res.json();
        if (!res.ok || resData.error) {
          throw new Error(resData.error || "Failed to create plan");
        }
        const data = resData.data;

        setTierDialogOpen(false);
        await fetchTiers();
        if (data?.id) {
          setSelectedTierId(data.id);
          setActiveView("details");
        }
        toast({ 
          title: viewRtl ? "تم إرسال الخطة! يرجى تحديد المنافع الطبية الآن ثم الضغط على حفظ الخطة" : "Plan submitted! Configure medical benefits now and click Save Plan.",
          className: "bg-indigo-600 text-white font-bold"
        });
      }
    } catch (err: any) {
      console.error("Save plan tier error:", err);
      toast({ variant: "destructive", title: "Operation failed", description: err.message || "Failed to save plan tier" });
    } finally {
      setTierSubmitting(false);
    }
  };

  const handleOpenDuplicate = (tierIdToDup?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sourceId = tierIdToDup || selectedTierId;
    if (!sourceId) return;
    const targetTierObj = tiers.find(t => t.id === sourceId) || selectedTier;
    setDupFormData({
      source_tier_id: sourceId,
      tier_name_en: `${targetTierObj?.tier_name_en || ''} - Copy`,
      tier_name_ar: `${targetTierObj?.tier_name_ar || ''} - نسخة`,
    });
    setDupDialogOpen(true);
  };

  const handleDuplicateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setDupSubmitting(true);
    try {
      const sourceTierObj = tiers.find(t => t.id === dupFormData.source_tier_id) || selectedTier;
      const targetTier = {
        tier_name_en: dupFormData.tier_name_en,
        tier_name_ar: dupFormData.tier_name_ar,
        annual_aggregate_limit_value: sourceTierObj.annual_aggregate_limit_value,
        annual_aggregate_limit_currency: sourceTierObj.annual_aggregate_limit_currency,
        regional_scope: sourceTierObj.regional_scope,
        network_id: sourceTierObj.network_id,
        card_type: sourceTierObj.card_type,
        policy_start_date: sourceTierObj.policy_start_date,
        policy_end_date: sourceTierObj.policy_end_date,
        referral_letter: sourceTierObj.referral_letter,
        reimbursement_covered: sourceTierObj.reimbursement_covered,
        reimbursement_percent: sourceTierObj.reimbursement_percent,
        reimbursement_price_list_id: sourceTierObj.reimbursement_price_list_id
      };

      const res = await fetch("/api/plan-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetTier)
      });
      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || "Duplicate plan failed");
      const newTier = resData.data;

      // Duplicate combined pools
      const { data: sourcePools } = await supabase.from("combined_pools").select("*").eq("tier_id", dupFormData.source_tier_id);
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

      // Duplicate plan configs
      const { data: sourceConfigs } = await supabase.from("plan_benefit_config").select("*").eq("tier_id", dupFormData.source_tier_id);

      if (sourceConfigs && sourceConfigs.length > 0) {
        const clonedPayloads = sourceConfigs.map((c: any) => {
          const { id, created_at, updated_at, ...rest } = c;
          return {
            ...rest,
            tier_id: newTier.id,
            combined_pool_id: c.combined_pool_id ? poolIdMap[c.combined_pool_id] || null : null
          };
        });

        const { error } = await supabase.from("plan_benefit_config").upsert(clonedPayloads, { onConflict: "tier_id,benefit_id" });
        if (error) throw error;
      }

      toast({ title: "Plan duplicated successfully" });
      setDupDialogOpen(false);
      await fetchTiers();
      setSelectedTierId(newTier.id);
      setActiveView("details");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Duplication failed", description: err.message });
    } finally {
      setDupSubmitting(false);
    }
  };

  // Pools Handlers
  const handleOpenAddPool = () => {
    setPoolFormData({
      id: "",
      pool_name_en: "",
      pool_name_ar: "",
      pool_limit_value: "",
      pool_limit_currency: selectedTier?.annual_aggregate_limit_currency || "EGP",
      pool_basis: "annual",
      depletion_rule: "first_come_first_served",
      selected_benefit_ids: []
    });
    setPoolDialogOpen(true);
  };

  const handleOpenEditPool = (pool: any) => {
    const linkedBenefitIds = Object.values(configs)
      .filter((c: any) => c.combined_pool_id === pool.id)
      .map((c: any) => c.benefit_id);

    setPoolFormData({
      id: pool.id,
      pool_name_en: pool.pool_name_en || "",
      pool_name_ar: pool.pool_name_ar || "",
      pool_limit_value: pool.pool_limit_value || "",
      pool_limit_currency: pool.pool_limit_currency || "EGP",
      pool_basis: pool.pool_basis || "annual",
      depletion_rule: pool.depletion_rule || "first_come_first_served",
      selected_benefit_ids: linkedBenefitIds
    });
    setPoolDialogOpen(true);
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTierId) return;
    if (!poolFormData.pool_name_en || !poolFormData.pool_limit_value) {
      toast({ variant: "destructive", title: "Pool name & limit value required" });
      return;
    }

    setPoolSubmitting(true);
    try {
      const payload = {
        tier_id: selectedTierId,
        pool_name_en: poolFormData.pool_name_en,
        pool_name_ar: poolFormData.pool_name_ar || poolFormData.pool_name_en,
        pool_limit_value: Number(poolFormData.pool_limit_value),
        pool_limit_currency: poolFormData.pool_limit_currency,
        pool_basis: poolFormData.pool_basis,
        depletion_rule: poolFormData.depletion_rule,
        updated_at: new Date().toISOString()
      };

      let activePoolId = poolFormData.id;

      if (activePoolId) {
        const { error } = await supabase.from("combined_pools").update(payload).eq("id", activePoolId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("combined_pools").insert(payload).select("id").single();
        if (error) throw error;
        activePoolId = data.id;
      }

      // Update linked benefit configs
      const currentLinkedIds = Object.values(configs)
        .filter((c: any) => c.combined_pool_id === activePoolId)
        .map((c: any) => c.benefit_id);

      const targetSelectedIds = new Set(poolFormData.selected_benefit_ids);

      for (const bId of currentLinkedIds) {
        if (!targetSelectedIds.has(bId)) {
          await handleUpdateConfigValue(bId, { combined_pool_id: null });
        }
      }

      for (const bId of poolFormData.selected_benefit_ids) {
        await handleUpdateConfigValue(bId, { combined_pool_id: activePoolId });
      }

      toast({ title: "Pool saved successfully with selected benefits" });
      setPoolDialogOpen(false);
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Pool save failed", description: err.message });
    } finally {
      setPoolSubmitting(false);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm("Are you sure you want to delete this combined pool?")) return;
    try {
      const linkedIds = Object.values(configs)
        .filter((c: any) => c.combined_pool_id === poolId)
        .map((c: any) => c.benefit_id);

      for (const bId of linkedIds) {
        await handleUpdateConfigValue(bId, { combined_pool_id: null });
      }

      const { error } = await supabase.from("combined_pools").delete().eq("id", poolId);
      if (error) throw error;

      toast({ title: "Pool deleted" });
      fetchTierDetails(selectedTierId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete pool failed", description: err.message });
    }
  };

  // Sort categories: Inpatient (1), Outpatient (2), Dental Care (3), Optical Care (4), Pregnancy/Maternity (5), Special Conditions (6)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const getRank = (cat: any) => {
        const name = ((cat.name_en || '') + ' ' + (cat.name_ar || '')).toLowerCase();
        if (name.includes('inpatient') || name.includes('داخلي')) return 1;
        if (name.includes('outpatient') || name.includes('خارجية')) return 2;
        if (name.includes('dental') || name.includes('أسنان')) return 3;
        if (name.includes('optical') || name.includes('بصريات') || name.includes('نظارات')) return 4;
        if (name.includes('pregnancy') || name.includes('maternity') || name.includes('حمل')) return 5;
        if (name.includes('special') || name.includes('خاصة')) return 6;
        return 99;
      };
      return getRank(a) - getRank(b);
    });
  }, [categories]);

  // Grouping benefits logic mapping categories -> parents -> children
  const groupedBenefits = useMemo(() => {
    const map: Record<string, { parent: any; children: any[] }[]> = {};
    categories.forEach(cat => {
      map[cat.id] = [];
    });

    const parents = benefitDefs.filter(d => d.parent_benefit_id === null);

    parents.forEach(parent => {
      // Remove Room Accommodation & Nursing from top level of Inpatient treatment as it is configured under Surgical Procedures
      const pNameEn = (parent.name_en || '').toLowerCase();
      const pNameAr = (parent.name_ar || '').toLowerCase();
      const isTopRoomAccommodation = (pNameEn.includes('room accommodation') || (pNameAr.includes('إقامة') && pNameAr.includes('تمريض'))) && (parent.id === '10000000-0000-0000-0000-000000000001');
      if (isTopRoomAccommodation) return;

      const children = benefitDefs.filter(d => d.parent_benefit_id === parent.id);
      if (!map[parent.category_id]) {
        map[parent.category_id] = [];
      }
      map[parent.category_id].push({
        parent,
        children
      });
    });

    return map;
  }, [categories, benefitDefs]);

  // Filter plans for main list view
  const filteredTiers = useMemo(() => {
    if (!planSearchQuery) return tiers;
    const q = planSearchQuery.toLowerCase();
    return tiers.filter(t => 
      t.tier_name_en?.toLowerCase().includes(q) ||
      t.tier_name_ar?.toLowerCase().includes(q) ||
      t.regional_scope?.toLowerCase().includes(q) ||
      t.medical_networks?.name_en?.toLowerCase().includes(q) ||
      t.medical_networks?.name_ar?.toLowerCase().includes(q)
    );
  }, [tiers, planSearchQuery]);

  // Category & completion stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { configured: number; total: number; percent: number }> = {};

    categories.forEach(cat => {
      const itemsInCat = benefitDefs.filter(d => d.category_id === cat.id);
      let configuredCount = 0;
      itemsInCat.forEach(d => {
        const conf = configs[d.id];
        if (conf && conf.coverage_status) configuredCount++;
      });
      const total = itemsInCat.length;
      const percent = total > 0 ? Math.round((configuredCount / total) * 100) : 0;
      stats[cat.id] = { configured: configuredCount, total, percent };
    });

    return stats;
  }, [categories, benefitDefs, configs]);

  const completionStats = useMemo(() => {
    const totalDefs = benefitDefs.length;
    if (totalDefs === 0) return { percent: 0, count: 0, total: 0 };
    const configuredCount = Object.keys(configs).length;
    const percent = Math.min(100, Math.round((configuredCount / totalDefs) * 100));
    return { percent, count: configuredCount, total: totalDefs };
  }, [benefitDefs, configs]);

  const renderStayIcuCustomCell = (benefit: any, conf: any) => {
    const nameEn = (benefit.name_en || '').toLowerCase();
    const nameAr = (benefit.name_ar || '').toLowerCase();

    const isSurgicalProcedures = nameEn.includes('surgical procedure') || nameEn.includes('surgical procedures') || nameAr.includes('إجراءات جراحية') || nameAr.includes('اجراءات جراحية') || (nameEn === 'surgical procedures') || (nameAr === 'جراحة');
    const isRoomAccommodation = !isSurgicalProcedures && (nameEn.includes('room') || nameEn.includes('accommodation') || nameAr.includes('إقامة') || nameAr.includes('اقامة'));
    const isIcuStay = nameEn.includes('intensive care') || nameEn.includes('icu') || nameAr.includes('عناية مرك');

    if (isIcuStay) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 shrink-0">Max Days:</span>
          <Input 
            type="number"
            value={conf.max_icu_days !== undefined && conf.max_icu_days !== null ? conf.max_icu_days : ""}
            onChange={e => handleUpdateConfigValue(benefit.id, { max_icu_days: e.target.value })}
            placeholder="Days"
            className="h-7 text-xs w-24 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      );
    }

    if (isRoomAccommodation) {
      return (
        <select
          value={conf.accommodation_category || ""}
          onChange={e => handleUpdateConfigValue(benefit.id, { accommodation_category: e.target.value || null })}
          className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-semibold"
        >
          <option value="">{viewRtl ? "-- اختر درجة الإقامة --" : "-- Select Room Class --"}</option>
          <option value="standard_private">{viewRtl ? "درجة أولى ممتازة" : "Standard Private"}</option>
          <option value="semi_private">{viewRtl ? "درجة ثانية (مزدوجة)" : "Semi-Private"}</option>
          <option value="suite">{viewRtl ? "جناح" : "Suite"}</option>
          <option value="vip">{viewRtl ? "جناح ملكي (VIP)" : "VIP Suite"}</option>
        </select>
      );
    }

    return null;
  };

  return (
    <div dir={viewRtl ? "rtl" : "ltr"} className={cn("container mx-auto py-6 space-y-6", viewRtl ? "font-arabic" : "font-sans")}>
      
      {/* 1. TOP TITLE BANNER (WHITE FONT, NO SUBTITLE) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">{tBuilder.pageTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Language Switcher */}
          <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
            <button 
              onClick={() => setViewLang('en')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", viewLang === 'en' ? "bg-white text-slate-900 shadow-md" : "text-slate-300 hover:text-white")}
            >
              English View
            </button>
            <button 
              onClick={() => setViewLang('ar')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-arabic", viewLang === 'ar' ? "bg-white text-slate-900 shadow-md" : "text-slate-300 hover:text-white")}
            >
              العربية
            </button>
          </div>

          <Button 
            onClick={handleAddNewTier}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 h-10 rounded-xl shadow-lg shadow-indigo-900/40"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {tBuilder.createTier}
          </Button>
        </div>
      </div>

      {/* 2. MAIN PAGE NAVIGATION VIEWS */}
      
      {/* VIEW LEVEL 1: PLANS LIST VIEW (CARD BELOW CARD) */}
      {activeView === 'list' && (
        <div className="space-y-6">
          {/* Search bar & List Filter */}
          <div className="bg-white p-4 border rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative grow max-w-xl w-full">
              <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
              <Input 
                placeholder={tBuilder.searchPlansPlaceholder}
                value={planSearchQuery}
                onChange={e => setPlanSearchQuery(e.target.value)}
                className="h-10 text-xs pl-9 rounded-xl border-slate-200"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              {filteredTiers.length} {viewRtl ? "خطط معرفة" : "Plans Available"}
            </div>
          </div>

          {/* Vertical List of Plan Cards */}
          {filteredTiers.length === 0 ? (
            <Card className="border-dashed border-2 p-12 text-center bg-slate-50/50 rounded-3xl">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">{viewRtl ? "لا توجد خطط حالياً" : "No Plans Found"}</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">{viewRtl ? "انقر على زر إنشاء خطة جديدة للبدء" : "Click Create Plan to configure medical insurance schedules."}</p>
              <Button onClick={handleAddNewTier} className="bg-indigo-600 text-white font-bold text-xs">
                <Plus className="w-4 h-4 mr-1.5" /> {tBuilder.createTier}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTiers.map(t => {
                const networkName = t.medical_networks ? (viewRtl ? t.medical_networks.name_ar : t.medical_networks.name_en) : tBuilder.none;
                return (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setSelectedTierId(t.id);
                      setActiveView('details');
                    }}
                    className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Plan basic info */}
                    <div className="space-y-2 grow">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {viewRtl ? t.tier_name_ar : t.tier_name_en}
                        </h3>
                        {t.tier_name_ar && t.tier_name_en && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({viewRtl ? t.tier_name_en : t.tier_name_ar})
                          </span>
                        )}
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] uppercase font-bold">
                          {t.regional_scope}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-slate-700">{networkName}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <span>{tBuilder.annualLimit}: <strong>{t.annual_aggregate_limit_value ? `${t.annual_aggregate_limit_value.toLocaleString()} ${t.annual_aggregate_limit_currency || 'EGP'}` : tBuilder.unlimited}</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-sky-500" />
                          <span>{tBuilder.cardType}: <strong className="capitalize">{t.card_type}</strong></span>
                        </div>

                        {t.referral_letter && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]" variant="outline">
                            {tBuilder.referralLetter}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTierId(t.id);
                          setActiveView('details');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9 px-4"
                      >
                        {tBuilder.configureBenefits}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleOpenEditTier(t, e)}
                        className="h-9 px-3 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 border-indigo-200 font-bold"
                        title="Edit Plan Tier Name & Settings"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleOpenDuplicate(t.id, e)}
                        className="h-9 px-3 text-slate-600 hover:text-indigo-600"
                        title={tBuilder.cloneTier}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteTier(t.id, e)}
                        className="h-9 px-3 text-red-500 hover:bg-red-50 hover:text-red-700 border-slate-200"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW LEVEL 2: PLAN DETAILS & MEDICAL BENEFITS SELECTION MATRIX */}
      {activeView === 'details' && (
        <div className="space-y-6">
          {/* Back button & Details Header Bar */}
          <div className="bg-white p-4 border rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 grow flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveView('list')}
                className="h-9 font-bold text-xs text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {tBuilder.backToList}
              </Button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
              
              {/* Editable Plan Tier Name Bar */}
              <div className="flex items-center gap-3 grow flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EN:</span>
                  <Input 
                    value={selectedTier?.tier_name_en || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedTier((prev: any) => prev ? { ...prev, tier_name_en: val } : prev);
                      setTiers(prev => prev.map(t => t.id === selectedTierId ? { ...t, tier_name_en: val } : t));
                    }}
                    onBlur={e => handleSaveTierField("tier_name_en", e.target.value)}
                    placeholder="Plan Name (English)"
                    className="h-9 font-black text-sm bg-white border-slate-200 focus:border-indigo-500 rounded-xl w-44 sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AR:</span>
                  <Input 
                    value={selectedTier?.tier_name_ar || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedTier((prev: any) => prev ? { ...prev, tier_name_ar: val } : prev);
                      setTiers(prev => prev.map(t => t.id === selectedTierId ? { ...t, tier_name_ar: val } : t));
                    }}
                    onBlur={e => handleSaveTierField("tier_name_ar", e.target.value)}
                    placeholder="اسم الخطة (عربي)"
                    dir="rtl"
                    className="h-9 font-bold text-sm bg-white border-slate-200 focus:border-indigo-500 rounded-xl w-44 sm:w-56 font-arabic"
                  />
                </div>

                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditTier(selectedTier)}
                  className="h-9 px-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-xs shrink-0"
                  title="Full Edit Plan Settings"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Settings
                </Button>
              </div>
            </div>

            {/* Explicit Save & Action buttons */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button 
                onClick={handleExplicitSavePlan}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {isSaving ? "Saving..." : tBuilder.savePlan}
              </Button>

              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleOpenDuplicate()}
                className="h-9 font-bold text-xs text-slate-700"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                {tBuilder.cloneTier}
              </Button>

              <Button 
                variant="outline"
                size="sm"
                onClick={() => setPrintDialogOpen(true)}
                className="h-9 font-bold text-xs text-slate-700"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                {tBuilder.printPlan}
              </Button>
            </div>
          </div>



          {/* MAIN CONFIGURATION TABS */}
          <Tabs defaultValue="matrix" className="w-full space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="matrix" className="rounded-lg text-xs font-bold">{tBuilder.tabMatrix}</TabsTrigger>
              <TabsTrigger value="pools" className="rounded-lg text-xs font-bold">{tBuilder.tabPools}</TabsTrigger>
              <TabsTrigger value="reimb" className="rounded-lg text-xs font-bold">{tBuilder.tabReimb}</TabsTrigger>
              <TabsTrigger value="dos" className="rounded-lg text-xs font-bold flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                {viewRtl ? "طبيب بالموقع (DOS)" : "Doctor on Site (DOS)"}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BENEFITS MATRIX SHEET */}
            <TabsContent value="matrix" className="space-y-4 outline-none">

              {/* Matrix spreadsheet table (No Search Box, No Checkbox Column, Dental & Optical above Pregnancy) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase tracking-wider">
                      <th className="p-3 text-left w-2/5 px-4">{tBuilder.matrixTitle}</th>
                      <th className="p-3 text-center w-48">{tBuilder.specialCoverageType}</th>
                      <th className="p-3 text-left w-64">{tBuilder.limitValue}</th>
                      <th className="p-3 text-center w-28">Co-pay (%)</th>
                      <th className="p-3 text-center w-52">{tBuilder.coverageScope}</th>
                      <th className="p-3 text-left w-56">Stay / ICU / Custom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedCategories.map(cat => {
                      const groupItems = groupedBenefits[cat.id] || [];
                      const isCollapsed = collapsedCategories[cat.id];
                      const catStat = categoryStats[cat.id] || { configured: 0, total: 0, percent: 0 };
                      
                      if (groupItems.length === 0) return null;

                      return (
                        <React.Fragment key={cat.id}>
                          {/* Category Progress Row */}
                          <tr 
                            onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                            className="bg-slate-50/60 hover:bg-slate-100/80 transition-colors cursor-pointer select-none border-t border-slate-200"
                          >
                            <td colSpan={2} className="p-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              <span className="text-sm font-black text-slate-900">{viewRtl ? cat.name_ar : cat.name_en}</span>
                              <Badge className="ml-2 bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px] font-bold" variant="outline">
                                {catStat.configured} / {catStat.total} {tBuilder.complete}
                              </Badge>
                            </td>
                            <td colSpan={4} className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="grow h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="bg-indigo-600 h-full transition-all" style={{ width: `${catStat.percent}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 shrink-0">{catStat.percent}%</span>
                              </div>
                            </td>
                          </tr>

                          {!isCollapsed && groupItems.map(({ parent, children }) => {
                            const parentConf = configs[parent.id] || {};
                            const isParentSpecial = cat.name_en.toLowerCase().includes('special') || parent.category_id === '00000000-0000-0000-0000-000000000006';
                            const normalizedScopeType = parentConf.coverage_scope_type === 'specific_count' ? 'specific_number' : parentConf.coverage_scope_type === 'specific_percentage' ? 'percentage' : (parentConf.coverage_scope_type || "all");

                            return (
                              <React.Fragment key={parent.id}>
                                {/* Parent benefit row */}
                                <tr className="hover:bg-slate-50/40 group transition-colors">
                                  <td className="p-3 px-4">
                                    <div className="font-bold text-slate-900">{viewRtl ? parent.name_ar : parent.name_en}</div>
                                  </td>
                                  
                                  {/* Coverage/Special type cell */}
                                  <td className="p-3">
                                    {isParentSpecial ? (
                                      <select
                                        value={parentConf.special_coverage_type || "full_coverage"}
                                        onChange={e => handleUpdateConfigValue(parent.id, { special_coverage_type: e.target.value, coverage_status: e.target.value === 'uncovered' ? 'not_covered' : 'covered' })}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
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
                                        value={parentConf.coverage_status || "covered"}
                                        onChange={e => handleUpdateConfigValue(parent.id, { coverage_status: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
                                      >
                                        <option value="covered">Covered</option>
                                        <option value="not_covered">Not Covered</option>
                                        <option value="conditional">Conditional</option>
                                      </select>
                                    )}
                                  </td>

                                  {/* Limit type & limit value */}
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={parentConf.limit_type === 'included_in_aal' ? 'full_cover' : (parentConf.limit_type || "full_cover")}
                                        onChange={e => handleUpdateConfigValue(parent.id, { limit_type: e.target.value })}
                                        className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium shrink-0"
                                      >
                                        <option value="full_cover">Full Cover</option>
                                        <option value="sub_limit">Sub-limit</option>
                                      </select>
                                      {parentConf.limit_type === 'sub_limit' && (
                                        <Input 
                                          type="number"
                                          value={parentConf.limit_value || ""}
                                          onChange={e => handleUpdateConfigValue(parent.id, { limit_value: e.target.value })}
                                          placeholder="Limit"
                                          className="h-8 text-xs w-28 bg-white rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      )}
                                    </div>
                                  </td>

                                  {/* Co-pay percent */}
                                  <td className="p-3 text-center">
                                    <Input 
                                      type="number"
                                      value={parentConf.co_payment_percent !== undefined ? parentConf.co_payment_percent : 0}
                                      onChange={e => handleUpdateConfigValue(parent.id, { co_payment_percent: e.target.value })}
                                      className="h-8 text-xs text-center w-16 mx-auto bg-white rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  {/* Scope */}
                                  <td className="p-3">
                                    <div className="space-y-1">
                                      <select
                                        value={normalizedScopeType}
                                        onChange={e => handleUpdateConfigValue(parent.id, { coverage_scope_type: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                                      >
                                        <option value="all">{tBuilder.allMembers}</option>
                                        <option value="specific_number">{tBuilder.specificCount}</option>
                                        <option value="percentage">{tBuilder.specificPercent}</option>
                                      </select>
                                      {normalizedScopeType !== 'all' && (
                                        <Input 
                                          type="number"
                                          value={parentConf.coverage_scope_value !== undefined && parentConf.coverage_scope_value !== null ? parentConf.coverage_scope_value : ""}
                                          onChange={e => handleUpdateConfigValue(parent.id, { coverage_scope_value: e.target.value })}
                                          placeholder={normalizedScopeType === 'percentage' ? "Percentage (%)" : "Member Count"}
                                          className="h-7 text-xs w-full bg-white rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      )}
                                    </div>
                                  </td>

                                  {/* Custom fields (ICU / Stay / Accommodation) */}
                                  <td className="p-3">
                                    {renderStayIcuCustomCell(parent, parentConf)}
                                  </td>
                                </tr>

                                {/* Render Children sub-benefits if any */}
                                {children.map(child => {
                                  const childConf = configs[child.id] || {};
                                  const childScopeType = childConf.coverage_scope_type === 'specific_count' ? 'specific_number' : childConf.coverage_scope_type === 'specific_percentage' ? 'percentage' : (childConf.coverage_scope_type || "all");

                                  const catNameEn = (cat.name_en || '').toLowerCase();
                                  const childNameEn = (child.name_en || '').toLowerCase();
                                  const isMaternityItem = catNameEn.includes('maternity') || cat.name_ar.includes('حمل') || childNameEn.includes('pregnancy') || childNameEn.includes('childbirth') || childNameEn.includes('anc') || childNameEn.includes('natal') || childNameEn.includes('delivery');

                                  return (
                                    <tr key={child.id} className="bg-slate-50/20 hover:bg-slate-50/60 transition-colors">
                                      <td className="p-3 pl-8 px-4 border-l-2 border-slate-200">
                                        <div className="text-slate-800 font-medium text-xs flex items-center gap-1.5">
                                          <span className="text-slate-400">↳</span>
                                          {viewRtl ? child.name_ar : child.name_en}
                                        </div>
                                      </td>

                                      <td className="p-3">
                                        <select
                                          value={childConf.coverage_status || "covered"}
                                          onChange={e => handleUpdateConfigValue(child.id, { coverage_status: e.target.value })}
                                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                                        >
                                          <option value="covered">Covered</option>
                                          <option value="not_covered">Not Covered</option>
                                        </select>
                                      </td>

                                      <td className="p-3">
                                        {isMaternityItem ? (
                                          <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200 px-2.5 py-1 rounded-md">
                                            {viewRtl ? "مشترك في حد الحمل" : "Shared Maternity Sublimit"}
                                          </span>
                                        ) : (
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              value={childConf.limit_type === 'included_in_aal' ? 'full_cover' : (childConf.limit_type || "full_cover")}
                                              onChange={e => handleUpdateConfigValue(child.id, { limit_type: e.target.value })}
                                              className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs shrink-0"
                                            >
                                              <option value="full_cover">Full Cover</option>
                                              <option value="sub_limit">Sub-limit</option>
                                            </select>
                                            {childConf.limit_type === 'sub_limit' && (
                                              <Input 
                                                type="number"
                                                value={childConf.limit_value || ""}
                                                onChange={e => handleUpdateConfigValue(child.id, { limit_value: e.target.value })}
                                                placeholder="Limit"
                                                className="h-8 text-xs w-28 bg-white rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td className="p-3 text-center">
                                        <Input 
                                          type="number"
                                          value={childConf.co_payment_percent !== undefined ? childConf.co_payment_percent : 0}
                                          onChange={e => handleUpdateConfigValue(child.id, { co_payment_percent: e.target.value })}
                                          className="h-8 text-xs text-center w-16 mx-auto bg-white rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </td>

                                      <td className="p-3">
                                        <div className="space-y-1">
                                          <select
                                            value={childScopeType}
                                            onChange={e => handleUpdateConfigValue(child.id, { coverage_scope_type: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                                          >
                                            <option value="all">{tBuilder.allMembers}</option>
                                            <option value="specific_number">{tBuilder.specificCount}</option>
                                            <option value="percentage">{tBuilder.specificPercent}</option>
                                          </select>
                                          {childScopeType !== 'all' && (
                                            <Input 
                                              type="number"
                                              value={childConf.coverage_scope_value !== undefined && childConf.coverage_scope_value !== null ? childConf.coverage_scope_value : ""}
                                              onChange={e => handleUpdateConfigValue(child.id, { coverage_scope_value: e.target.value })}
                                              placeholder={childScopeType === 'percentage' ? "Percentage (%)" : "Member Count"}
                                              className="h-7 text-xs w-full bg-white rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                          )}
                                        </div>
                                      </td>

                                      <td className="p-3">
                                        {renderStayIcuCustomCell(child, childConf)}
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

            {/* TAB 2: COMBINED POOLS */}
            <TabsContent value="pools" className="space-y-4 outline-none">
              {!selectedTier?.policy_id ? (
                <Card className="border-amber-200 bg-amber-50/70 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-3 grow">
                      <div>
                        <h4 className="font-black text-amber-900 text-base">
                          {viewRtl ? "ربط الخطة بفيشة التأمين (Policy) مطلوب" : "Policy Link Required for Shared Combined Pools"}
                        </h4>
                        <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                          {viewRtl 
                            ? "لتنفيذ مجمع الحدود المشترك (Combined Pool) أو أي مشاركة حدود بين المنافع، يجب أولاً ربط الخطة بفيشة تأمينية."
                            : "To implement a shared combined Pool or any other sharing, the user must first select a policy to link the plan with."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-amber-200 shadow-inner">
                        <select
                          value={selectedTier?.policy_id || ""}
                          onChange={e => handleSaveTierField("policy_id", e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold grow"
                        >
                          <option value="">{viewRtl ? "-- اختر الفيشة التأمينية لربط الخطة --" : "-- Select Policy to Link Plan --"}</option>
                          {policies.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.policy_number} - {p.company_name || p.policy_holder_name || "Policy"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-white p-4 border rounded-xl shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{tBuilder.pools}</h3>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          {viewRtl ? "مرتبطة بفيشة:" : "Policy Linked:"} {policies.find(p => p.id === selectedTier.policy_id)?.policy_number || 'Linked'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">Combine multiple medical benefits under a single shared limit container.</p>
                    </div>
                    <Button onClick={handleOpenAddPool} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9">
                      <Plus className="w-4 h-4 mr-1.5" />
                      {tBuilder.addPool}
                    </Button>
                  </div>

                  {pools.length === 0 ? (
                    <Card className="border-dashed p-8 text-center bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-bold">{tBuilder.poolsEmpty}</p>
                    </Card>
                  ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pools.map(pool => {
                    const linkedCount = Object.values(configs).filter((c: any) => c.combined_pool_id === pool.id).length;
                    return (
                      <Card key={pool.id} className="p-4 border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{viewRtl ? pool.pool_name_ar : pool.pool_name_en}</h4>
                            <p className="text-xs text-slate-500 font-bold mt-0.5">
                              {pool.pool_limit_value.toLocaleString()} {pool.pool_limit_currency} / {pool.pool_basis}
                            </p>
                            <Badge variant="outline" className="mt-2 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                              {linkedCount} Benefits Linked
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditPool(pool)} className="h-8 text-xs">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeletePool(pool.id)} className="h-8 text-xs text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

            {/* TAB 3: REIMBURSEMENT RULES */}
            <TabsContent value="reimb" className="space-y-4 outline-none">
              <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tBuilder.reimbursementTitle}</h3>
                    <p className="text-xs text-slate-400">Configure out-of-network reimbursement percentages and reference price lists.</p>
                  </div>
                  <Button 
                    onClick={() => handleSaveReimbursement(reimbForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9"
                  >
                    {tBuilder.saveReimbursement}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50">
                    <div>
                      <Label className="font-bold text-slate-800">{tBuilder.reimbursementCovered}</Label>
                      <p className="text-[10px] text-slate-400 mt-0.5">Enable out-of-network claims reimbursement</p>
                    </div>
                    <Switch 
                      checked={reimbForm.reimbursement_covered}
                      onCheckedChange={checked => {
                        const updated = { ...reimbForm, reimbursement_covered: checked };
                        handleSaveReimbursement(updated);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">{tBuilder.reimbursementPercent}</Label>
                    <Input 
                      type="number"
                      value={reimbForm.reimbursement_percent}
                      onChange={e => setReimbForm({ ...reimbForm, reimbursement_percent: e.target.value })}
                      placeholder="e.g. 80"
                      className="h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">{tBuilder.priceList}</Label>
                    <select
                      value={reimbForm.reimbursement_price_list_id}
                      onChange={e => setReimbForm({ ...reimbForm, reimbursement_price_list_id: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl p-2 text-xs"
                    >
                      <option value="none">None (Standard Provider Fee Schedule)</option>
                      {networks.map(n => (
                        <option key={n.id} value={n.id}>
                          {viewRtl ? n.name_ar : n.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 4: DOCTOR ON SITE (DOS) CONFIGURATION */}
            <TabsContent value="dos" className="space-y-4 outline-none">
              {!selectedTier?.policy_id ? (
                <Card className="border-amber-200 bg-amber-50/70 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-3 grow">
                      <div>
                        <h4 className="font-black text-amber-900 text-base">
                          {viewRtl ? "ربط الخطة بفيشة التأمين (Policy) مطلوب" : "Policy Link Required for Shared Doctor on Site (DOS)"}
                        </h4>
                        <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                          {viewRtl 
                            ? "لتطبيق خدمة طبيب الموقع (DOS) أو دمج خطتين أو أكثر في الخدمة، يجب أولاً ربط الخطة بفيشة تأمينية."
                            : "To implement Doctor on Site (DOS) rules or combine two or more plans, you must first select a policy to link the plan with."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-amber-200 shadow-inner">
                        <select
                          value={selectedTier?.policy_id || ""}
                          onChange={e => handleSaveTierField("policy_id", e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold grow"
                        >
                          <option value="">{viewRtl ? "-- اختر الفيشة التأمينية لربط الخطة --" : "-- Select Policy to Link Plan --"}</option>
                          {policies.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.policy_number} - {p.company_name || p.policy_holder_name || "Policy"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {viewRtl ? "إعدادات طبيب في الموقع (DOS - Doctor on Site)" : "Doctor on Site (DOS) Configuration"}
                          </h3>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                            {viewRtl ? "مرتبطة بفيشة:" : "Policy Linked:"} {policies.find(p => p.id === selectedTier.policy_id)?.policy_number || 'Linked'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {viewRtl ? "تحديد عدد الزيارات الأسبوعية والمواقع الجغرافية ونطاق الخدمات المتاحة" : "Specify visits per week, number of locations, schedule, and scope of service."}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSaveDoctorConfig()}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                    >
                      {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <CheckCircle2 className="w-4 h-4" />
                      {viewRtl ? "حفظ إعدادات DOS" : "Save DOS Settings"}
                    </Button>
                  </div>

                  {/* Combined Plans Selection Banner */}
                  <div className="p-4 border rounded-2xl bg-indigo-50/50 border-indigo-100 space-y-3">
                    <Label className="font-black text-xs text-indigo-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      {viewRtl ? "الخطط التأمينية المشتركة في تغطية طبيب الموقع (Combined Plans Sharing DOS) *" : "Combined Plans Sharing Doctor on Site (DOS) *"}
                    </Label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {tiers.filter(t => t.policy_id === selectedTier.policy_id).map(t => {
                        const tName = viewRtl ? (t.tier_name_ar || t.tier_name_en) : (t.tier_name_en || t.tier_name_ar);
                        const isSelected = dosTargetTierIds.includes(t.id);
                        return (
                          <label key={t.id} className={cn(
                            "flex items-center gap-2 p-2 px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none",
                            isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                          )}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setDosTargetTierIds(prev => [...prev, t.id]);
                                } else {
                                  if (dosTargetTierIds.length > 1) {
                                    setDosTargetTierIds(prev => prev.filter(id => id !== t.id));
                                  }
                                }
                              }}
                              className="hidden"
                            />
                            <span>{tName}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {viewRtl 
                        ? "يتم توحيد ودمج خدمة طبيب الموقع بين جميع الخطط المحددة أعلاه تلقائياً."
                        : "All selected plan tiers share the exact same Doctor on Site (DOS) clinic schedule and visits limit."}
                    </p>
                  </div>

                  {/* Enable Toggle Banner */}
                  <div className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50/70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <Label className="font-black text-sm text-slate-900">
                          {viewRtl ? "تفعيل تغطية طبيب بالموقع (Doctor on Site - DOS)" : "Enable Doctor on Site (DOS) Coverage"}
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {viewRtl ? "تضمين خدمة الطبيب المقيم ضمن مصفوفة تغطية الخطة التأمينية" : "Include resident clinic doctor coverage within plan benefits"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={doctorConfig.is_enabled}
                      onCheckedChange={checked => {
                        const updated = { ...doctorConfig, is_enabled: checked };
                        setDoctorConfig(updated);
                        handleSaveDoctorConfig(updated);
                      }}
                    />
                  </div>

                  {/* Main Configuration Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    
                    {/* 1. Visits Per Week */}
                    <div className="p-4 border rounded-2xl bg-white space-y-2 shadow-sm border-indigo-100">
                      <Label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <CalendarDays className="w-4 h-4 text-indigo-600" />
                        {viewRtl ? "عدد الزيارات في الأسبوع (Visits per Week) *" : "Number of Visits per Week *"}
                      </Label>
                      <Input 
                        type="number"
                        min={1}
                        max={7}
                        value={doctorConfig.visits_per_week || 1}
                        onChange={e => setDoctorConfig({ ...doctorConfig, visits_per_week: Number(e.target.value) || 1 })}
                        className="h-10 text-xs font-bold bg-slate-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="e.g. 2 visits per week"
                      />
                      <p className="text-[11px] text-slate-400">
                        {viewRtl ? "عدد الزيارات الأسبوعية المتاحة للطبيب بمقر الشركة" : "Weekly doctor clinic visit frequency"}
                      </p>
                    </div>

                    {/* 2. Number of Locations */}
                    <div className="p-4 border rounded-2xl bg-white space-y-2 shadow-sm border-indigo-100">
                      <Label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        {viewRtl ? "عدد المواقع (Number of Locations) *" : "Number of Locations *"}
                      </Label>
                      <Input 
                        type="number"
                        min={1}
                        max={50}
                        value={doctorConfig.number_of_locations || 1}
                        onChange={e => setDoctorConfig({ ...doctorConfig, number_of_locations: Number(e.target.value) || 1 })}
                        className="h-10 text-xs font-bold bg-slate-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="e.g. 1 location"
                      />
                      <p className="text-[11px] text-slate-400">
                        {viewRtl ? "عدد فروع ومواقع الشركة المغطاة بالطبيب" : "Total company branches covered by doctor on site"}
                      </p>
                    </div>

                    {/* 3. Location Details (English) */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "اسم وتفاصيل الموقع (EN)" : "Location Name / Details (EN)"}
                      </Label>
                      <Input 
                        value={doctorConfig.location_en || ''}
                        onChange={e => setDoctorConfig({ ...doctorConfig, location_en: e.target.value })}
                        placeholder="e.g. HQ Campus - New Cairo & Smart Village"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* 4. Location Details (Arabic) */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "اسم وتفاصيل الموقع (AR)" : "Location Name / Details (AR)"}
                      </Label>
                      <Input 
                        value={doctorConfig.location_ar || ''}
                        onChange={e => setDoctorConfig({ ...doctorConfig, location_ar: e.target.value })}
                        placeholder="مثال: المقر الرئيسي - التجمع الخامس والقرية الذكية"
                        className="h-10 text-xs font-arabic"
                        dir="rtl"
                      />
                    </div>

                    {/* 5. Schedule Details (English) */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "جدول ومواعيد العيادة (EN)" : "Doctor Schedule & Shift Hours (EN)"}
                      </Label>
                      <Input 
                        value={doctorConfig.schedule_en || ''}
                        onChange={e => setDoctorConfig({ ...doctorConfig, schedule_en: e.target.value })}
                        placeholder="e.g. Sun & Wed (9:00 AM - 3:00 PM)"
                        className="h-10 text-xs"
                      />
                    </div>

                    {/* 6. Schedule Details (Arabic) */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "جدول ومواعيد العيادة (AR)" : "Doctor Schedule & Shift Hours (AR)"}
                      </Label>
                      <Input 
                        value={doctorConfig.schedule_ar || ''}
                        onChange={e => setDoctorConfig({ ...doctorConfig, schedule_ar: e.target.value })}
                        placeholder="مثال: الأحد والأربعاء من ٩ صباحاً حتى ٣ عصراً"
                        className="h-10 text-xs font-arabic"
                        dir="rtl"
                      />
                    </div>

                    {/* 7. Scope of Service */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "نطاق الخدمات الطبية (Scope of Service)" : "Scope of Service"}
                      </Label>
                      <select
                        value={doctorConfig.scope_of_service || 'general_consultation'}
                        onChange={e => setDoctorConfig({ ...doctorConfig, scope_of_service: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                      >
                        <option value="general_consultation">{viewRtl ? "كشف واستشارات عامة" : "General Consultation"}</option>
                        <option value="consultation_plus_basic_meds">{viewRtl ? "كشف + صرف أدوية أساسية طوارئ" : "Consultation + Basic Emergency Meds"}</option>
                        <option value="first_aid">{viewRtl ? "إسعافات أولية وطوارئ موقع" : "First Aid & Site Emergency"}</option>
                      </select>
                    </div>

                    {/* 8. Cost Model */}
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">
                        {viewRtl ? "نموذج التكلفة (Cost Model)" : "Cost Model"}
                      </Label>
                      <select
                        value={doctorConfig.cost_model || 'fixed_retainer'}
                        onChange={e => setDoctorConfig({ ...doctorConfig, cost_model: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                      >
                        <option value="fixed_retainer">{viewRtl ? "مقابل شهري ثابت (Fixed Retainer)" : "Fixed Retainer Fee"}</option>
                        <option value="per_visit">{viewRtl ? "حسب عدد الزيارات (Per Visit Fee)" : "Per Visit Fee"}</option>
                      </select>
                    </div>

                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* CREATE / EDIT PLAN DIALOG */}
      <FormDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        title={editingTierId ? (viewRtl ? "تعديل اسم وإعدادات الخطة" : "Edit Plan Tier Settings") : tBuilder.createTier}
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
                      {viewRtl ? n.name_ar : n.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Linked Policy (Contract)</Label>
              <Select 
                value={tierFormData.policy_id}
                onValueChange={(v: string) => setTierFormData({ ...tierFormData, policy_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select Policy" /></SelectTrigger>
                <SelectContent>
                  {policies.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.policy_number} - {p.company_name}
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
            <Button type="submit" disabled={tierSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
              {tierSubmitting ? "Submitting..." : tBuilder.submit}
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
              {viewRtl ? selectedTier?.tier_name_ar : selectedTier?.tier_name_en}
            </p>
          </div>

          <div className="space-y-4 text-xs">
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

      {/* COMBINED POOL DIALOG */}
      <FormDialog
        open={poolDialogOpen}
        onOpenChange={setPoolDialogOpen}
        title={poolFormData.id ? "Edit Combined Pool" : "Add Combined Pool"}
        size="lg"
      >
        <form onSubmit={handleSavePool} className="space-y-5 py-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Pool Name (Arabic)</Label>
              <Input 
                value={poolFormData.pool_name_ar}
                onChange={e => setPoolFormData({ ...poolFormData, pool_name_ar: e.target.value })}
                className="font-arabic"
                dir="rtl"
                placeholder="مثال: مجمع الأسنان والبصريات المشترك"
              />
            </div>
            <div className="space-y-2">
              <Label>{tBuilder.poolLimit}</Label>
              <Input 
                type="number"
                value={poolFormData.pool_limit_value}
                onChange={e => setPoolFormData({ ...poolFormData, pool_limit_value: e.target.value })}
                placeholder="e.g. 5000"
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

          <div className="space-y-2 pt-2 border-t">
            <Label className="font-bold text-slate-800">Select Benefits Included in this Shared Pool</Label>
            <div className="border rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 bg-slate-50/50">
              {benefitDefs.map(d => {
                const isSelected = poolFormData.selected_benefit_ids.includes(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none hover:bg-white p-1 rounded">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        const checked = e.target.checked;
                        setPoolFormData(prev => ({
                          ...prev,
                          selected_benefit_ids: checked 
                            ? [...prev.selected_benefit_ids, d.id]
                            : prev.selected_benefit_ids.filter(id => id !== d.id)
                        }));
                      }}
                      className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <span>{viewRtl ? d.name_ar : d.name_en}</span>
                  </label>
                );
              })}
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

      {/* PRINT TABLE OF BENEFITS DIALOG */}
      <FormDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        title="Print Table of Benefits"
        size="xl"
      >
        {selectedTier && (
          <PrintTableOfBenefits 
            tier={selectedTier}
            categories={categories}
            definitions={benefitDefs}
            configs={configs}
            pools={pools}
            oonRules={oonRules}
            doctorConfig={doctorConfig}
            initialLang={viewLang}
          />
        )}
      </FormDialog>

    </div>
  );
}
