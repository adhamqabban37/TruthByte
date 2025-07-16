'use server';

/**
 * @fileOverview An AI agent that analyzes a product label from an image.
 *
 * It prioritizes reading ingredients text directly from the label. If the text
 * is unclear, it falls back to decoding a barcode.
 *
 * - analyzeProductLabel - The main function to analyze a product image.
 * - AnalyzeProductLabelInput - Input type for the function.
 * - AnalyzeProductLabelOutput - Return type for the function.
 */

import { ai } from '@/ai/genkit';
import { getProductFromBarcode } from '../tools/get-product-from-barcode';
import {
  AnalyzeProductLabelInputSchema,
  type AnalyzeProductLabelInput,
  AnalyzeProductLabelOutputSchema,
  type AnalyzeProductLabelOutput,
  GenerateTruthSummaryOutputSchema,
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
  tools: [getProductFromBarcode],
  prompt: `You are an AI assistant designed to provide a "truth summary" of a food product from a single image of its label.

Your first priority is to read the ingredients list and any nutritional information directly from the image text (OCR). If you can clearly read the ingredients, generate the health summary based *only* on that text.

If the ingredients text is unclear, unreadable, or incomplete, your second priority is to find and decode a barcode in the image. If a barcode is found, use the 'getProductFrombarcode' tool to get product information. Use the ingredients from the tool's response to generate the health summary.

If you cannot read the text and cannot find a barcode, you must stop.

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
    const llmResponse = await prompt(input);
    const toolCalls = llmResponse.toolCalls();

    if (toolCalls.length > 0 && toolCalls[0].tool === 'getProductFromBarcode') {
      // Barcode was used
      const toolResponse = await getProductFromBarcode(toolCalls[0].input);
      if (!toolResponse) {
        return { method: 'none' };
      }
      
      const ingredients = toolResponse.ingredients;
      if (!ingredients) {
         return {
          method: 'barcode',
          productName: toolResponse.name,
          productBrand: toolResponse.brand,
          productImageUrl: toolResponse.imageUrl,
          analysis: undefined // No ingredients to analyze
        };
      }
      
      const summaryResponse = await ai.generate({
          prompt: `You are an AI assistant designed to provide a summary of a food product based on its ingredients.

You will receive a list of ingredients and must return a health score from 1 (bad) to 10 (good), a health rating (A-F), a summary of the ingredients and their potential health impacts, a breakdown of the top 4 key ingredients, and a recommendation on whether or not to eat the product.

For the recommendation, you must start your response with "Yes:", "No:", or "Caution:" followed by a brief explanation.

Ingredients: ${ingredients}

Output format: JSON according to the schema.
`,
          output: { schema: GenerateTruthSummaryOutputSchema }
      });

      const analysis = summaryResponse.output!;
      // Override health rating if nutriscore is available
      if (toolResponse.nutriscore) {
        analysis.healthRating = toolResponse.nutriscore.toUpperCase();
      }

      return {
        method: 'barcode',
        productName: toolResponse.name,
        productBrand: toolResponse.brand,
        productImageUrl: toolResponse.imageUrl,
        analysis: analysis,
      };
    } else {
      // OCR was used
      const analysis = llmResponse.output;
      if (!analysis) {
        return { method: 'none' };
      }
      return {
        method: 'ocr',
        productName: 'Analyzed from Image',
        productBrand: 'Live Capture',
        productImageUrl: input.photoDataUri, // Use the captured image itself
        analysis: analysis,
      };
    }
  }
);
