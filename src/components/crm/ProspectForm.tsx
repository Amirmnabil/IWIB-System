import React from "react";
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
              {pipelineStages.length === 0 && <SelectItem value="qualification">{t('qualification') || "Qualification"}</SelectItem>}
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
        <Label>{t('requestedProducts') || "Requested Products"}</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
