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
  prompt: `You are a real-time product analysis AI integrated into a mobile food scanner app. Your job is to identify the product, analyze its ingredients and nutrition, and generate a simple, fast, and trustworthy summary. Here’s the logic to follow:

🔍 Step 1: Product Detection
Use OCR to extract the product name, brand, and ingredient list from the provided image. If you recognize a known product name or brand, use the 'searchProductsByText' tool to find it in a database.

🧠 Step 2: Generate Smart Summary
Based on the data you have (either from the tool or just from the label text), create a clear, human-readable summary that answers the question: "Why is this product good or bad for you?"

If good:
Mention benefits (e.g., “High in fiber”, “Low in sugar”, “Organic”, “Rich in protein”)
If bad:
Mention risks (e.g., “High in added sugars”, “Contains palm oil”, “Ultra-processed”, “Artificial additives present”)

Also return a rating from 1–10, with logic:
9–10 = Clean, organic, healthy
6–8 = Generally healthy, minor concerns
3–5 = Some red flags (sugar, salt, processing)
1–2 = Highly processed, nutritionally poor

If you found the product with the tool and it has a Nutri-Score, use that to help determine your health score.

⚙️ Step 3: Set the Source
If you used the tool and found a match, set the 'source' field to 'Open Food Facts'.
If you did not find a match and are using only the text from the label, set the 'source' field to 'Label Only' and mention in the summary that the analysis is based on the image.

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
