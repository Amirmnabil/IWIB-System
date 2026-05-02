'use server';

/**
 * @fileOverview A sales pipeline prediction AI agent.
 *
 * - predictSalesPipeline - A function that handles the sales pipeline prediction process.
 * - SalesPipelinePredictionInput - The input type for the predictSalesPipeline function.
 * - SalesPipelinePredictionOutput - The return type for the predictSalesPipeline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesPipelinePredictionInputSchema = z.object({
  prospects: z.array(
    z.object({
      company_name: z.string().describe('The name of the company.'),
      pipeline_stage: z
        .string()
        .describe(
          'The current stage of the prospect in the sales pipeline (e.g., qualification, needs_analysis, proposal).' 
        ),
      probability: z
        .number()
        .min(0)
        .max(100)
        .describe(
          'The probability of closing the deal, as a percentage (0-100).' 
        ),
      estimated_value: z
        .number()
        .describe('The estimated value of the deal in USD.'),
      expected_close_date: z
        .string()
        .describe('The expected close date of the deal (YYYY-MM-DD).'),
    })
  ).describe('An array of prospect objects with details for each sales opportunity.'),
});
export type SalesPipelinePredictionInput = z.infer<
  typeof SalesPipelinePredictionInputSchema
>;

const SalesPipelinePredictionOutputSchema = z.object({
  predicted_close_dates: z.array(
    z.object({
      company_name: z.string().describe('The name of the company.'),
      predicted_close_date: z
        .string()
        .describe('The AI predicted close date of the deal (YYYY-MM-DD).'),
      predicted_revenue: z
        .number()
        .describe('The AI predicted revenue of the deal in USD.'),
      reasoning: z
        .string()
        .describe('The reasoning behind the AI prediction.'),
    })
  ).describe('An array of predicted close dates and revenues for each prospect.'),
  total_predicted_revenue: z
    .number()
    .describe('The total predicted revenue from all prospects.'),
});
export type SalesPipelinePredictionOutput = z.infer<
  typeof SalesPipelinePredictionOutputSchema
>;

export async function predictSalesPipeline(
  input: SalesPipelinePredictionInput
): Promise<SalesPipelinePredictionOutput> {
  return predictSalesPipelineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesPipelinePredictionPrompt',
  input: {schema: SalesPipelinePredictionInputSchema},
  output: {schema: SalesPipelinePredictionOutputSchema},
  prompt: `You are an AI assistant helping sales managers predict closing dates and potential revenues for their sales pipeline.

  Given the following prospects and their details, predict the most likely closing date and the expected revenue for each prospect.

  Prospects:
  {{#each prospects}}
  - Company: {{this.company_name}}, Stage: {{this.pipeline_stage}}, Probability: {{this.probability}}%, Value: \${{this.estimated_value}}, Expected Close Date: {{this.expected_close_date}}
  {{/each}}

  Provide your prediction in JSON format. Include the company name, predicted close date, predicted revenue, and your reasoning for each prospect.  Also provide the total predicted revenue from all prospects.
  Make sure the close dates are within 3 months of today.
  Make the revenue predictions very accurate.
  Remember to adhere to the schema and always return a valid JSON object.
  `,
});

const predictSalesPipelineFlow = ai.defineFlow(
  {
    name: 'predictSalesPipelineFlow',
    inputSchema: SalesPipelinePredictionInputSchema,
    outputSchema: SalesPipelinePredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
