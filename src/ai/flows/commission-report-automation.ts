'use server';

/**
 * @fileOverview This file defines a Genkit flow for automating the generation of agent performance reports based on commission data.
 *
 * It includes:
 * - `generateCommissionReport`: An exported function to trigger the commission report generation flow.
 * - `CommissionReportInput`: The input schema for the flow, defining the required data.
 * - `CommissionReportOutput`: The output schema for the flow, defining the structure of the generated report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CommissionReportInputSchema = z.object({
  startDate: z.string().describe('The start date for the report period (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date for the report period (YYYY-MM-DD).'),
  agentId: z.string().optional().describe('Optional: The ID of the specific agent to report on. If not provided, the report will be for all agents.'),
});
export type CommissionReportInput = z.infer<typeof CommissionReportInputSchema>;

const CommissionReportOutputSchema = z.object({
  reportTitle: z.string().describe('Title of the Commission Report'),
  dateRange: z.string().describe('The date range covered by the report.'),
  agentSummary: z.string().describe('A summary of the agent or agents performance during the specified period, including total commissions earned, average deal size, and conversion rates.'),
  keyMetrics: z.object({
    totalCommissionsEarned: z.number().describe('Total commissions earned for the period.'),
    averageDealSize: z.number().describe('Average deal size during the period.'),
    conversionRate: z.number().describe('Conversion rate during the period.'),
    numberOfPoliciesSold: z.number().describe('Total number of policies sold.'),
  }).describe('Key performance metrics for the agent(s).'),
  areasForImprovement: z.string().describe('Identified areas where the agent(s) can improve their performance.'),
});
export type CommissionReportOutput = z.infer<typeof CommissionReportOutputSchema>;

export async function generateCommissionReport(input: CommissionReportInput): Promise<CommissionReportOutput> {
  return commissionReportFlow(input);
}

const commissionReportPrompt = ai.definePrompt({
  name: 'commissionReportPrompt',
  input: {schema: CommissionReportInputSchema},
  output: {schema: CommissionReportOutputSchema},
  prompt: `You are an AI assistant designed to generate agent performance reports based on commission data for an insurance brokerage.

  Generate a comprehensive report summarizing the performance of insurance agents based on the provided commission data. The report should cover the period from {{startDate}} to {{endDate}}.

  If agentId is provided ({{agentId}}), focus the report on that specific agent. Otherwise, provide a summary of all agents' performance.

  Include the following sections:

  - **Report Title**: A clear and concise title for the report, including the date range.
  - **Date Range**: The start and end dates covered by the report.
  - **Agent Summary**: A high-level summary of the agent's performance, including key achievements and areas for improvement, with metrics like total commissions earned, average deal size, and conversion rates.
  - **Key Metrics**: A detailed breakdown of key performance indicators (KPIs), including:
    - Total commissions earned
    - Average deal size
    - Conversion rate
    - Number of policies sold
  - **Areas for Improvement**: Identify specific areas where the agent can improve their performance, such as sales techniques, product knowledge, or customer service.

  Ensure the report is well-structured, easy to read, and provides actionable insights for improving agent performance. Be professional and to the point.
  `,
});

const commissionReportFlow = ai.defineFlow(
  {
    name: 'commissionReportFlow',
    inputSchema: CommissionReportInputSchema,
    outputSchema: CommissionReportOutputSchema,
  },
  async input => {
    const {output} = await commissionReportPrompt(input);
    return output!;
  }
);
