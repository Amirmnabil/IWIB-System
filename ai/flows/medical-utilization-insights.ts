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
  }),
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
  
  Top Providers:
  {{#each topProviders}}
  - {{this.name}}: {{this.count}} claims, EGP {{this.cost}}
  {{/each}}
  
  Task:
  1. Identify cost drivers (e.g. pharmacy overuse, specific providers).
  2. Flag abnormal utilization patterns.
  3. Suggest recommendations to control costs (e.g. co-payment adjustments, network optimization).
  4. Provide an executive summary.
  
  Be professional, data-driven, and concise.`,
});

const medicalUtilizationInsightsFlow = ai.defineFlow(
  {
    name: 'medicalUtilizationInsightsFlow',
    inputSchema: MedicalUtilizationInputSchema,
    outputSchema: MedicalUtilizationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
