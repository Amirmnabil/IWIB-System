'use server';

/**
 * @fileOverview A Genkit flow that allows users to ask questions and receive AI-generated reports and summaries of key data.
 *
 * This file defines:
 * - `generateAiAssistedReport`: An exported function to trigger the report generation flow.
 * - `AiAssistedReportInput`: The input schema for the flow, defining the user's question and optional data.
 * - `AiAssistedReportOutput`: The output schema for the flow, defining the AI-generated report or summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssistedReportInputSchema = z.object({
  question: z.string().describe('The user question about brokerage performance, claim trends, or policy/payment records.'),
  reportData: z.string().optional().describe('Optional data to provide context for the report generation.'),
});
export type AiAssistedReportInput = z.infer<typeof AiAssistedReportInputSchema>;

const AiAssistedReportOutputSchema = z.object({
  report: z.string().describe('The AI-generated report or summary in response to the user question.'),
});
export type AiAssistedReportOutput = z.infer<typeof AiAssistedReportOutputSchema>;

export async function generateAiAssistedReport(input: AiAssistedReportInput): Promise<AiAssistedReportOutput> {
  return aiAssistedReportFlow(input);
}

const aiAssistedReportPrompt = ai.definePrompt({
  name: 'aiAssistedReportPrompt',
  input: {schema: AiAssistedReportInputSchema},
  output: {schema: AiAssistedReportOutputSchema},
  prompt: `You are an AI assistant designed to generate reports and summaries of key data for an insurance brokerage.

  Based on the user's question and any provided data, generate a comprehensive and informative report or summary.

  User Question: {{{question}}}
  Report Data: {{{reportData}}}

  Ensure the report is well-structured, easy to read, and provides actionable insights.
  If the question cannot be answered with the available information, please state that clearly.
  Be professional and to the point.
  `,
});

const aiAssistedReportFlow = ai.defineFlow(
  {
    name: 'aiAssistedReportFlow',
    inputSchema: AiAssistedReportInputSchema,
    outputSchema: AiAssistedReportOutputSchema,
  },
  async input => {
    const {output} = await aiAssistedReportPrompt(input);
    return output!;
  }
);
