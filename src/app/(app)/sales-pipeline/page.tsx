'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prospect } from '@/lib/types';
import { predictSalesPipeline } from '@/ai/flows/sales-pipeline-prediction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, DollarSign, GripVertical, Calendar, User as UserIcon, Percent, TrendingUp, Clock } from 'lucide-react';
import { DndContext, closestCorners, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { createProspect } from './actions';
import { StatCard } from '@/components/shared/stat-card';
import { cn, formatCompactNumber } from '@/lib/utils';
import FormDialog from '@/components/shared/FormDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Company, User } from '@/lib/types';
import { useI18n } from '@/components/i18n-context';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';

type SalesPipelinePredictionOutput = {
  predicted_close_dates: {
    company_name: string;
    predicted_close_date: string;
    predicted_revenue: number;
    reasoning: string;
  }[];
  total_predicted_revenue: number;
};

type PipelineStageId =
  | 'qualification'
  | 'needs_analysis'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';


const ProspectCard = ({ prospect }: { prospect: Prospect }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prospect.id });
  const { t } = useI18n();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      whileHover={{ y: -2, scale: 1.01 }}
      className="mb-4 touch-none group"
    >
      <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{prospect.company_name}</h4>
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter py-0 px-1.5 border-border text-slate-400">
                     {prospect.requested_products?.[0] || 'Medical'}
                   </Badge>
                   <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                     <TrendingUp className="w-3 h-3" /> {prospect.probability}%
                   </div>
                </div>
              </div>
              <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-muted-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
               <div className="text-xs font-black text-foreground">
                 {formatCompactNumber(prospect.estimated_value || 0)}
               </div>
               <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-primary" title={prospect.assigned_user_name}>
                    {prospect.assigned_user_name?.charAt(0) || 'U'}
                  </div>
               </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-background/50 flex items-center justify-between">
             <div className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
               <Clock className="w-3 h-3" />
               {prospect.expected_close_date ? format(new Date(prospect.expected_close_date), 'MMM d') : 'No date'}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-primary/100 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PipelineStageColumn = ({
  stage,
  prospectsCount,
  stageValue,
  children,
}: {
  stage: any;
  prospectsCount: number;
  stageValue: number;
  children: React.ReactNode;
}) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-slate-100/50 rounded-2xl flex flex-col h-full min-h-[500px] border border-border/50"
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-foreground text-sm">{stage.title}</h3>
          <Badge variant="secondary" className="bg-card text-muted-foreground shadow-sm border-border">{prospectsCount}</Badge>
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase">
          {formatCompactNumber(stageValue)}
        </p>
        <div className={cn("h-1 w-full rounded-full mt-3", stage.color || "bg-primary/100")} />
      </div>
      {children}
    </div>
  );
};


export default function SalesPipelinePage() {
  const { t } = useI18n();
  const { data: stagesData } = useSupabaseCollection<any>('master_pipeline_stages');

  
  const stages = useMemo(() => {
    if (stagesData && stagesData.length > 0) {
      return [...stagesData].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(stage => ({
        id: stage.code?.toLowerCase() || stage.name.toLowerCase(),
        title: stage.name,
        color: 'bg-primary/100', 
        order: stage.display_order || 0
      }));
    }
    return [
      { id: 'qualification', title: 'Qualification', color: 'bg-primary/100', order: 1 },
      { id: 'needs_analysis', title: 'Needs Analysis', color: 'bg-primary/100', order: 2 },
      { id: 'proposal', title: 'Proposal', color: 'bg-amber-500', order: 3 },
      { id: 'negotiation', title: 'Negotiation', color: 'bg-orange-500', order: 4 },
      { id: 'closed_won', title: 'Closed Won', color: 'bg-success/100', order: 5 },
      { id: 'closed_lost', title: 'Closed Lost', color: 'bg-destructive/100', order: 6 },
    ];
  }, [stagesData]);

  const { data: prospectsData, isLoading } = useSupabaseCollection<Prospect>('prospects');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const isSyncing = useRef(false);

  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
  const [forecastResult, setForecastResult] = useState<SalesPipelinePredictionOutput | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const { toast } = useToast();

  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const companies = companiesData || [];

  const { data: usersData } = useSupabaseCollection<User>('users');
  const users = usersData || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    company_id: "",
    pipeline_stage: "qualification" as PipelineStageId,
    probability: 50,
    estimated_value: 0,
    expected_close_date: new Date().toISOString().split('T')[0],
    assigned_user_name: "",
    notes: ""
  });

  const resetForm = () => {
    setFormData({
      company_name: "",
      company_id: "",
      pipeline_stage: "qualification",
      probability: 50,
      estimated_value: 0,
      expected_close_date: new Date().toISOString().split('T')[0],
      assigned_user_name: "",
      notes: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formPayload.append(key, value.toString());
        }
      });
      
      await createProspect(formPayload);
      
      toast({ title: "Prospect Added", description: `${formData.company_name} added to pipeline.` });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding prospect:", error);
      toast({ variant: "destructive", title: "Add Failed", description: "Could not add prospect to pipeline." });
    }
  };

  // Sync with Firestore data, but avoid loops during drag-and-drop
  useEffect(() => {
    if (prospectsData && !isSyncing.current) {
      setProspects(prospectsData);
    }
  }, [prospectsData]);
  
  const { prospectsByStage, summaryStats } = useMemo(() => {
    const grouped: Record<string, Prospect[]> = {};
    const stageValues: Record<string, number> = {};
    let totalPipelineValue = 0;
    let wonValue = 0;
    let activeProspectsCount = 0;
    let totalWeightedProbability = 0;

    stages.forEach(stage => {
        grouped[stage.id] = [];
        stageValues[stage.id] = 0;
    });

    prospects.forEach(p => {
      if (p.pipeline_stage && grouped[p.pipeline_stage]) {
        grouped[p.pipeline_stage].push(p);
        stageValues[p.pipeline_stage] += p.estimated_value || 0;
        
        if (p.pipeline_stage !== 'closed_won' && p.pipeline_stage !== 'closed_lost') {
          totalPipelineValue += p.estimated_value || 0;
          activeProspectsCount++;
          totalWeightedProbability += (p.probability || 0);
        } else if (p.pipeline_stage === 'closed_won') {
          wonValue += p.estimated_value || 0;
        }
      }
    });
    
    const avgProbability = activeProspectsCount > 0 ? totalWeightedProbability / activeProspectsCount : 0;

    return { 
        prospectsByStage: grouped, 
        summaryStats: {
            pipelineValue: totalPipelineValue,
            wonValue: wonValue,
            activeProspects: activeProspectsCount,
            avgProbability: avgProbability,
            stageValues: stageValues,
        }
    };
  }, [prospects]);

  const handleForecast = async () => {
    setIsForecastModalOpen(true);
    setIsForecasting(true);
    setForecastResult(null);

    const activeProspects = prospects.filter(p => p.pipeline_stage !== 'closed_won' && p.pipeline_stage !== 'closed_lost');

    try {
      if(activeProspects.length === 0){
        toast({
          variant: 'destructive',
          title: 'No Active Prospects',
          description: 'There are no active prospects to forecast.',
        });
        setIsForecastModalOpen(false);
        return;
      }
      const result = await predictSalesPipeline({ 
        prospects: activeProspects.map(p => ({
          company_name: p.company_name,
          pipeline_stage: p.pipeline_stage,
          probability: p.probability || 0,
          estimated_value: p.estimated_value || 0,
          expected_close_date: p.expected_close_date || new Date().toISOString()
        }))
      });
      setForecastResult(result);
    } catch (error) {
      console.error('AI forecast failed:', error);
      toast({
        variant: 'destructive',
        title: 'Forecast Failed',
        description: 'The AI sales pipeline forecast could not be generated.',
      });
      setIsForecastModalOpen(false);
    } finally {
      setIsForecasting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !prospects.find(p => p.id === active.id)) {
      return;
    }

    const activeProspect = prospects.find(p => p.id === active.id);
    const overStageId = stages.find(stage => stage.id === over.id || prospectsByStage[stage.id]?.some(p => p.id === over.id))?.id;
    
    if (activeProspect && overStageId && activeProspect.pipeline_stage !== overStageId) {
      isSyncing.current = true;
      
      // Update local state for immediate feedback
      setProspects(prev => prev.map(p => p.id === active.id ? { ...p, pipeline_stage: overStageId } : p));
      
      try {
        const { error } = await supabase.from('prospects').update({ pipeline_stage: overStageId }).eq('id', active.id);
        if (error) throw error;
        toast({
          title: 'Prospect Updated',
          description: `${activeProspect.company_name} moved to ${stages.find(s => s.id === overStageId)?.title}.`,
        });
      } catch (error) {
        console.error("Error updating prospect stage:", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update prospect stage. Reverting.",
        });
        setProspects(prospectsData || []);
      } finally {
        isSyncing.current = false;
      }
    }
  };

  if(isLoading && prospects.length === 0) {
    return (
       <>
        <PageHeader title="Sales Pipeline"  />
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28 w-full"/>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stages.map(stage => (
                <div key={stage.id} className="bg-slate-100 rounded-lg p-4">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                </div>
            ))}
            </div>
        </div>
      </>
    )
  }
  
  return (
    <>
      <PageHeader
        title="Sales Pipeline"
        
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
            Add Prospect
          </Button>
          <Button onClick={handleForecast} disabled={isForecasting}>
            <Bot className="mr-2 h-4 w-4" />
            {isForecasting ? 'Forecasting...' : 'AI Forecast'}
          </Button>
        </div>
      </PageHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pipeline Value" value={formatCompactNumber(summaryStats.pipelineValue)} icon={DollarSign} color="bg-primary" />
        <StatCard title="Won Value" value={formatCompactNumber(summaryStats.wonValue)} icon={DollarSign} color="bg-success/100" />
        <StatCard title="Active Prospects" value={summaryStats.activeProspects} icon={TrendingUp} color="bg-orange-500" />
        <StatCard title="Avg. Probability" value={`${summaryStats.avgProbability.toFixed(0)}%`} icon={Percent} color="bg-violet-500" />
      </div>

       <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-[1200px]">
            {stages.map((stage: any) => (
              <PipelineStageColumn
                key={stage.id}
                stage={stage}
                prospectsCount={prospectsByStage[stage.id]?.length || 0}
                stageValue={summaryStats.stageValues[stage.id] || 0}
              >
                <SortableContext items={prospectsByStage[stage.id]?.map(p => p.id) || []} id={stage.id} strategy={verticalListSortingStrategy}>
                  <div className="p-3 flex-1">
                    {prospectsByStage[stage.id]?.length > 0 ? (
                        prospectsByStage[stage.id]?.map((prospect) => (
                          <ProspectCard key={prospect.id} prospect={prospect} />
                        ))
                    ) : (
                       <div className="flex items-center justify-center h-24 text-[10px] font-bold text-slate-300 border-2 border-dashed border-border rounded-2xl">
                        {t('emptyStage') || "DROP HERE"}
                       </div>
                    )}
                  </div>
                </SortableContext>
              </PipelineStageColumn>
            ))}
          </div>
        </div>
      </DndContext>
      <Dialog open={isForecastModalOpen} onOpenChange={setIsForecastModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI Sales Pipeline Forecast</DialogTitle>
            <DialogDescription>
              The AI has analyzed your pipeline and predicted close dates and revenue.
            </DialogDescription>
          </DialogHeader>
          {isForecasting && (
            <div className="space-y-4 py-8">
              <p className="text-center text-muted-foreground">The AI is analyzing your pipeline... this may take a moment.</p>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <div className="flex justify-end pt-4">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          )}
          {forecastResult && (
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Total Predicted Revenue: {formatCompactNumber(forecastResult.total_predicted_revenue)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Predicted Revenue</TableHead>
                        <TableHead>Predicted Close Date</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecastResult.predicted_close_dates.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.company_name}</TableCell>
                          <TableCell>{formatCompactNumber(item.predicted_revenue)}</TableCell>
                          <TableCell>{new Date(item.predicted_close_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.reasoning}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title="Add Prospect to Pipeline"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select 
                value={formData.company_id} 
                onValueChange={(v) => {
                  const company = companies.find(c => c.id === v);
                  setFormData({ ...formData, company_id: v, company_name: company?.name || "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Stage</Label>
              <Select value={formData.pipeline_stage} onValueChange={(v) => setFormData({ ...formData, pipeline_stage: v as PipelineStageId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Value (EGP)</Label>
              <Input type="number" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" value={formData.probability} onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Expected Close Date</Label>
              <Input type="date" value={formData.expected_close_date} onChange={e => setFormData({ ...formData, expected_close_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formData.assigned_user_name} onValueChange={v => setFormData({ ...formData, assigned_user_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Strategy and next steps..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700">Add to Pipeline</Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
