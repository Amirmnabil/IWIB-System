'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating agent performance reports using commission data.
 *
 * It includes:
 * - `generateAgentPerformanceReport`: An exported function to trigger the agent performance report generation flow.
 * - `AgentPerformanceReportInput`: The input schema for the flow, defining required data.
 * - `AgentPerformanceReportOutput`: The output schema for the flow, defining the structure of the generated report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AgentPerformanceReportInputSchema = z.object({
  startDate: z.string().describe('The start date for the report period (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date for the report period (YYYY-MM-DD).'),
  agentId: z.string().optional().describe('Optional: The ID of the specific agent to report on. If not provided, the report will be for all agents.'),
});
export type AgentPerformanceReportInput = z.infer<typeof AgentPerformanceReportInputSchema>;

const AgentPerformanceReportOutputSchema = z.object({
  reportTitle: z.string().describe('Title of the Agent Performance Report'),
  dateRange: z.string().describe('The date range covered by the report.'),
  agentSummary: z.string().describe('A summary of the agent or agents performance during the specified period.'),
  keyMetrics: z.object({
    totalExpectedCommission: z.number().describe('Total expected commission for the period.'),
    totalAccruedCommission: z.number().describe('Total accrued commission for the period.'),
    totalPaidCommission: z.number().describe('Total paid commission for the period.'),
    numberOfPoliciesSold: z.number().describe('Total number of policies sold.'),
  }).describe('Key performance metrics for the agent(s).'),
  areasForImprovement: z.string().describe('Identified areas where the agent(s) can improve their performance.'),
});
export type AgentPerformanceReportOutput = z.infer<typeof AgentPerformanceReportOutputSchema>;

export async function generateAgentPerformanceReport(input: AgentPerformanceReportInput): Promise<AgentPerformanceReportOutput> {
  return agentPerformanceReportFlow(input);
}

const agentPerformanceReportPrompt = ai.definePrompt({
  name: 'agentPerformanceReportPrompt',
  input: {schema: AgentPerformanceReportInputSchema},
  output: {schema: AgentPerformanceReportOutputSchema},
  prompt: `You are an AI assistant designed to generate agent performance reports for an insurance brokerage.

  Generate a comprehensive report summarizing the performance of insurance agents based on the provided commission data.
  The report should cover the period from {{startDate}} to {{endDate}}.

  If agentId is provided ({{agentId}}), focus the report on that specific agent. Otherwise, provide a summary of all agents' performance.

  Include the following sections:

  - **Report Title**: A clear and concise title for the report, including the date range.
  - **Date Range**: The start and end dates covered by the report.
  - **Agent Summary**: A high-level summary of the agent's performance, including key achievements and areas for improvement.
  - **Key Metrics**: A detailed breakdown of key performance indicators (KPIs), including:
    - Total expected commission
    - Total accrued commission
    - Total paid commission
    - Number of policies sold
  - **Areas for Improvement**: Identify specific areas where the agent can improve their performance, such as sales techniques, product knowledge, or customer service.

  Ensure the report is well-structured, easy to read, and provides actionable insights for improving agent performance.
  Be professional and to the point.
  `,
});

const agentPerformanceReportFlow = ai.defineFlow(
  {
    name: 'agentPerformanceReportFlow',
    inputSchema: AgentPerformanceReportInputSchema,
    outputSchema: AgentPerformanceReportOutputSchema,
  },
  async input => {
    const {output} = await agentPerformanceReportPrompt(input);
    return output!;
  }
);
