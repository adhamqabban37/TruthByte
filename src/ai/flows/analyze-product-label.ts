'use server';

/**
 * @fileOverview An AI agent that analyzes a product label from an image using OCR.
 *
 * - analyzeProductLabel - The main function to analyze a product image.
 * - AnalyzeProductLabelInput - Input type for the function.
 * - AnalyzeProductLabelOutput - Return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  AnalyzeProductLabelInputSchema,
  type AnalyzeProductLabelInput,
  GenerateTruthSummaryOutputSchema
} from './shared';

const AnalyzeProductLabelOutputSchema = z.object({
  method: z.enum(['ocr', 'barcode', 'none']).describe('The method used to identify the product.'),
  productName: z.string().optional().describe('The name of the product, if found.'),
  productBrand: z.string().optional().describe('The brand of the product, if found.'),
  productImageUrl: z.string().optional().describe('A URL for an image of the product, if found.'),
  analysis: GenerateTruthSummaryOutputSchema.optional(),
});
export type AnalyzeProductLabelOutput = z.infer<typeof AnalyzeProductLabelOutputSchema>;


export async function analyzeProductLabel(
  input: AnalyzeProductLabelInput
): Promise<AnalyzeProductLabelOutput> {
  return analyzeProductLabelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeProductLabelPrompt',
  input: { schema: AnalyzeProductLabelInputSchema },
  output: { schema: GenerateTruthSummaryOutputSchema },
  prompt: `You are an AI nutrition and ingredient analysis engine inside a mobile app. Your job is to provide a fast, reliable summary of any product by analyzing its label from an image. Follow these steps precisely:

Label First:
Prioritize reading the visible label text from the image using OCR. Focus on ingredients, nutrition facts, allergen warnings, and claims like 'organic', 'non-GMO', or 'sugar-free'.

Ingredient Evaluation:
Flag any of the following as low-quality or red-flag:
- Added sugars (high fructose corn syrup, cane sugar, etc.)
- Artificial sweeteners (aspartame, sucralose)
- Artificial flavors/colors
- Processed oils (palm oil, canola oil, etc.)
- Excess sodium, saturated fats

Sustainability & Quality Boosters (add points):
- Organic-certified, clean-label, whole-food ingredients
- Plant-based, non-GMO, low sugar/sodium/fat
- Locally sourced or fair-trade items

Health Rating Scale (1 to 10):
Use a scalable and transparent rating system.
1 = ultra-processed, low-nutrition
10 = clean, organic, nutritionally dense
Provide reasoning for the score.

Analyze this image: {{media url=photoDataUri}}

Output format: JSON according to the schema.
`,
});

const analyzeProductLabelFlow = ai.defineFlow(
  {
    name: 'analyzeProductLabelFlow',
    inputSchema: AnalyzeProductLabelInputSchema,
    outputSchema: AnalyzeProductLabelOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);

      if (!output || !output.summary) {
        return { method: 'none' };
      }

      return {
        method: 'ocr',
        productName: 'Analyzed from Image',
        productBrand: 'Live Capture',
        productImageUrl: input.photoDataUri, // Use the captured image itself
        analysis: output,
      };
    } catch (error) {
      console.error('Error in analyzeProductLabelFlow:', error);
      return { method: 'none' };
    }
  }
);
