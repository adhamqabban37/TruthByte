
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
      
      try {
        // 3. Generate the health summary from the ingredients
        const summaryResponse = await ai.generate({
            prompt: `You are an AI nutrition and ingredient analysis engine inside a mobile app. Your job is to provide a fast, reliable summary of any product by analyzing its label or barcode data. Follow these steps precisely:

Step 1: Ingredient Evaluation
Flag any of the following as low-quality or red-flag:
- Added sugars (high fructose corn syrup, cane sugar, etc.)
- Artificial sweeteners (aspartame, sucralose)
- Artificial flavors/colors
- Processed oils (palm oil, canola oil, etc.)
- Excess sodium, saturated fats

Step 2: Sustainability & Quality Boosters (add points):
- Organic-certified, clean-label, whole-food ingredients
- Plant-based, non-GMO, low sugar/sodium/fat
- Locally sourced or fair-trade items

Step 3: Health Rating Scale (1 to 10):
Use a scalable and transparent rating system.
- 1 = ultra-processed, low-nutrition
- 10 = clean, organic, nutritionally dense
Provide clear reasoning for the score.

Step 4: Generate Smart Summary
Create a clear, human-readable summary that answers the question: "Why is this product good or bad for you?"

If good:
Mention benefits (e.g., “High in fiber”, “Low in sugar”, “Organic”, “Rich in protein”)
If bad:
Mention risks (e.g., “High in added sugars”, “Contains palm oil”, “Ultra-processed”, “Artificial additives present”)

If a Nutri-Score is provided, use it to help determine your health score.

Here is the product information:
Product Name: ${productInfo.name}
Brand: ${productInfo.brand}
Ingredients: ${ingredients}
Nutri-Score: ${productInfo.nutriscore || 'Not available'}

Output format: JSON according to the schema.
`,
            output: { schema: GenerateTruthSummaryOutputSchema }
        });

        const analysis = summaryResponse.output;

        if (!analysis) {
            console.error("Failed to generate analysis from ingredients");
            // Gracefully degrade: return product info without analysis
            return {
              method: 'barcode',
              productName: productInfo.name,
              productBrand: productInfo.brand,
              productImageUrl: productInfo.imageUrl,
              analysis: undefined, 
              error: 'AI analysis failed.'
            };
        }
        
        if (!analysis.productName) analysis.productName = productInfo.name;
        if (!analysis.productBrand) analysis.productBrand = productInfo.brand;
        analysis.source = "Open Food Facts";
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
      } catch (aiError) {
         console.error('Error during AI analysis step:', aiError);
          // Gracefully degrade if AI fails: return product info without analysis
          return {
            method: 'barcode',
            productName: productInfo.name,
            productBrand: productInfo.brand,
            productImageUrl: productInfo.imageUrl,
            analysis: undefined,
            error: 'AI analysis could not be completed.'
          };
      }
    } catch (error) {
      console.error('Error in analyzeBarcodeFlow:', error);
      if (error instanceof Error && error.message.includes('429')) {
        return { method: 'none', error: 'Rate limit exceeded. Please try again later.' };
      }
      return { method: 'none', error: 'Failed to analyze barcode.' };
    }
  }
);
