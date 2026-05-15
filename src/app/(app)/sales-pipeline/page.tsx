'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prospect } from '@/lib/types';
import { predictSalesPipeline } from '@/ai/flows/sales-pipeline-prediction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, DollarSign, GripVertical, Calendar, User as UserIcon, Percent, TrendingUp } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, doc, updateDoc } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/stat-card';
import { cn } from '@/lib/utils';
import FormDialog from '@/components/shared/FormDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Company, User } from '@/lib/types';

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

const pipelineStages: { id: PipelineStageId; title: string, color: string }[] = [
  { id: 'qualification', title: 'Qualification', color: 'bg-blue-500' },
  { id: 'needs_analysis', title: 'Needs Analysis', color: 'bg-indigo-500' },
  { id: 'proposal', title: 'Proposal', color: 'bg-amber-500' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', title: 'Closed Won', color: 'bg-emerald-500' },
  { id: 'closed_lost', title: 'Closed Lost', color: 'bg-red-500' },
];

const ProspectCard = ({ prospect }: { prospect: Prospect }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prospect.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-4 touch-none bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
           <button {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 p-1">
             <GripVertical className="w-5 h-5" />
           </button>
           <div className="flex-1 min-w-0">
             <h4 className="font-semibold truncate">{prospect.company_name}</h4>
             <div className="text-sm text-slate-600 flex items-center gap-1 mt-2">
               <DollarSign className="w-3 h-3 text-slate-400" />
               {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(prospect.estimated_value || 0)}
             </div>
             <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
               <Percent className="w-3 h-3 text-slate-400" />
               {prospect.probability || 0}% probability
             </div>
             <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
               <Calendar className="w-3 h-3 text-slate-400" />
               <span className="truncate">{prospect.expected_close_date ? new Date(prospect.expected_close_date).toLocaleDateString() : 'N/A'}</span>
             </div>
             {prospect.assigned_user_name && (
                <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                   <UserIcon className="w-3 h-3 text-slate-400" />
                   <span className="truncate">{prospect.assigned_user_name}</span>
                </div>
             )}
           </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function SalesPipelinePage() {
  const firestore = useFirestore();
  const prospectsRef = useMemoFirebase(() => collection(firestore!, 'prospects'), [firestore]);
  const { data: prospectsData, isLoading } = useCollection<Prospect>(prospectsRef);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const isSyncing = useRef(false);

  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
  const [forecastResult, setForecastResult] = useState<SalesPipelinePredictionOutput | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const { toast } = useToast();

  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
  const { data: companiesData } = useCollection<Company>(companiesRef);
  const companies = companiesData || [];

  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);
  const { data: usersData } = useCollection<User>(usersRef);
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
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'prospects'), {
        ...formData,
        created_at: new Date().toISOString(),
        requested_products: []
      });
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

    pipelineStages.forEach(stage => {
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
    const overStageId = pipelineStages.find(stage => stage.id === over.id || prospectsByStage[stage.id]?.some(p => p.id === over.id))?.id;
    
    if (activeProspect && overStageId && activeProspect.pipeline_stage !== overStageId) {
      isSyncing.current = true;
      
      // Update local state for immediate feedback
      setProspects(prev => prev.map(p => p.id === active.id ? { ...p, pipeline_stage: overStageId } : p));
      
      if(firestore) {
        try {
          const prospectRef = doc(firestore, 'prospects', active.id as string);
          await updateDoc(prospectRef, { pipeline_stage: overStageId });
           toast({
            title: 'Prospect Updated',
            description: `${activeProspect.company_name} moved to ${pipelineStages.find(s => s.id === overStageId)?.title}.`,
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
      } else {
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
            {pipelineStages.map(stage => (
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
        <StatCard title="Pipeline Value" value={`EGP ${(summaryStats.pipelineValue/1000).toFixed(0)}K`} icon={DollarSign} color="bg-indigo-500" />
        <StatCard title="Won Value" value={`EGP ${(summaryStats.wonValue/1000).toFixed(0)}K`} icon={DollarSign} color="bg-emerald-500" />
        <StatCard title="Active Prospects" value={summaryStats.activeProspects} icon={TrendingUp} color="bg-amber-500" />
        <StatCard title="Avg. Probability" value={`${summaryStats.avgProbability.toFixed(0)}%`} icon={Percent} color="bg-violet-500" />
      </div>

       <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-[1200px]">
            {pipelineStages.map((stage) => (
              <div key={stage.id} id={stage.id} className="bg-slate-100/80 rounded-lg flex flex-col h-full min-h-[500px]">
                <div className={cn("p-4 rounded-t-lg text-white", stage.color)}>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{stage.title}</h3>
                    <Badge variant="secondary" className="bg-white/20 text-white">{prospectsByStage[stage.id]?.length || 0}</Badge>
                  </div>
                  <p className="text-white/80 text-xs mt-1">
                    EGP {(summaryStats.stageValues[stage.id] || 0).toLocaleString()}
                  </p>
                </div>
                <SortableContext items={prospectsByStage[stage.id]?.map(p => p.id) || []} id={stage.id} strategy={verticalListSortingStrategy}>
                  <div className="p-4 flex-1">
                    {prospectsByStage[stage.id]?.length > 0 ? (
                        prospectsByStage[stage.id]?.map((prospect) => (
                          <ProspectCard key={prospect.id} prospect={prospect} />
                        ))
                    ) : (
                       <div className="flex items-center justify-center h-20 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        Empty Stage
                       </div>
                    )}
                  </div>
                </SortableContext>
              </div>
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
              <p className="text-center text-slate-500">The AI is analyzing your pipeline... this may take a moment.</p>
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
                    Total Predicted Revenue: {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(forecastResult.total_predicted_revenue)}
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
                          <TableCell>{new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(item.predicted_revenue)}</TableCell>
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
                  {pipelineStages.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Add to Pipeline</Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}