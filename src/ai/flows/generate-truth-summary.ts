'use server';

/**
 * @fileOverview An AI agent that generates a truth summary of a food product based on its ingredients.
 *
 * - generateTruthSummary - A function that handles the generation of the truth summary.
 * - GenerateTruthSummaryInput - The input type for the generateTruthsummary function.
 * - GenerateTruthSummaryOutput - The return type for the generateTruthsummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { GenerateTruthSummaryOutput, GenerateTruthSummaryOutputSchema } from './shared';


const GenerateTruthSummaryInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A list of ingredients for a food product.'),
});
export type GenerateTruthSummaryInput = z.infer<typeof GenerateTruthSummaryInputSchema>;

export async function generateTruthSummary(input: GenerateTruthSummaryInput): Promise<GenerateTruthSummaryOutput> {
  return generateTruthSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTruthSummaryPrompt',
  input: {schema: GenerateTruthSummaryInputSchema},
  output: {schema: GenerateTruthSummaryOutputSchema},
  prompt: `You are an AI assistant designed to provide a summary of a food product based on its ingredients.

You will receive a list of ingredients and must return a health score from 1 (bad) to 10 (good), a health rating (A-F), a summary of the ingredients and their potential health impacts, a breakdown of the top 4 key ingredients, and a recommendation on whether or not to eat the product.

For the recommendation, you must start your response with "Yes:", "No:", or "Caution:" followed by a brief explanation.

Ingredients: {{{ingredients}}}

Output format: JSON according to the schema.
`,
});

const generateTruthSummaryFlow = ai.defineFlow(
  {
    name: 'generateTruthSummaryFlow',
    inputSchema: GenerateTruthSummaryInputSchema,
    outputSchema: GenerateTruthSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
