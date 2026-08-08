import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/i18n-context";
import type { Prospect, Company } from "@/lib/types";

interface ProspectFormProps {
  formData: Omit<Prospect, 'id' | 'created_at'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<Prospect, 'id' | 'created_at'>>>;
  companies: Company[];
  pipelineStages: any[];
  users: any[];
  insurers: any[];
  tpas: any[];
  products: any[];
  selectedProspect: Prospect | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ProspectForm({
  formData,
  setFormData,
  companies,
  pipelineStages,
  users,
  insurers,
  tpas,
  products,
  selectedProspect,
  onSubmit,
  onCancel
}: ProspectFormProps) {
  const { t } = useI18n();
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('companies')} *</Label>
          {selectedProspect ? (
            <Input value={formData.company_name} readOnly disabled />
          ) : (
            <Select
              value={formData.company_id}
              onValueChange={(v) => {
                const company = companies.find(c => c.id === v);
                setFormData(prev => ({ 
                  ...prev, 
                  company_id: v, 
                  company_name: company?.name || "",
                  current_insurer: company?.current_insurer || prev.current_insurer
                }));
              }}
            >
              <SelectTrigger><SelectValue placeholder={t('selectClient')} /></SelectTrigger>
              <SelectContent>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t('pipelineStage') || "Pipeline Stage"} *</Label>
          <Select 
            value={formData.pipeline_stage} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, pipeline_stage: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectStatus') || "Select stage"} />
            </SelectTrigger>
            <SelectContent>
              {pipelineStages.map(s => (
                <SelectItem key={s.id} value={s.code?.toLowerCase() || s.name.toLowerCase()}>{s.name}</SelectItem>
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
        <div className="space-y-2">
          <Label>{t('estimatedValue') || "Estimated Value"}</Label>
          <Input
            type="number"
            value={formData.estimated_value ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
            placeholder="Deal value"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('probability') || "Probability"} (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.probability ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, probability: Number(e.target.value) }))}
            placeholder="0-100"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('expectedCloseDate') || "Expected Close Date"}</Label>
          <Input
            type="date"
            value={formData.expected_close_date || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('assignedTo') || "Assigned To"}</Label>
          <Select
            value={formData.assigned_user_name}
            onValueChange={(v) => {
              const user = users.find(u => u.name === v);
              setFormData(prev => ({ ...prev, assigned_user_name: v, assigned_user_id: user?.id || "" }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectUser')} />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('currentInsurer') || "Current Insurer"}</Label>
          <Select 
            value={formData.current_insurer} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, current_insurer: v }))}
          >
            <SelectTrigger><SelectValue placeholder="Select Insurer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {insurers.map((i: any) => <SelectItem key={i.id} value={i.companyName || i.name}>{i.companyName || i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('currentTpa') || "Current TPA"}</Label>
          <Select 
            value={formData.current_tpa} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, current_tpa: v }))}
          >
            <SelectTrigger><SelectValue placeholder="Select TPA" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {tpas.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div 
          className="flex items-center justify-between cursor-pointer py-1 select-none"
          onClick={() => setIsProductsExpanded(!isProductsExpanded)}
        >
          <Label className="cursor-pointer flex items-center gap-2">
            {t('requestedProducts') || "Requested Products"}
            <span className="text-[10px] text-muted-foreground font-normal">
              ({formData.requested_products.length} selected)
            </span>
          </Label>
          {isProductsExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
        
        {isProductsExpanded && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 animate-in fade-in duration-200">
            {products.map(product => (
              <label key={product.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-background">
                <input
                  type="checkbox"
                  checked={formData.requested_products.includes(product.name)}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setFormData((prev: any) => ({
                      ...prev,
                      requested_products: checked
                        ? [...prev.requested_products, product.name]
                        : prev.requested_products.filter((p: string) => p !== product.name)
                    }));
                  }}
                  className="rounded"
                />
                <span className="text-sm">{product.name}</span>
              </label>
            ))}
            {products.length === 0 && (
              <p className="text-xs text-slate-400 italic">No products defined in Master Data.</p>
            )}
          </div>
        )}
      </div>

      {/* Advanced Prospect Details */}
      <div className="space-y-4 border-t pt-6">
        <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider">Prospect Negotiation & Negotiation Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Decision Maker</Label>
            <Input
              type="text"
              value={formData.decision_maker || ""}
              onChange={e => setFormData(prev => ({ ...prev, decision_maker: e.target.value }))}
              placeholder="e.g. CEO, HR Manager Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Competitors</Label>
            <Input
              type="text"
              value={formData.competitors ? (Array.isArray(formData.competitors) ? formData.competitors.join(", ") : formData.competitors) : ""}
              onChange={e => setFormData(prev => ({ ...prev, competitors: e.target.value.split(",").map(c => c.trim()).filter(Boolean) }))}
              placeholder="e.g. Competitor A, Competitor B"
            />
          </div>
          <div className="space-y-2">
            <Label>Final Premium (EGP)</Label>
            <Input
              type="number"
              value={formData.final_premium || ""}
              onChange={e => setFormData(prev => ({ ...prev, final_premium: Number(e.target.value) }))}
              placeholder="Final negotiated premium"
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Commission (EGP or %)</Label>
            <Input
              type="number"
              value={formData.commission || ""}
              onChange={e => setFormData(prev => ({ ...prev, commission: Number(e.target.value) }))}
              placeholder="e.g. 5000"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Offer Versions Builder */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider">Pricing Options & Versions</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const current = formData.proposal_versions || [];
              setFormData(prev => ({
                ...prev,
                proposal_versions: [...current, { insurance_company: "", premium: 0, benefits: "", selected: false }]
              }));
            }}
            className="h-8 border-indigo-200 text-primary font-bold hover:bg-primary/10"
          >
            + Add Option Version
          </Button>
        </div>

        <div className="space-y-2">
          {(!formData.proposal_versions || formData.proposal_versions.length === 0) ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed text-center">
              No pricing options logged yet. Click Add Option to record insurer proposals.
            </p>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y">
              {(formData.proposal_versions || []).map((ver, idx) => (
                <div key={idx} className="p-3 bg-card grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase">Insurer *</Label>
                    <Input
                      value={ver.insurance_company || ""}
                      onChange={e => {
                        const updated = [...(formData.proposal_versions || [])];
                        updated[idx].insurance_company = e.target.value;
                        setFormData(prev => ({ ...prev, proposal_versions: updated }));
                      }}
                      placeholder="e.g. AXA, Bupa"
                      className="h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase">Premium (EGP) *</Label>
                    <Input
                      type="number"
                      value={ver.premium || ""}
                      onChange={e => {
                        const updated = [...(formData.proposal_versions || [])];
                        updated[idx].premium = Number(e.target.value);
                        setFormData(prev => ({ ...prev, proposal_versions: updated }));
                      }}
                      className="h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase">Key Benefits / Notes</Label>
                    <Input
                      value={ver.benefits || ""}
                      onChange={e => {
                        const updated = [...(formData.proposal_versions || [])];
                        updated[idx].benefits = e.target.value;
                        setFormData(prev => ({ ...prev, proposal_versions: updated }));
                      }}
                      placeholder="e.g. Tier 1 Network"
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-4 md:pt-0">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!ver.selected}
                        onChange={e => {
                          const updated = (formData.proposal_versions || []).map((v, i) => ({
                            ...v,
                            selected: i === idx ? e.target.checked : false
                          }));
                          const selectedVer = updated[idx];
                          setFormData(prev => ({
                            ...prev,
                            proposal_versions: updated,
                            final_premium: selectedVer.selected ? selectedVer.premium : prev.final_premium,
                            insurance_company: selectedVer.selected ? selectedVer.insurance_company : prev.insurance_company
                          }));
                        }}
                        className="rounded text-primary w-4 h-4"
                      />
                      <span>Active Offer</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = (formData.proposal_versions || []).filter((_, i) => i !== idx);
                        setFormData(prev => ({ ...prev, proposal_versions: updated }));
                      }}
                      className="text-destructive hover:bg-destructive/10 h-8 px-2 font-bold"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('internalNotes')}</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-indigo-700"
        >
          {selectedProspect ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}
