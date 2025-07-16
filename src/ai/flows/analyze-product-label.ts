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
import { searchProductsByText } from '../tools/search-products-by-text';

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
  tools: [searchProductsByText],
  prompt: `You are a smart product recognition AI built for a mobile scanner app. Your job is to accurately identify real-world products using label data, ingredients, and barcodes. Follow this logic:

🔍 Step 1: Product Identification
Immediately analyze the label from the provided image using OCR. Extract all visible text, especially:
- Brand name
- Product name
- Key terms (e.g., “Nutella”, “Organic Peanut Butter”, “Whole Wheat Bread”)
- Ingredients list

If any known brand or product name is detected (e.g., “Nutella”), use the \`searchProductsByText\` tool to find it in the database.

🌐 Step 2: Use Found Product Data
If the tool returns a product match, use that official data (ingredients, brand, etc.) as the primary source for your analysis. Set the 'source' field to 'Open Food Facts'.

🧠 Step 3: Fallback on Ingredient-Only Analysis
If no direct match is found by the tool, use only the ingredients and text from the OCR to perform your analysis. In this case, set the 'source' field to "Label Only" and provide a disclaimer in the summary.

Follow this evaluation logic for your analysis:
- Flag low-quality/red-flag ingredients: Added sugars, artificial sweeteners/flavors/colors, processed oils, excess sodium.
- Note quality boosters: Organic, non-GMO, whole-food, plant-based.
- Provide a health rating from 1-10 (1=ultra-processed, 10=clean, organic).

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
      const { output, history } = await prompt(input);
      
      const toolRequest = history?.findLast(m => m.role === 'model')?.parts.find(p => p.toolRequest);

      if (!output || !output.summary) {
        return { method: 'none' };
      }

      // If a tool was used and returned product info, use that.
      // The prompt is designed to automatically incorporate this info.
      // We just need to potentially get the image URL from the tool call if it exists.
      let imageUrl = input.photoDataUri;
      const toolResponsePart = history?.findLast(m => m.role === 'tool')?.parts.find(p => p.toolResponse);
      
      if (toolResponsePart?.toolResponse) {
        const toolOutput = toolResponsePart.toolResponse.output as any;
        if (toolOutput.imageUrl) {
          imageUrl = toolOutput.imageUrl;
        }
      }
      
      return {
        method: 'ocr',
        productName: output.productName || 'Analyzed from Image',
        productBrand: output.productBrand || 'Live Capture',
        productImageUrl: imageUrl,
        analysis: output,
      };

    } catch (error) {
      console.error('Error in analyzeProductLabelFlow:', error);
      return { method: 'none' };
    }
  }
);
