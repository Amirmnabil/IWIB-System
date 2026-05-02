'use server';

/**
 * @fileOverview A sales pipeline forecasting AI agent.
 *
 * - forecastSalesPipeline - A function that handles the sales pipeline forecasting process.
 * - SalesPipelineForecastingInput - The input type for the forecastSalesPipeline function.
 * - SalesPipelineForecastingOutput - The return type for the forecastSalesPipeline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesPipelineForecastingInputSchema = z.object({
  prospects: z.array(
    z.object({
      company_name: z.string().describe('The name of the company.'),
      pipeline_stage: z
        .string()
        .describe(
          'The current stage of the prospect in the sales pipeline (e.g., qualification, needs_analysis, proposal).'
        ),
      probability:
        z
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
export type SalesPipelineForecastingInput = z.infer<
  typeof SalesPipelineForecastingInputSchema
>;

const SalesPipelineForecastingOutputSchema = z.object({
  forecasted_close_dates: z.array(
    z.object({
      company_name: z.string().describe('The name of the company.'),
      forecasted_close_date:
        z
          .string()
          .describe('The AI forecasted close date of the deal (YYYY-MM-DD).'),
      forecasted_revenue: z
        .number()
        .describe('The AI forecasted revenue of the deal in USD.'),
      reasoning:
        z
          .string()
          .describe('The reasoning behind the AI forecast.'),
    })
  ).describe('An array of forecasted close dates and revenues for each prospect.'),
  total_forecasted_revenue: z
    .number()
    .describe('The total forecasted revenue from all prospects.'),
});
export type SalesPipelineForecastingOutput = z.infer<
  typeof SalesPipelineForecastingOutputSchema
>;

export async function forecastSalesPipeline(
  input: SalesPipelineForecastingInput
): Promise<SalesPipelineForecastingOutput> {
  return forecastSalesPipelineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesPipelineForecastingPrompt',
  input: {schema: SalesPipelineForecastingInputSchema},
  output: {schema: SalesPipelineForecastingOutputSchema},
  prompt: `You are an AI assistant helping sales managers forecast closing dates and potential revenues for their sales pipeline.\n\n  Given the following prospects and their details, forecast the most likely closing date and the expected revenue for each prospect.\n\n  Prospects:\n  {{#each prospects}}\n  - Company: {{this.company_name}}, Stage: {{this.pipeline_stage}}, Probability: {{this.probability}}%, Value: \${{this.estimated_value}}, Expected Close Date: {{this.expected_close_date}}\n  {{/each}}\n\n  Provide your forecast in JSON format. Include the company name, forecasted close date, forecasted revenue, and your reasoning for each prospect. Also provide the total forecasted revenue from all prospects.\n  Make sure the close dates are within 3 months of today.\n  Make the revenue forecasts very accurate.\n  Remember to adhere to the schema and always return a valid JSON object.\n  `,
});

const forecastSalesPipelineFlow = ai.defineFlow(
  {
    name: 'forecastSalesPipelineFlow',
    inputSchema: SalesPipelineForecastingInputSchema,
    outputSchema: SalesPipelineForecastingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
