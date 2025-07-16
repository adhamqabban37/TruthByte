'use server';

/**
 * @fileOverview An AI agent that analyzes a product label from an image using OCR.
 *
 * - analyzeProductLabel - The main function to analyze a product image.
 * - AnalyzeProductLabelInput - Input type for the function.
 * - AnalyzeProductLabelOutput - Return type for the function.
 */

import { ai } from '@/ai/genkit';
import {
  AnalyzeProductLabelInputSchema,
  type AnalyzeProductLabelInput,
  AnalyzeProductLabelOutputSchema,
  type AnalyzeProductLabelOutput,
  GenerateTruthSummaryOutputSchema
} from './shared';


export async function analyzeProductLabel(
  input: AnalyzeProductLabelInput
): Promise<AnalyzeProductLabelOutput> {
  return analyzeProductLabelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeProductLabelPrompt',
  input: { schema: AnalyzeProductLabelInputSchema },
  output: { schema: GenerateTruthSummaryOutputSchema },
  prompt: `You are an AI assistant designed to provide a "truth summary" of a food product from a single image of its label.

Your task is to read the ingredients list and any nutritional information directly from the image text (OCR). Generate the health summary based *only* on that text.

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
    const { output } = await prompt(input);

    if (!output) {
      return { method: 'none' };
    }

    return {
      method: 'ocr',
      productName: 'Analyzed from Image',
      productBrand: 'Live Capture',
      productImageUrl: input.photoDataUri, // Use the captured image itself
      analysis: output,
    };
  }
);
