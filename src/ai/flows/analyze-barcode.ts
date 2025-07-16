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
          prompt: `You are a real-time product analysis AI integrated into a mobile food scanner app. Your job is to identify the product, analyze its ingredients and nutrition, and generate a simple, fast, and trustworthy summary. Here’s the logic to follow:

🔍 Step 1: Product Detection
You have been given product data from the Open Food Facts database based on a barcode scan.

🧠 Step 2: Generate Smart Summary
Create a clear, human-readable summary that answers the question: "Why is this product good or bad for you?"

If good:
Mention benefits (e.g., “High in fiber”, “Low in sugar”, “Organic”, “Rich in protein”)
If bad:
Mention risks (e.g., “High in added sugars”, “Contains palm oil”, “Ultra-processed”, “Artificial additives present”)

Also return a rating from 1–10, with logic:
9–10 = Clean, organic, healthy
6–8 = Generally healthy, minor concerns
3–5 = Some red flags (sugar, salt, processing)
1–2 = Highly processed, nutritionally poor

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
          return { method: 'none' };
      }
      
      // The prompt now handles the product name and brand, but we can ensure it's set
      if (!analysis.productName) analysis.productName = productInfo.name;
      if (!analysis.productBrand) analysis.productBrand = productInfo.brand;
      
      // Set the source
      analysis.source = "Open Food Facts";

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
