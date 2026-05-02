'use server';

/**
 * @fileOverview A report summarization AI agent.
 *
 * - generateReportSummaries - A function that generates summaries for various reports.
 * - GenerateReportSummariesInput - The input type for the generateReportSummaries function.
 * - GenerateReportSummariesOutput - The return type for the generateReportSummaries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportSummariesInputSchema = z.object({
  reportType: z
    .string()
    .describe('The type of report to summarize, e.g., policy trends, claim frequencies.'),
  reportData: z.string().describe('The data of the report in JSON format.'),
});
export type GenerateReportSummariesInput = z.infer<typeof GenerateReportSummariesInputSchema>;

const GenerateReportSummariesOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the report data.'),
  insights: z.string().describe('Key insights derived from the report data.'),
  recommendations: z
    .string()
    .describe('Recommendations based on the insights from the report data.'),
});
export type GenerateReportSummariesOutput = z.infer<typeof GenerateReportSummariesOutputSchema>;

export async function generateReportSummaries(
  input: GenerateReportSummariesInput
): Promise<GenerateReportSummariesOutput> {
  return generateReportSummariesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportSummariesPrompt',
  input: {schema: GenerateReportSummariesInputSchema},
  output: {schema: GenerateReportSummariesOutputSchema},
  prompt: `You are an expert insurance brokerage analyst.

You will analyze the provided report data and generate a concise summary, key insights, and actionable recommendations.

Report Type: {{{reportType}}}
Report Data: {{{reportData}}}

Summary: A brief overview of the report data.
Insights: Key observations and trends from the report data.
Recommendations: Actionable steps based on the insights.`,
});

const generateReportSummariesFlow = ai.defineFlow(
  {
    name: 'generateReportSummariesFlow',
    inputSchema: GenerateReportSummariesInputSchema,
    outputSchema: GenerateReportSummariesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
