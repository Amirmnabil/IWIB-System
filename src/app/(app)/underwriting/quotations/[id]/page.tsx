'use client';
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { getCleanStorageUrl } from "@/lib/utils";
import {
  ArrowLeft, ChevronDown, ChevronUp, Building2, Users, Shield,
  FileText, Plus, Trash2, Save, Loader2, CheckCircle2, Clock,
  AlertCircle, RefreshCw, Tag, Info, Package, User,
  Copy, ExternalLink, GitBranch, Paperclip, Upload, X, Calendar
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
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useToast } from "@/lib/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  UnderwritingService,
  type UnderwritingVersion,
  type InsurerOffer,
  type UnderwritingStatus,
} from "@/services/underwriting.service";
import { supabase } from "@/lib/supabase";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<UnderwritingStatus, { label: string; color: string; dotColor: string }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    dotColor: "bg-amber-500",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    dotColor: "bg-blue-500",
  },
  done: {
    label: "Done",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotColor: "bg-emerald-500",
  },
};

// ─── Collapsible Section ───────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-[10px] font-black bg-primary/5 border-primary/20 text-primary">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border">
          <CardContent className="p-5">{children}</CardContent>
        </div>
      )}
    </Card>
  );
}

// ─── Offer Row ────────────────────────────────────────────────────────────────
function OfferRow({
  offer,
  onDelete,
  index,
}: {
  offer: InsurerOffer;
  onDelete: (id: string) => void;
  index: number;
}) {
  return (
    <tr className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
      <td className="px-4 py-3">
        <span className="text-[11px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          #{index + 1}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-bold text-foreground text-sm">{offer.insurer}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-black text-emerald-700 text-sm">
          {offer.premium_egp.toLocaleString()} EGP
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {offer.received_date ? format(new Date(offer.received_date), "MMM d, yyyy") : "—"}
        </div>
      </td>
      <td className="px-4 py-3">
        {offer.file_url ? (
          <a
            href={getCleanStorageUrl(offer.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors"
            title="View Offer PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="truncate max-w-[110px]">{offer.file_name || "Offer PDF"}</span>
            <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground italic">No document</span>
        )}
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-xs text-muted-foreground truncate">{offer.notes || "—"}</p>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(offer.id)}
          title="Delete Offer"
          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Remote data ──
  const [prospect, setProspect] = useState<any>(null);
  const [loadingProspect, setLoadingProspect] = useState(true);

  // ── UW state ──
  const [uwStatus, setUwStatus] = useState<UnderwritingStatus>("pending");
  const [versions, setVersions] = useState<UnderwritingVersion[]>([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  // syncPulse: briefly true after clicking save to show instant feedback
  const [syncPulse, setSyncPulse] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // ── Add offer form ──
  const [offerInsurer, setOfferInsurer] = useState("");
  const [offerPremium, setOfferPremium] = useState<number | "">("");
  const [offerDate, setOfferDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [offerNotes, setOfferNotes] = useState("");
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── Insurers dropdown ──
  const { data: insurersData } = useSupabaseCollection<any>("insurance_companies", undefined, {
    select: "id, companyName",
    filterKey: "insurers-dropdown-uw",
  });
  const insurers = insurersData || [];

  // ── Load prospect ──
  const loadProspect = useCallback(async () => {
    if (!id) return;
    setLoadingProspect(true);
    try {
      const data = await UnderwritingService.getQuotationById(id);
      setProspect(data);
      const details = Array.isArray(data.prospect_details)
        ? data.prospect_details[0]
        : data.prospect_details || {};
      setUwStatus((details.underwriting_status as UnderwritingStatus) || "pending");
      const existingVersions: UnderwritingVersion[] = details.underwriting_versions || [];
      if (existingVersions.length === 0) {
        // Bootstrap with Version 1
        setVersions([UnderwritingService.createNewVersion([])]);
      } else {
        setVersions(existingVersions);
      }
      setActiveVersionIdx(0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load quotation", description: err?.message });
    } finally {
      setLoadingProspect(false);
    }
  }, [id]);

  useEffect(() => {
    loadProspect();
  }, [loadProspect]);

  // ── Helpers ──
  const activeVersion = versions[activeVersionIdx];

  const addOffer = async () => {
    if (!offerInsurer || !offerPremium) return;
    let uploadedUrl = "";
    let uploadedName = "";

    if (offerFile) {
      setUploadingFile(true);
      try {
        const res = await UnderwritingService.uploadOfferPdf(offerFile, id);
        uploadedUrl = res.file_url;
        uploadedName = res.file_name;
      } catch (err: any) {
        toast({ variant: "destructive", title: "PDF upload failed", description: err?.message });
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    const offer = UnderwritingService.createOffer(
      offerInsurer,
      Number(offerPremium),
      offerNotes,
      offerDate,
      uploadedUrl,
      uploadedName
    );

    setVersions((prev) =>
      prev.map((v, i) =>
        i === activeVersionIdx ? { ...v, offers: [...v.offers, offer] } : v
      )
    );

    // Reset form
    setOfferInsurer("");
    setOfferPremium("");
    setOfferNotes("");
    setOfferDate(new Date().toISOString().split("T")[0]);
    setOfferFile(null);
  };

  const deleteOffer = (offerId: string) => {
    setVersions((prev) =>
      prev.map((v, i) =>
        i === activeVersionIdx
          ? { ...v, offers: v.offers.filter((o) => o.id !== offerId) }
          : v
      )
    );
  };

  const addVersion = () => {
    const newV = UnderwritingService.createNewVersion(versions);
    const prevLabel = versions.length > 0 ? versions[versions.length - 1].label : "";
    setVersions((prev) => [...prev, newV]);
    setActiveVersionIdx(versions.length);
    toast({
      title: `Created ${newV.label}`,
      description: prevLabel
        ? `Pre-filled with offers from ${prevLabel} for updates.`
        : "New quotation version ready.",
    });
  };

  const handleSave = () => {
    if (!prospect) return;
    // Show instant visual pulse — UI stays fully responsive
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 1200);
    // Fire-and-forget: run in background, never block the UI
    const companyId = prospect.company_id || null;
    UnderwritingService.saveUnderwritingVersions(id, companyId, versions, uwStatus)
      .then(() => {
        setLastSynced(new Date());
        queryClient.invalidateQueries({ queryKey: ["supabase"] });
        toast({
          title: "✅ Synced with Prospects",
          description: "All offers and PDFs are now visible in Prospects → Pricing Options.",
        });
      })
      .catch((err: any) => {
        toast({ variant: "destructive", title: "Sync failed", description: err?.message });
      });
  };

  const handleStatusChange = async (status: UnderwritingStatus) => {
    setUwStatus(status);
    if (!prospect) return;
    try {
      await UnderwritingService.updateStatus(id, prospect.company_id, status);
      queryClient.invalidateQueries({ queryKey: ["supabase"] });
      toast({ title: `Status updated to "${STATUS_CONFIG[status].label}"` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Status update failed", description: err?.message });
    }
  };

  // ── Derived data ──
  const details = Array.isArray(prospect?.prospect_details)
    ? prospect?.prospect_details[0]
    : prospect?.prospect_details || {};

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loadingProspect) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-semibold">Loading quotation…</p>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-foreground font-bold text-lg">Quotation not found</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[uwStatus];

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-5">
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/underwriting/quotations")}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {prospect.company_name}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Quotation request • {format(new Date(prospect.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
            UW Status:
          </span>
          {(["pending", "in_progress", "done"] as UnderwritingStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  uwStatus === s
                    ? `${cfg.color} shadow-sm scale-105`
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${uwStatus === s ? cfg.dotColor : "bg-muted-foreground/40"}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION A — CRM & Prospect Data (Collapsed by default)
      ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        title="CRM & Prospect Data"
        icon={Info}
        defaultOpen={false}
        badge="Click to expand"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataField label="Company" value={prospect.company_name} />
          <DataField label="Pipeline Stage" value={prospect.pipeline_stage?.replace(/_/g, " ")} />
          <DataField label="Assigned To" value={prospect.assigned_user_name || "—"} />
          <DataField
            label="Current Insurer"
            value={details?.insurance_company || prospect.current_insurer || "—"}
          />
          <DataField label="Current TPA" value={prospect.current_tpa || "—"} />
          <DataField
            label="Expected Close"
            value={
              prospect.expected_close_date
                ? format(new Date(prospect.expected_close_date), "MMM d, yyyy")
                : "—"
            }
          />
          <DataField
            label="Estimated Value"
            value={
              prospect.estimated_value
                ? `${Number(prospect.estimated_value).toLocaleString()} EGP`
                : "TBD"
            }
          />
          <DataField label="Probability" value={prospect.probability ? `${prospect.probability}%` : "—"} />
          <DataField label="Requested Products" value={(prospect.requested_products || []).join(", ") || "—"} />
        </div>
        {prospect.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-xl">
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-foreground">{prospect.notes}</p>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={() => router.push(`/companies/${prospect.company_id}`)}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Full Company Profile
          </button>
        </div>
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION B — Underwriting Offers (Main)
      ═══════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-foreground">
                  Insurer Offers
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Upload and record offers received from insurance companies
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={addVersion}
              className="gap-2 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
            >
              <GitBranch className="w-3.5 h-3.5" />
              New Version
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* ── Version Tabs ───────────────────────────────────────────── */}
          {versions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {versions.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVersionIdx(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                    idx === activeVersionIdx
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                      : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GitBranch className="w-3 h-3" />
                  {v.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      idx === activeVersionIdx
                        ? "bg-white/20 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {v.offers.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Version Meta ──────────────────────────────────────────── */}
          {activeVersion && (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Created {format(new Date(activeVersion.created_at), "MMM d, yyyy 'at' HH:mm")}
                </div>
                {activeVersionIdx > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Pre-filled with offers from Version {activeVersionIdx} for updating
                  </span>
                )}
              </div>

              {/* ── Offers Table ───────────────────────────────────────── */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Insurer
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Premium (EGP)
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Date Received
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Offer PDF / File
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Key Benefits / Notes
                      </th>
                      <th className="px-4 py-2.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeVersion.offers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                          No offers added yet — use the form below to record insurer responses.
                        </td>
                      </tr>
                    ) : (
                      activeVersion.offers.map((offer, idx) => (
                        <OfferRow
                          key={offer.id}
                          offer={offer}
                          index={idx}
                          onDelete={deleteOffer}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Add Offer Form ─────────────────────────────────────── */}
              <div className="border border-dashed border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-4">
                <p className="text-[11px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Insurer Offer to {activeVersion.label}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Insurer */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Insurer *
                    </Label>
                    <Select value={offerInsurer} onValueChange={setOfferInsurer}>
                      <SelectTrigger className="bg-white h-9 text-sm">
                        <SelectValue placeholder="Select insurer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {insurers.map((ins: any) => (
                          <SelectItem key={ins.id} value={ins.companyName}>
                            {ins.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Premium */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Premium (EGP) *
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 450000"
                      value={offerPremium}
                      onChange={(e) =>
                        setOfferPremium(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="bg-white h-9 text-sm"
                    />
                  </div>

                  {/* Offer Received Date */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Date Received *
                    </Label>
                    <Input
                      type="date"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="bg-white h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Offer PDF Upload */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Upload Offer PDF / Document
                    </Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer text-xs font-bold text-indigo-700 transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        Choose File
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setOfferFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>

                      {offerFile ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-semibold truncate">
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">{offerFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setOfferFile(null)}
                            className="p-0.5 rounded-full hover:bg-indigo-200 text-indigo-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No file selected (optional)</span>
                      )}
                    </div>
                  </div>

                  {/* Add button */}
                  <div>
                    <Button
                      type="button"
                      disabled={!offerInsurer || !offerPremium || uploadingFile}
                      onClick={addOffer}
                      className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2"
                    >
                      {uploadingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {uploadingFile ? "Uploading PDF…" : "Add Offer"}
                    </Button>
                  </div>
                </div>

                {/* Notes row */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                    Key Benefits / Notes
                  </Label>
                  <Textarea
                    placeholder="e.g. Includes dental & optical, annual limit 500k, network A…"
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    rows={2}
                    className="bg-white text-sm resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Save Bar ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {/* Last synced indicator */}
            <div className="flex items-center gap-2">
              {lastSynced ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synced {format(lastSynced, "HH:mm")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">
                  Saves instantly in background
                </span>
              )}
            </div>
            <Button
              onClick={handleSave}
              className={`gap-2 text-white font-bold transition-all duration-200 ${
                syncPulse
                  ? "bg-emerald-500 hover:bg-emerald-600 scale-95"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {syncPulse ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {syncPulse ? "Syncing…" : "Save & Sync"}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}

// ─── Helper: Data Field ───────────────────────────────────────────────────────
function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
