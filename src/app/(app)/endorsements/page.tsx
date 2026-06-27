"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function EndorsementsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");

  // Mock data for the scaffolding
  const endorsements = [
    { id: "END-2026-001", policyNo: "POL-78291", client: "TechFlow Solutions", type: "Add Members", status: "pending", date: "2026-06-25", impact: "+EGP 1,200.00" },
    { id: "END-2026-002", policyNo: "POL-11928", client: "Global Industries", type: "Modify Data", status: "approved", date: "2026-06-20", impact: "EGP 0.00" },
    { id: "END-2026-003", policyNo: "POL-55421", client: "Nexus Retail", type: "Delete Members", status: "draft", date: "2026-06-26", impact: "-EGP 450.00" },
    { id: "END-2026-004", policyNo: "POL-33211", client: "Alpha Corp", type: "Financial Adjustment", status: "rejected", date: "2026-06-15", impact: "+EGP 3,500.00" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase rounded-full border border-amber-200">Pending</span>;
      case "approved": return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-full border border-emerald-200">Approved</span>;
      case "rejected": return <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold uppercase rounded-full border border-rose-200">Rejected</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase rounded-full border border-slate-200">Draft</span>;
    }
  };

  const getImpactColor = (impact: string) => {
    if (impact.startsWith("+")) return "text-rose-600 font-semibold";
    if (impact.startsWith("-")) return "text-emerald-600 font-semibold";
    return "text-slate-500";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Endorsements Hub</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage all policy modifications and financial adjustments.</p>
        </div>
        <Button onClick={() => router.push('/endorsements/create')} className="bg-[#2A75F3] hover:bg-blue-700 h-12 px-6 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Create Endorsement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600"><FileText className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Drafts</p>
              <h3 className="text-3xl font-black text-slate-800">12</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Insurer</p>
              <h3 className="text-3xl font-black text-slate-800">8</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Approved (MTD)</p>
              <h3 className="text-3xl font-black text-slate-800">45</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertTriangle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Fin. Impact</p>
              <h3 className="text-3xl font-black text-slate-800">+EGP 12.4k</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-border flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg font-bold">Recent Endorsements</CardTitle>
          <Button variant="outline" size="sm" className="h-9 rounded-lg"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-border text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">ID / Ref</th>
                <th className="p-4">Client / Policy</th>
                <th className="p-4">Type</th>
                <th className="p-4">Date</th>
                <th className="p-4">Financial Impact</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {endorsements.map((end) => (
                <tr key={end.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => router.push(`/endorsements/${end.id}`)}>
                  <td className="p-4 pl-6 font-bold text-[#2A75F3]">{end.id}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{end.client}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{end.policyNo}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{end.type}</td>
                  <td className="p-4 text-slate-600">{end.date}</td>
                  <td className={`p-4 ${getImpactColor(end.impact)}`}>{end.impact}</td>
                  <td className="p-4">{getStatusBadge(end.status)}</td>
                  <td className="p-4 pr-6 text-right">
                    <Button variant="ghost" size="sm" className="text-slate-400 group-hover:text-blue-600">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
