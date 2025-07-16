
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

🔍 Step 1: Product Identification & Keyword Extraction
Analyze the label using OCR. Extract all visible text, especially: Brand name, Product name, Key terms (e.g., “Nutella”, “Organic Peanut Butter”, “Whole Wheat Bread”), and the full ingredients list.

🌐 Step 2: Cross-Reference with Database
If you detected a known brand or product name, use the 'searchProductsByText' tool to find it in the Open Food Facts database.

🧠 Step 3: Analyze and Summarize
- If a match is found with the tool: Use the official product information (ingredients, nutrition facts) for your analysis. Set the 'source' to 'Open Food Facts'.
- If no match is found: Use the OCR-extracted ingredients. Set the 'source' to 'Label Only' and mention in the summary that the analysis is based on the image text.

Create a clear, human-readable summary that answers the question: "Why is this product good or bad for you?"

- Good: Mention benefits (e.g., “High in fiber”, “Low in sugar”, “Organic”).
- Bad: Mention risks (e.g., “High in added sugars”, “Contains palm oil”, “Ultra-processed”).

Also return a health rating from 1–10:
- 9–10 = Clean, organic, healthy
- 6–8 = Generally healthy, minor concerns
- 3–5 = Some red flags (sugar, salt, processing)
- 1–2 = Highly processed, nutritionally poor

If you found the product with the tool and it has a Nutri-Score, use that to help determine your health score.

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
      
      if (!output || !output.summary) {
        // The AI couldn't generate a meaningful output
        return { method: 'none' };
      }

      // Determine if a tool was successfully used to fetch product data
      const toolResponsePart = history?.findLast(m => m.role === 'tool')?.parts.find(p => p.toolResponse);
      const toolOutput = toolResponsePart?.toolResponse?.output as any;

      let imageUrl;
      let productName = output.productName;
      let productBrand = output.productBrand;

      if (toolOutput && toolOutput.name) {
        // If tool was used successfully, prioritize its data
        imageUrl = toolOutput.imageUrl || input.photoDataUri;
        productName = toolOutput.name;
        productBrand = toolOutput.brand;
        output.source = 'Open Food Facts';
      } else {
        // Fallback to OCR data if tool failed or wasn't used
        imageUrl = input.photoDataUri;
        output.source = 'Label Only';
      }
      
      return {
        method: 'ocr',
        productName: productName || 'Analyzed from Image',
        productBrand: productBrand || 'Live Capture',
        productImageUrl: imageUrl,
        analysis: output,
      };

    } catch (error) {
      console.error('Error in analyzeProductLabelFlow:', error);
      return { method: 'none' };
    }
  }
);

    