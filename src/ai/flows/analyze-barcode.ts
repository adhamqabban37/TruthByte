'use server';

/**
 * @fileOverview An AI agent that analyzes a product from a barcode.
 *
 * It fetches product data using the barcode and then generates a health summary.
 * - analyzeBarcode - The main function to analyze a product from a barcode.
 * - AnalyzeBarcodeInput - Input type for the function.
 * - AnalyzeBarcodeOutput - Return type for the function.
 */

import { ai } from '@/ai/genkit';
import { getProductFromApi } from '@/lib/data-service';
import {
  AnalyzeBarcodeInputSchema,
  type AnalyzeBarcodeInput,
  AnalyzeBarcodeOutputSchema,
  type AnalyzeBarcodeOutput,
  GenerateTruthSummaryOutputSchema,
} from './shared';


export async function analyzeBarcode(
  input: AnalyzeBarcodeInput
): Promise<AnalyzeBarcodeOutput> {
  return analyzeBarcodeFlow(input);
}

const analyzeBarcodeFlow = ai.defineFlow(
  {
    name: 'analyzeBarcodeFlow',
    inputSchema: AnalyzeBarcodeInputSchema,
    outputSchema: AnalyzeBarcodeOutputSchema,
  },
  async ({ barcode }) => {
    // 1. Get product data from the API
    const productInfo = await getProductFromApi(barcode);

    if (!productInfo) {
      console.log(`No product found for barcode: ${barcode}`);
      return { method: 'none' };
    }

    const ingredients = productInfo.ingredients;
    
    // 2. If no ingredients, we can't do a full analysis.
    // Return what we know, but the analysis will be undefined.
    if (!ingredients) {
      return {
        method: 'barcode',
        productName: productInfo.name,
        productBrand: productInfo.brand,
        productImageUrl: productInfo.imageUrl,
        analysis: undefined // No ingredients to analyze
      };
    }
    
    // 3. Generate the health summary from the ingredients
    const summaryResponse = await ai.generate({
        prompt: `You are an AI assistant designed to provide a summary of a food product based on its ingredients.

You will receive a list of ingredients and must return a health score from 1 (bad) to 10 (good), a health rating (A-F), a summary of the ingredients and their potential health impacts, a breakdown of the top 4 key ingredients, and a recommendation on whether or not to eat the product.

For the recommendation, you must start your response with "Yes:", "No:", or "Caution:" followed by a brief explanation.

Ingredients: ${ingredients}

Output format: JSON according to the schema.
`,
        output: { schema: GenerateTruthSummaryOutputSchema }
    });

    const analysis = summaryResponse.output;

    if (!analysis) {
        console.error("Failed to generate analysis from ingredients");
        return { method: 'none' };
    }

    // Override health rating if nutriscore is available from the API
    if (productInfo.nutriscore) {
      analysis.healthRating = productInfo.nutriscore.toUpperCase();
    }

    return {
      method: 'barcode',
      productName: productInfo.name,
      productBrand: productInfo.brand,
      productImageUrl: productInfo.imageUrl,
      analysis: analysis,
    };
  }
);
