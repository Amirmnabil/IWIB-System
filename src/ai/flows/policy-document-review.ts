'use server';

/**
 * @fileOverview A policy document review AI agent.
 * 
 * - policyDocumentReview - A function that handles the policy document review process.
 * - PolicyDocumentReviewInput - The input type for the policyDocumentReview function.
 * - PolicyDocumentReviewOutput - The return type for the policyDocumentReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PolicyDocumentReviewInputSchema = z.object({
  policyDocumentDataUri: z
    .string()
    .describe(
      "A policy document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type PolicyDocumentReviewInput = z.infer<typeof PolicyDocumentReviewInputSchema>;

const PolicyDocumentReviewOutputSchema = z.object({
  summary: z.string().describe('A summary of the key terms, conditions, and coverage details of the policy document.'),
});
export type PolicyDocumentReviewOutput = z.infer<typeof PolicyDocumentReviewOutputSchema>;

export async function policyDocumentReview(input: PolicyDocumentReviewInput): Promise<PolicyDocumentReviewOutput> {
  return policyDocumentReviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'policyDocumentReviewPrompt',
  input: {schema: PolicyDocumentReviewInputSchema},
  output: {schema: PolicyDocumentReviewOutputSchema},
  prompt: `You are an expert insurance broker specializing in policy document analysis.\n\nYou will use this information to summarize the key terms, conditions, and coverage details of the policy document.\n\nPolicy Document: {{media url=policyDocumentDataUri}}`,
});

const policyDocumentReviewFlow = ai.defineFlow(
  {
    name: 'policyDocumentReviewFlow',
    inputSchema: PolicyDocumentReviewInputSchema,
    outputSchema: PolicyDocumentReviewOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
