'use client';
import React from "react";
import { format } from "date-fns";
import {
  BarChart3,
  DollarSign,
  Building2,
  Percent,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { sampleClaims, sampleCommissions, sampleCompanies, samplePolicies, sampleRenewals } from "@/lib/data";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Analytics() {
  const policies = samplePolicies;
  const claims = sampleClaims;
  const commissions = sampleCommissions;
  const renewals = sampleRenewals;
  const companies = sampleCompanies;
  const isLoading = false;

  // Calculate metrics
  const activePolicies = policies.filter(p => p.policy_status === 'active');
  const totalPremium = activePolicies.reduce((sum, p) => sum + (p.premium_total || 0), 0);
  const totalClaims = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
  const paidClaims = claims.filter(c => c.status === 'paid' || c.status === 'approved').reduce((sum, c) => sum + (c.approved_amount || c.claim_amount || 0), 0);
  const lossRatio = totalPremium > 0 ? ((paidClaims / totalPremium) * 100) : 0;
  const fraudFlags = claims.filter(c => c.fraud_flag).length;
  const clients = companies.filter(c => c.status === 'client').length;

  // Claims by type
  const claimsByType = claims.reduce((acc: Record<string, number>, claim) => {
    const type = claim.claim_type || 'other';
    acc[type] = (acc[type] || 0) + (claim.claim_amount || 0);
    return acc;
  }, {});

  const claimsTypeData = Object.entries(claimsByType).map(([type, amount]) => ({
    name: type,
    value: amount
  }));

  // Policies by type
  const policiesByType = policies.reduce((acc: Record<string, number>, policy) => {
    acc[policy.policy_type] = (acc[policy.policy_type] || 0) + 1;
    return acc;
  }, {});

  const policyTypeData = Object.entries(policiesByType).map(([type, count]) => ({
    name: type,
    count
  }));

  // Claims by status
  const claimsByStatus = claims.reduce((acc: Record<string, number>, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {});

  const claimsStatusData = Object.entries(claimsByStatus).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    count
  }));

  // Renewal performance
  const renewedCount = renewals.filter(r => r.renewal_status === 'renewed').length;
  const lostCount = renewals.filter(r => r.renewal_status === 'lost').length;
  const renewalRate = (renewedCount + lostCount) > 0 ? (renewedCount / (renewedCount + lostCount)) * 100 : 0;

  // Premium by insurer (mock monthly data for trend)
  const monthlyData = [
    { month: 'Jan', premium: totalPremium * 0.08, claims: totalClaims * 0.07 },
    { month: 'Feb', premium: totalPremium * 0.08, claims: totalClaims * 0.09 },
    { month: 'Mar', premium: totalPremium * 0.09, claims: totalClaims * 0.08 },
    { month: 'Apr', premium: totalPremium * 0.08, claims: totalClaims * 0.10 },
    { month: 'May', premium: totalPremium * 0.09, claims: totalClaims * 0.08 },
    { month: 'Jun', premium: totalPremium * 0.09, claims: totalClaims * 0.09 },
    { month: 'Jul', premium: totalPremium * 0.08, claims: totalClaims * 0.07 },
    { month: 'Aug', premium: totalPremium * 0.08, claims: totalClaims * 0.08 },
    { month: 'Sep', premium: totalPremium * 0.09, claims: totalClaims * 0.09 },
    { month: 'Oct', premium: totalPremium * 0.08, claims: totalClaims * 0.10 },
    { month: 'Nov', premium: totalPremium * 0.08, claims: totalClaims * 0.08 },
    { month: 'Dec', premium: totalPremium * 0.08, claims: totalClaims * 0.07 }
  ];

  // Top clients by premium
  const clientPremiums = policies.reduce((acc: Record<string, number>, policy) => {
    const client = policy.client_company_name || 'Unknown';
    acc[client] = (acc[client] || 0) + (policy.premium_total || 0);
    return acc;
  }, {});

  const topClients = Object.entries(clientPremiums)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, premium]) => ({ name, premium }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Business intelligence and performance metrics"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Premium"
          value={`EGP ${(totalPremium / 1000000).toFixed(2)}M`}
          icon={DollarSign}
          description="+12% YTD"
          color="bg-indigo-500"
          loading={isLoading}
        />
        <StatCard
          title="Loss Ratio"
          value={`${lossRatio.toFixed(1)}%`}
          icon={Percent}
          description={lossRatio > 70 ? "Above target" : "On target"}
          color={lossRatio > 70 ? "bg-red-500" : "bg-emerald-500"}
          loading={isLoading}
        />
        <StatCard
          title="Active Clients"
          value={clients}
          icon={Building2}
          description="+8 this month"
          color="bg-violet-500"
          loading={isLoading}
        />
        <StatCard
          title="Fraud Alerts"
          value={fraudFlags}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Premium vs Claims Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Premium vs Claims Trend</CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `EGP ${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `EGP ${v.toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="premium" stackId="1" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.3} name="Premium" />
                    <Area type="monotone" dataKey="claims" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} name="Claims" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claims Distribution</CardTitle>
            <CardDescription>By claim type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : claimsTypeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={claimsTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {claimsTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `EGP ${v.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No claims data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Mix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Policy Mix</CardTitle>
            <CardDescription>By insurance type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policyTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claims Status</CardTitle>
            <CardDescription>Current pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={claimsStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Renewal Rate</span>
                <span className="font-medium">{renewalRate.toFixed(0)}%</span>
              </div>
              <Progress value={renewalRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Claims Approval Rate</span>
                <span className="font-medium">
                  {claims.length > 0 ? ((claims.filter(c => c.status === 'approved' || c.status === 'paid').length / claims.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Progress 
                value={claims.length > 0 ? (claims.filter(c => c.status === 'approved' || c.status === 'paid').length / claims.length) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Commission Collection</span>
                <span className="font-medium">
                  {commissions.length > 0 ? ((commissions.filter(c => c.commission_status === 'paid').length / commissions.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Progress 
                value={commissions.length > 0 ? (commissions.filter(c => c.commission_status === 'paid').length / commissions.length) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Loss Ratio Target (70%)</span>
                <span className={`font-medium ${lossRatio > 70 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {lossRatio.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(lossRatio, 100)} 
                className={`h-2 ${lossRatio > 70 ? '[&>div]:bg-red-500' : ''}`} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Clients by Premium</CardTitle>
          <CardDescription>Highest value accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      ['bg-indigo-100', 'bg-emerald-100', 'bg-amber-100', 'bg-violet-100', 'bg-pink-100'][index]
                    }`}>
                      <span className={`text-sm font-bold ${
                        ['text-indigo-600', 'text-emerald-600', 'text-amber-600', 'text-violet-600', 'text-pink-600'][index]
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{client.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">EGP {client.premium.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">
                      {totalPremium > 0 ? ((client.premium / totalPremium) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              No policy data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
