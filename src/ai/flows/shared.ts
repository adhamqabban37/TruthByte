/**
 * @fileOverview Shared types and schemas for AI flows.
 */
import { z } from 'zod';

export const GenerateTruthSummaryOutputSchema = z.object({
  healthScore: z
    .number()
    .min(1)
    .max(10)
    .describe('A health score for the product from 1 (bad) to 10 (good).'),
  summary: z
    .string()
    .describe('An AI-generated summary of the ingredients and their potential health impacts.'),
  keyIngredients: z.array(
    z.object({
      name: z.string().describe('The name of the ingredient.'),
      category: z.string().describe('The category of the ingredient (e.g., Natural, Preservative, Artificial, Organic).'),
      explanation: z.string().describe('An AI explanation of the ingredient.'),
    })
  ).describe('A breakdown of the top 4 key ingredients.'),
  recommendation: z
    .string()
    .describe('A recommendation on whether or not to eat the product (e.g. "Yes: This product is healthy..." or "No: This product contains harmful ingredients..." or "Caution: This product should be consumed in moderation..."). Start with "Yes:", "No:", or "Caution:".'),
  healthRating: z.string().describe('A health rating for the product (A-F).'),
});
export type GenerateTruthSummaryOutput = z.infer<typeof GenerateTruthSummaryOutputSchema>;
