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
  prompt: `You are an AI system inside a mobile app that scans product packaging. Your goal is to instantly identify and summarize key information from a product.
Analyze the image provided and use OCR (Optical Character Recognition) to extract ingredients, nutritional information, and any warnings.

Your priority is speed. Generate a fast, simple, human-readable summary.

Highlight key ingredients, point out any unhealthy additives, allergens, or red flags. Provide a quick health rating if possible.

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
