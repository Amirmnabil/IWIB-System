'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { FileText, Search, Loader2, ArrowUpRight, Calculator, FileSignature } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-context";

export default function QuotationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch prospects (as these are the entities that need quoting)
  const { data: prospects, isLoading } = useSupabaseCollection<any>('prospects');
  
  // Filter for prospects that are in qualification or proposal stage
  const pendingQuotations = (prospects || []).filter((p: any) => 
    p.pipeline_stage === 'qualification' || p.pipeline_stage === 'proposal'
  );

  const filteredQuotations = pendingQuotations.filter((p: any) => 
    p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.current_insurer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quotations Pricing</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage and price SME & Corporate offers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search companies..." 
              className="pl-9 h-10 bg-white border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
          <CardContent className="p-6">
            <Calculator className="w-8 h-8 opacity-50 mb-4" />
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Pending Pricing</p>
            <p className="text-4xl font-black mt-1">{pendingQuotations.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className="font-bold text-slate-400">Loading quotations...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="py-20 text-center">
              <FileSignature className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600 mb-1">No pending quotations</h3>
              <p className="text-sm text-slate-400">All prospect requests have been priced.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Expected Premium</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Current Insurer</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredQuotations.map((q: any) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{q.company_name}</span>
                        <p className="text-[10px] text-slate-500 uppercase mt-1 tracking-wider">Requested: {format(new Date(q.created_at), 'MMM d, yyyy')}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-600">
                        {q.estimated_value > 0 ? `${q.estimated_value.toLocaleString()} EGP` : 'TBD'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={q.pipeline_stage} />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {q.current_insurer || 'None'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          onClick={() => router.push(`/companies/${q.company_id}`)}
                          variant="ghost" 
                          className="font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl"
                        >
                          Price Offer <ArrowUpRight className="w-4 h-4 ml-2" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
