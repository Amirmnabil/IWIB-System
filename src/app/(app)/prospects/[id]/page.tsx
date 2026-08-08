'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatCompactNumber, getCleanStorageUrl, cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Save, Loader2, CheckCircle2, FileText,
  Trash2, DollarSign, Calendar, User, Shield, Target, Plus,
  ExternalLink, ChevronRight, AlertCircle, FileSignature, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useToast } from "@/lib/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProspectService } from "@/services/prospect.service";
import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import type { Prospect } from "@/lib/types";
import { useI18n } from "@/components/i18n-context";

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, isRtl } = useI18n();

  const [loading, setLoading] = useState(true);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [saving, setSaving] = useState(false);
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);

  // ── Form State (Photo 2 Data) ──
  const [formData, setFormData] = useState({
    company_name: "",
    company_id: "",
    pipeline_stage: "qualification",
    probability: 50,
    estimated_value: 0,
    expected_close_date: "",
    assigned_user_name: "",
    assigned_user_id: "",
    current_insurer: "",
    current_tpa: "",
    requested_products: [] as string[],
    decision_maker: "",
    competitors: [] as string[],
    final_premium: 0,
    commission: 0,
    notes: "",
  });

  // ── Pricing & Options State (Photo 1 Data) ──
  const [pricingVersions, setPricingVersions] = useState<any[]>([]);
  const [newOptionTitle, setNewOptionTitle] = useState("");
  const [newOptionInsurer, setNewOptionInsurer] = useState("");
  const [newOptionPremium, setNewOptionPremium] = useState<number | "">("");

  // ── Won Modal State ──
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [wonPremium, setWonPremium] = useState(0);
  const [wonCommission, setWonCommission] = useState(0);
  const [wonInsurer, setWonInsurer] = useState("");
  const [wonNotes, setWonNotes] = useState("");
  const [converting, setConverting] = useState(false);

  // ── Master Collections ──
  const { data: companiesData } = useSupabaseCollection<any>('companies', undefined, {
    select: 'id, name, current_insurer',
    filterKey: 'companies-prospect-detail',
  });
  const companies = companiesData || [];

  const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
    select: 'id, name',
    filterKey: 'users-prospect-detail',
  });
  const users = usersData || [];

  const { data: pipelineStagesData } = useSupabaseCollection<any>('master_pipeline_stages', undefined, {
    select: 'id, name, code, order',
    filterKey: 'pipeline-stages-prospect-detail',
  });
  const pipelineStages = pipelineStagesData || [];

  const { data: productsData } = useSupabaseCollection<any>('master_product_types', undefined, {
    select: 'id, name',
    filterKey: 'product-types-prospect-detail',
  });
  const products = productsData || [];

  const { data: tpasData } = useSupabaseCollection<any>('tpas', undefined, {
    select: 'id, name',
    filterKey: 'tpas-prospect-detail',
  });
  const tpas = tpasData || [];

  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies', undefined, {
    select: 'id, companyName',
    filterKey: 'insurers-prospect-detail',
  });
  const insurers = insurersData || [];

  // ── Fetch Prospect Data ──
  const fetchProspect = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*, prospect_details(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProspect(data);
      const details = Array.isArray(data.prospect_details)
        ? data.prospect_details[0]
        : data.prospect_details || {};

      setFormData({
        company_name: data.company_name || "",
        company_id: data.company_id || "",
        pipeline_stage: data.pipeline_stage || "qualification",
        probability: data.probability ?? 50,
        estimated_value: data.estimated_value ?? 0,
        expected_close_date: data.expected_close_date || "",
        assigned_user_name: data.assigned_user_name || "",
        assigned_user_id: data.assigned_user_id || "",
        current_insurer: details.insurance_company || data.current_insurer || "",
        current_tpa: data.current_tpa || "",
        requested_products: data.requested_products || [],
        decision_maker: details.decision_maker || "",
        competitors: details.competitors || [],
        final_premium: details.final_premium || 0,
        commission: details.commission || 0,
        notes: details.notes || data.notes || "",
      });

      setPricingVersions(details.proposal_versions || []);
      setNewOptionInsurer(details.insurance_company || data.current_insurer || "");
      setNewOptionPremium(data.estimated_value || 0);
    } catch (err: any) {
      console.error("Failed to load prospect", err);
      toast({ variant: "destructive", title: "Error loading prospect", description: err?.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProspect();
  }, [fetchProspect]);

  // ── Save Form Data (Photo 2) ──
  const handleSaveProspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id || !prospect) return;
    setSaving(true);
    try {
      await ProspectService.updateProspect(id, {
        company_name: formData.company_name,
        company_id: formData.company_id || undefined,
        pipeline_stage: formData.pipeline_stage,
        probability: formData.probability,
        estimated_value: formData.estimated_value,
        expected_close_date: formData.expected_close_date || undefined,
        assigned_user_name: formData.assigned_user_name,
        assigned_user_id: formData.assigned_user_id || undefined,
        current_insurer: formData.current_insurer,
        current_tpa: formData.current_tpa,
        requested_products: formData.requested_products,
        decision_maker: formData.decision_maker,
        competitors: formData.competitors,
        final_premium: formData.final_premium,
        commission: formData.commission,
        notes: formData.notes,
        proposal_versions: pricingVersions,
      });

      queryClient.invalidateQueries({ queryKey: ['supabase'] });
      toast({ title: "✅ Prospect details updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Pricing Options Actions (Photo 1) ──
  const addPricingOption = () => {
    if (!newOptionTitle) return;
    const newOption = {
      id: Math.random().toString(36).substring(2, 9),
      title: newOptionTitle,
      insurer: newOptionInsurer || "Standard Insurer",
      premium: Number(newOptionPremium) || 0,
      status: "Draft",
      created_at: new Date().toISOString(),
    };
    setPricingVersions((prev) => [...prev, newOption]);
    setNewOptionTitle("");
  };

  const deletePricingOption = (optId: string) => {
    setPricingVersions((prev) => prev.filter((o) => o.id !== optId));
  };

  const selectPricingOption = async (option: any) => {
    if (!id) return;
    try {
      const updatedVersions = pricingVersions.map((o) => ({
        ...o,
        status: o.id === option.id ? "Selected" : o.status === "Selected" ? "Active" : o.status,
      }));
      setPricingVersions(updatedVersions);
      setFormData((prev) => ({ ...prev, estimated_value: option.premium, current_insurer: option.insurer }));

      await supabase.from("prospects").update({ estimated_value: option.premium, current_insurer: option.insurer }).eq("id", id);
      await supabase.from("prospect_details").upsert(
        sanitizeUUIDs({
          prospect_id: id,
          company_id: formData.company_id || null,
          final_premium: option.premium,
          insurance_company: option.insurer,
          proposal_versions: updatedVersions,
          updated_at: new Date().toISOString(),
        }),
        { onConflict: "prospect_id" }
      );

      queryClient.invalidateQueries({ queryKey: ["supabase"] });
      toast({ title: "Option Selected", description: `Active premium set to ${option.premium?.toLocaleString()} EGP.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Selection failed" });
    }
  };

  const savePricingVersions = async () => {
    if (!id) return;
    try {
      await supabase.from("prospect_details").upsert(
        sanitizeUUIDs({
          prospect_id: id,
          company_id: formData.company_id || null,
          proposal_versions: pricingVersions,
          updated_at: new Date().toISOString(),
        }),
        { onConflict: "prospect_id" }
      );

      queryClient.invalidateQueries({ queryKey: ["supabase"] });
      toast({ title: "✅ Pricing options saved successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed" });
    }
  };

  // ── Mark as Won / Convert to Policy ──
  const openWonDialog = () => {
    setWonPremium(formData.final_premium || formData.estimated_value || 0);
    setWonCommission(formData.commission || 0);
    setWonInsurer(formData.current_insurer || "");
    setWonNotes("");
    setWonDialogOpen(true);
  };

  const submitQuickWon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;
    setConverting(true);
    try {
      const result = await ProspectService.convertToPolicy(prospect, {
        final_premium: wonPremium,
        insurance_company: wonInsurer,
        commission: wonCommission,
        details: wonNotes,
      });

      queryClient.invalidateQueries({ queryKey: ["supabase"] });
      toast({
        title: "✅ Prospect Converted to Client & Policy Created!",
        description: `Draft policy ${result.generatedPolicyNumber} has been created.`,
      });
      setWonDialogOpen(false);
      if (result.policyId) {
        router.push(`/policies/${result.policyId}`);
      } else {
        router.push("/policies");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Conversion failed", description: err?.message });
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-bold text-slate-400">Loading prospect details…</p>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Prospect not found</h2>
        <Button variant="outline" onClick={() => router.push("/prospects")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Prospects
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      {/* ── Top Header Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/prospects")}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-headline font-black text-foreground tracking-tight">
                {formData.company_name}
              </h1>
              <Badge className="capitalize font-bold text-xs bg-indigo-100 text-indigo-800 border-indigo-200">
                {t(formData.pipeline_stage.toLowerCase() as any) || formData.pipeline_stage.replace(/_/g, " ")}
              </Badge>
              {prospect && (
                <Badge variant="outline" className={cn("capitalize font-bold text-xs uppercase tracking-wider",
                  (Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {})).underwriting_status === 'in_progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    (Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {})).underwriting_status === 'done' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                )}>
                  {t('pricingStage') || 'Pricing Stage'}: {
                    (() => {
                      const status = (Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {})).underwriting_status;
                      if (status === 'in_progress') return t('status_in_progress') || 'In Progress';
                      if (status === 'done') return t('status_done') || 'Done';
                      return t('status_pending') || 'Pending';
                    })()
                  }
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {t('createdOn') || 'Created on'} {format(new Date(prospect.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={openWonDialog}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {t('wonConvertPolicy') || 'Won (Convert to Policy)'}
          </Button>
          <Button
            onClick={handleSaveProspect}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Prospect"}
          </Button>
        </div>
      </div>

      {/* ── Main 2-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ═════════════════════════════════════════════════════════════
            LEFT COLUMN: Prospect Information & Negotiation Form (Photo 2)
        ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-base font-black text-indigo-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Prospect Details &amp; CRM Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Companies *</Label>
                  <Input value={formData.company_name} readOnly disabled className="bg-muted text-muted-foreground font-semibold" />
                </div>

                {/* Pipeline Stage */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Pipeline Stage *</Label>
                  <Select
                    value={formData.pipeline_stage}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, pipeline_stage: v }))}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map((s: any, index: number) => (
                        <SelectItem key={s.id || s.code || index} value={s.code?.toLowerCase() || s.name.toLowerCase()}>
                          {s.name}
                        </SelectItem>
                      ))}
                      {pipelineStages.length === 0 && (
                        <>
                          <SelectItem value="qualification">Qualification</SelectItem>
                          <SelectItem value="proposal_sent">Proposal sent</SelectItem>
                          <SelectItem value="needs_adjustments">Needs adjustments</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed_won">Won</SelectItem>
                          <SelectItem value="closed_lost">Lost</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimated Value */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Estimated Value (EGP)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_value || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estimated_value: Number(e.target.value) }))}
                    placeholder="20000000"
                    className="bg-card"
                  />
                </div>

                {/* Probability (%) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Probability (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probability ?? ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, probability: Number(e.target.value) }))}
                    placeholder="50"
                    className="bg-card"
                  />
                </div>

                {/* Expected Close Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Expected Close Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expected_close_date: e.target.value }))}
                    className="bg-card"
                  />
                </div>

                {/* Assigned To */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Assigned To</Label>
                  <Select
                    value={formData.assigned_user_name}
                    onValueChange={(v) => {
                      const u = users.find((usr: any) => usr.name === v);
                      setFormData((prev) => ({ ...prev, assigned_user_name: v, assigned_user_id: u?.id || "" }));
                    }}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Insurer */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Current Insurer</Label>
                  <Select
                    value={formData.current_insurer}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, current_insurer: v }))}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select Insurer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {insurers.map((ins: any) => (
                        <SelectItem key={ins.id} value={ins.companyName || ins.name}>
                          {ins.companyName || ins.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current TPA */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Current TPA</Label>
                  <Select
                    value={formData.current_tpa}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, current_tpa: v }))}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select TPA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tpas.map((t: any) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Requested Products */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div
                  className="flex items-center justify-between cursor-pointer py-1 select-none"
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                >
                  <Label className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-2">
                    Requested Products
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({formData.requested_products.length} selected)
                    </span>
                  </Label>
                  {isProductsExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>

                {isProductsExpanded && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 animate-in fade-in duration-200">
                    {products.map((product: any) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 p-2 border border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.requested_products.includes(product.name)}
                          onChange={(e) => {
                            const { checked } = e.target;
                            setFormData((prev) => ({
                              ...prev,
                              requested_products: checked
                                ? [...prev.requested_products, product.name]
                                : prev.requested_products.filter((p) => p !== product.name),
                            }));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-semibold text-foreground">{product.name}</span>
                      </label>
                    ))}
                    {products.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No products defined in Master Data.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Prospect Negotiation Details (Photo 2 Section) */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                  PROSPECT NEGOTIATION &amp; NEGOTIATION DETAILS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Decision Maker</Label>
                    <Input
                      type="text"
                      value={formData.decision_maker}
                      onChange={(e) => setFormData((prev) => ({ ...prev, decision_maker: e.target.value }))}
                      placeholder="e.g. CEO, HR Director Name"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Competitors</Label>
                    <Input
                      type="text"
                      value={Array.isArray(formData.competitors) ? formData.competitors.join(", ") : formData.competitors}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          competitors: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="e.g. Competitor A, Competitor B"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Final Premium (EGP)</Label>
                    <Input
                      type="number"
                      value={formData.final_premium || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, final_premium: Number(e.target.value) }))}
                      placeholder="Final negotiated premium"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Expected Commission (EGP / %)</Label>
                    <Input
                      type="number"
                      value={formData.commission || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, commission: Number(e.target.value) }))}
                      placeholder="e.g. 50000"
                      className="bg-card"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Notes &amp; Observations</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Internal prospect notes, special conditions, timeline requirements…"
                    rows={3}
                    className="bg-card resize-none"
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            RIGHT COLUMN: Pricing & Quotation Options (Photo 1)
        ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-black text-indigo-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Pricing &amp; Quotation Options
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-black bg-amber-50 border-amber-200 text-amber-800">
                {pricingVersions.length} {pricingVersions.length === 1 ? "Option" : "Options"}
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-5">

              {/* Active Pricing Options Table (Matching Photo 1) */}
              <div className="border border-border rounded-xl overflow-hidden bg-slate-50/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-border">
                      <th className="p-3">Option Title</th>
                      <th className="p-3">Insurer</th>
                      <th className="p-3">Premium (EGP)</th>
                      <th className="p-3">Date / Document</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pricingVersions.length > 0 ? (
                      pricingVersions.map((opt: any, index: number) => (
                        <tr key={opt.id || opt.title || opt.version_label || index} className="hover:bg-white transition-colors">
                          <td className="p-3 font-bold text-slate-800">{opt.title || opt.version_label || "Variant"}</td>
                          <td className="p-3 text-slate-600">{opt.insurer}</td>
                          <td className="p-3 font-black text-indigo-900">
                            {formatCompactNumber(opt.premium || opt.premium_egp || 0)}
                          </td>
                          <td className="p-3 text-slate-600">
                            <div className="flex flex-col gap-0.5">
                              {opt.received_date && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {format(new Date(opt.received_date), "MMM d, yyyy")}
                                </span>
                              )}
                              {opt.file_url ? (
                                <a
                                  href={getCleanStorageUrl(opt.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                  <FileText className="w-3 h-3 text-red-500 shrink-0" />
                                  <span className="truncate max-w-[90px]">{opt.file_name || "Offer PDF"}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No document</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={opt.status === "Selected" ? "secondary" : "outline"}
                              className={`text-[9px] font-black uppercase py-0.5 ${opt.status === "Selected"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-700"
                                }`}
                            >
                              {opt.status || "DRAFT"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {opt.status !== "Selected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-50"
                                onClick={() => selectPricingOption(opt)}
                              >
                                Select
                              </Button>
                            )}
                            <button
                              onClick={() => deletePricingOption(opt.id)}
                              className="p-1 rounded-md text-destructive hover:bg-red-50 transition-colors inline-block"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                          No pricing options logged yet. Use the form below or sync from Underwriting.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Pricing Variant Form Removed */}

            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Mark as Won Modal ─────────────────────────────────────── */}
      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Close Deal: Mark as Won
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickWon} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Final Premium (EGP) *</Label>
                <Input
                  type="number"
                  value={wonPremium}
                  onChange={(e) => setWonPremium(Number(e.target.value))}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Commission Rate / Value</Label>
                <Input
                  type="number"
                  value={wonCommission}
                  onChange={(e) => setWonCommission(Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Winning Insurer *</Label>
              <Select value={wonInsurer} onValueChange={setWonInsurer}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Insurer" />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map((i: any, index: number) => (
                    <SelectItem key={i.id || i.companyName || i.name || index} value={i.companyName || i.name}>
                      {i.companyName || i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Closing Notes / Details</Label>
              <Textarea
                value={wonNotes}
                onChange={(e) => setWonNotes(e.target.value)}
                placeholder="Details of the win, special terms, etc…"
                rows={3}
                className="bg-background resize-none"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setWonDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={converting} className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold">
                {converting ? "Processing…" : "Create Draft Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
