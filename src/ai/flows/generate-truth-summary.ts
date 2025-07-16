'use server';

/**
 * @fileOverview An AI agent that generates a truth summary of a food product based on its ingredients.
 *
 * - generateTruthSummary - A function that handles the generation of the truth summary.
 * - GenerateTruthSummaryInput - The input type for the generateTruthSummary function.
 * - GenerateTruthSummaryOutput - The return type for the generateTruthSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTruthSummaryInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A list of ingredients for a food product.'),
});
export type GenerateTruthSummaryInput = z.infer<typeof GenerateTruthSummaryInputSchema>;

const GenerateTruthSummaryOutputSchema = z.object({
  healthRating: z
    .string()
    .describe('A health rating for the product (A-F).'),
  summary: z
    .string()
    .describe('An AI-generated summary of the ingredients and their potential health impacts.'),
  keyIngredients: z.array(
    z.object({
      name: z.string().describe('The name of the ingredient.'),
      category: z.string().describe('The category of the ingredient (e.g., Natural, Preservative, Artificial, Organic).'),
      explanation: z.string().describe('An AI explanation of the ingredient.'),
    })
  ).describe('A breakdown of the key ingredients.'),
  recommendation: z
    .string()
    .describe('A recommendation on whether or not to eat the product (Yes/No/Caution) with explanation.'),
});
export type GenerateTruthSummaryOutput = z.infer<typeof GenerateTruthSummaryOutputSchema>;

export async function generateTruthSummary(input: GenerateTruthSummaryInput): Promise<GenerateTruthSummaryOutput> {
  return generateTruthSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTruthSummaryPrompt',
  input: {schema: GenerateTruthSummaryInputSchema},
  output: {schema: GenerateTruthSummaryOutputSchema},
  prompt: `You are an AI assistant designed to provide a summary of a food product based on its ingredients.

You will receive a list of ingredients and must return a health rating (A-F), a summary of the ingredients and their potential health impacts, a breakdown of the key ingredients, and a recommendation on whether or not to eat the product.

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
