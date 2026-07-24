import React from "react";
import { AlertCircle, DollarSign, Percent, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-context";

interface ConvertToProspectFormProps {
  conversionData: any;
  setConversionData: React.Dispatch<React.SetStateAction<any>>;
  selectedLead: any;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ConvertToProspectForm({
  conversionData,
  setConversionData,
  selectedLead,
  isProcessing,
  onSubmit,
  onCancel
}: ConvertToProspectFormProps) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit} className="space-y-8 py-2">
      <div className="flex items-center gap-3 p-4 bg-primary/10 border border-indigo-100 rounded-xl">
        <AlertCircle className="w-5 h-5 text-primary shrink-0" />
        <div className="text-sm text-indigo-900">
          <p className="font-bold">{t('convertToProspect')}: {selectedLead?.company_name || selectedLead?.name}</p>
          <p className="opacity-70">{t('readyForDiagnosticsDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-700">{t('estimatedPremium')} (egp)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              className="pl-10 h-12 text-lg font-bold"
              value={conversionData.estimated_value ?? ''}
              onChange={e => setConversionData((prev: any) => ({ ...prev, estimated_value: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-700">{t('closingProbability')} (%)</Label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              className="pl-10 h-12 text-lg font-bold"
              value={conversionData.probability ?? ''}
              max={100} min={0}
              onChange={e => setConversionData((prev: any) => ({ ...prev, probability: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-700">{t('expectedCloseDate')}</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="date"
              className="pl-10 h-12"
              value={conversionData.expected_close_date || ''}
              onChange={e => setConversionData((prev: any) => ({ ...prev, expected_close_date: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase text-slate-700">{t('internalNotes')}</Label>
        <Textarea
          rows={4}
          placeholder={t('internalNotes')}
          value={conversionData.notes}
          onChange={e => setConversionData((prev: any) => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t w-full">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isProcessing}
        >
          {t('cancel')}
        </Button>
        <Button 
          type="submit" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 shadow-md" 
          disabled={isProcessing}
        >
          {t('finalizeConversion')}
        </Button>
      </div>
    </form>
  );
}
