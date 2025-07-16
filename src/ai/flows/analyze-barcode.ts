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
    try {
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
          prompt: `You are an AI nutrition and ingredient analysis engine inside a mobile app. Your job is to provide a fast, reliable summary of any product by analyzing its ingredient data. Follow these steps precisely:

Analyze the provided ingredient list.

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
    } catch (error) {
      console.error('Error in analyzeBarcodeFlow:', error);
      // Let the client know the flow failed.
      if (error instanceof Error && error.message.includes('429')) {
        // Specifically handle rate limit errors if needed
        return { method: 'none', error: 'Rate limit exceeded. Please try again later.' };
      }
      return { method: 'none', error: 'Failed to analyze barcode.' };
    }
  }
);
