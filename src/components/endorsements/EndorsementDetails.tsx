"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ArrowRight, Download, Send, CheckCircle, XCircle, FileText, Activity, Users, Banknote } from "lucide-react";

export default function EndorsementDetails({ id }: { id: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("diff");

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6 animate-in fade-in zoom-in duration-500">
      {/* Top Header Row */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/endorsements')} className="h-12 w-12 p-0 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-50">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{id}</h1>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase rounded-full border border-amber-200">Pending Insurer</span>
            </div>
            <p className="text-slate-500 font-medium text-sm">TechFlow Solutions • Policy POL-78291 • Type: Addition</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-12 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold">
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </Button>
          <Button className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200">
            <CheckCircle className="w-4 h-4 mr-2" /> Approve & Upload PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Diff */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent p-0 w-full justify-start space-x-6 h-auto">
                  <TabsTrigger value="diff" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Changes (Diff)</TabsTrigger>
                  <TabsTrigger value="docs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Documents</TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none pb-2 font-bold text-slate-500 px-0">Audit Trail</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {activeTab === "diff" && (
                <div className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Members Added (+2)</h3>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                      <tr>
                        <th className="p-3 rounded-tl-lg">Name</th>
                        <th className="p-3">Relation</th>
                        <th className="p-3">Effective Date</th>
                        <th className="p-3 rounded-tr-lg">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-emerald-50/50 border-b border-emerald-100">
                        <td className="p-3 font-semibold text-emerald-800 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ahmed Hassan</td>
                        <td className="p-3 text-emerald-700">Employee</td>
                        <td className="p-3 text-emerald-700">Jun 25, 2026</td>
                        <td className="p-3 text-emerald-700 font-mono">Class A</td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="p-3 font-semibold text-emerald-800 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sarah Hassan</td>
                        <td className="p-3 text-emerald-700">Spouse</td>
                        <td className="p-3 text-emerald-700">Jun 25, 2026</td>
                        <td className="p-3 text-emerald-700 font-mono">Class A</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <h3 className="font-bold text-slate-800 mb-4 mt-8 flex items-center gap-2"><Users className="w-5 h-5 text-rose-500" /> Members Deleted (-1)</h3>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                      <tr>
                        <th className="p-3 rounded-tl-lg">Name</th>
                        <th className="p-3">Relation</th>
                        <th className="p-3">Deletion Date</th>
                        <th className="p-3 rounded-tr-lg">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-rose-50/50">
                        <td className="p-3 font-semibold text-rose-800 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" /> Omar Fathy</td>
                        <td className="p-3 text-rose-700">Employee</td>
                        <td className="p-3 text-rose-700">Jun 24, 2026</td>
                        <td className="p-3 text-rose-700 font-mono">Class B</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {activeTab === "docs" && (
                <div className="p-6 space-y-4">
                  <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-slate-800">HR_Census_Upload.xlsx</p>
                        <p className="text-xs text-slate-500">Uploaded by HR Manager • Jun 25, 2026</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
              {activeTab === "audit" && (
                <div className="p-6 relative">
                  <div className="absolute left-9 top-8 bottom-8 w-px bg-slate-200"></div>
                  <div className="space-y-6 relative z-10">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center mt-0.5"><div className="w-2 h-2 bg-blue-600 rounded-full" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Broker Submitted to Insurer</p>
                        <p className="text-xs text-slate-500">Amir Nabil • Today, 10:45 AM</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center mt-0.5"><div className="w-2 h-2 bg-slate-400 rounded-full" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Draft Created & Calculated</p>
                        <p className="text-xs text-slate-500">System • Today, 10:15 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border"><CardTitle className="text-base font-bold">Comments & Workflow</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-4">
              <Textarea placeholder="Add a comment or rejection reason..." className="rounded-xl border-slate-200 bg-slate-50 h-24" />
              <Button className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold"><Send className="w-4 h-4 mr-2" /> Send Message</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financials */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-slate-900 text-white relative">
            <div className="absolute -right-4 -top-4 opacity-10"><Banknote className="w-32 h-32" /></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-blue-300 font-bold tracking-wider uppercase text-xs mb-1">Financial Impact</p>
              <h2 className="text-4xl font-black text-white mb-6">+EGP 1,245.50</h2>
              
              <div className="space-y-3 pt-6 border-t border-slate-700 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Additions Premium:</span>
                  <span className="font-mono text-white">+EGP 1,500.00</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Deletions Credit:</span>
                  <span className="font-mono text-emerald-400">-EGP 400.00</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Net Pro-Rata Premium:</span>
                  <span className="font-mono text-white">+EGP 1,100.00</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-3 border-t border-slate-700/50">
                  <span>Taxes (13.2%):</span>
                  <span className="font-mono text-white">+EGP 145.50</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border"><CardTitle className="text-base font-bold">Outputs</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold justify-start" disabled>
                <FileText className="w-4 h-4 mr-3 text-slate-400" /> Endorsement Cert (Pending)
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold justify-start text-blue-700 border-blue-200 bg-blue-50">
                <Download className="w-4 h-4 mr-3" /> Download Debit Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
