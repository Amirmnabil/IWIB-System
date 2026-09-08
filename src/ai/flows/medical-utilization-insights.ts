'use server';

/**
 * @fileOverview A medical utilization analysis AI agent.
 *
 * - generateMedicalUtilizationInsights - Analyzes medical consumption data and provides strategic recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MedicalUtilizationInputSchema = z.object({
  companyName: z.string().describe('The name of the client company.'),
  kpis: z.object({
    totalClaims: z.number(),
    totalNetCost: z.number(),
    averageCostPerMember: z.number(),
    lossRatio: z.number().optional(),
    pmpm: z.number().optional(),
  }),
  forecasting: z.object({
    projectedTotal: z.number(),
    nextYearForecast: z.number(),
    forecastedLossRatio: z.number(),
  }).optional(),
  clinicalInsights: z.object({
    chronicCost: z.number(),
    maternityCost: z.number(),
    erCost: z.number(),
  }).optional(),
  topProviders: z.array(z.object({
    name: z.string(),
    cost: z.number(),
    count: z.number(),
  })),
  costByCaseType: z.record(z.number()),
  costByProviderType: z.record(z.number()),
});
export type MedicalUtilizationInput = z.infer<typeof MedicalUtilizationInputSchema>;

const MedicalUtilizationOutputSchema = z.object({
  insights: z.array(z.string()).describe('Key findings and utilization patterns identified.'),
  recommendations: z.array(z.string()).describe('Actionable steps to optimize costs and provider network.'),
  summary: z.string().describe('A high-level executive summary of the health plan performance.'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().describe('The overall risk level of the portfolio.'),
});
export type MedicalUtilizationOutput = z.infer<typeof MedicalUtilizationOutputSchema>;

export async function generateMedicalUtilizationInsights(input: MedicalUtilizationInput): Promise<MedicalUtilizationOutput> {
  return medicalUtilizationInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'medicalUtilizationInsightsPrompt',
  input: {schema: MedicalUtilizationInputSchema},
  output: {schema: MedicalUtilizationOutputSchema},
  prompt: `You are an expert medical insurance actuary and consultant.
  
  Analyze the following medical utilization data for {{companyName}} and provide strategic insights.
  
  KPI Summary:
  - Total Claims: {{kpis.totalClaims}}
  - Total Net Cost: EGP {{kpis.totalNetCost}}
  - Avg Cost Per Member: EGP {{kpis.averageCostPerMember}}
  {{#if kpis.lossRatio}}
  - Current Loss Ratio: {{kpis.lossRatio}}%
  {{/if}}
  {{#if kpis.pmpm}}
  - PMPM (Per Member Per Month): EGP {{kpis.pmpm}}
  {{/if}}
  
  {{#if forecasting}}
  Forecasting & Trends:
  - Projected Year-End Total: EGP {{forecasting.projectedTotal}}
  - Forecasted Year-End Loss Ratio: {{forecasting.forecastedLossRatio}}%
  - Next Year Renewal Forecast (+20% Inflation Base): EGP {{forecasting.nextYearForecast}}
  {{/if}}

  {{#if clinicalInsights}}
  Clinical Cost Drivers:
  - Chronic Conditions Cost: EGP {{clinicalInsights.chronicCost}}
  - Maternity Cost: EGP {{clinicalInsights.maternityCost}}
  - Emergency Room Cost: EGP {{clinicalInsights.erCost}}
  {{/if}}

  Top Providers:
  {{#each topProviders}}
  - {{this.name}}: {{this.count}} claims, EGP {{this.cost}}
  {{/each}}
  
  Task:
  1. Identify primary cost drivers (e.g. chronic burden, catastrophic cases, OON leakage).
  2. Analyze the impact of medical inflation on the next renewal cycle.
  3. Flag abnormal utilization patterns or potential FWA (Fraud, Waste, Abuse).
  4. Suggest 3-5 high-impact recommendations to control costs (e.g. network optimization, benefit redesign, wellness programs).
  5. Provide a risk-rated executive summary.
  
  Be professional, data-driven, and act as a strategic advisor.`,
});

const medicalUtilizationInsightsFlow = ai.defineFlow(
  {
    name: 'medicalUtilizationInsightsFlow',
    inputSchema: MedicalUtilizationInputSchema,
    outputSchema: MedicalUtilizationOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (output) return output;
    } catch (err: any) {
      console.warn("Medical utilization AI insights fallback triggered:", err?.message || err);
    }

    const netCost = input.kpis.totalNetCost || 0;
    const avgCost = input.kpis.averageCostPerMember || 0;
    const topProviderNames = (input.topProviders || []).slice(0, 3).map(p => p.name).join(', ');

    return {
      summary: `Medical utilization report for ${input.companyName}: Total claims processed: ${input.kpis.totalClaims}, Total Net Cost: EGP ${netCost.toLocaleString()}.`,
      insights: [
        topProviderNames ? `High cost concentration observed in top provider networks: ${topProviderNames}.` : 'Concentration of claims observed in primary hospital networks.',
        `Average annual cost per member stands at EGP ${Math.round(avgCost).toLocaleString()}.`,
        input.clinicalInsights?.chronicCost ? `Chronic condition spend accounts for EGP ${input.clinicalInsights.chronicCost.toLocaleString()}.` : 'Clinical cost driver analysis indicates chronic condition management opportunity.'
      ],
      recommendations: [
        'Review network steering and fee schedules with top provider networks.',
        'Implement disease management programs for chronic condition members.',
        'Enforce strict pre-authorization protocols for inpatient and high-cost procedures.'
      ],
      riskLevel: (input.kpis.lossRatio && input.kpis.lossRatio > 80 ? 'High' : 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical'
    };
  }
);
