
'use server';

/**
 * @fileOverview An AI agent that analyzes product information from raw OCR text.
 * - summarizeText - The main function to analyze product text.
 * - SummarizeTextInput - Input type for the function.
 * - SummarizeTextOutput - Return type for the function.
 */

import { ai } from '@/ai/genkit';
import { GenerateTruthSummaryOutputSchema, SummarizeTextInputSchema, type SummarizeTextInput, SummarizeTextOutputSchema, type SummarizeTextOutput } from './shared';


export async function summarizeText(
  input: SummarizeTextInput
): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: { schema: SummarizeTextInputSchema },
  output: { schema: GenerateTruthSummaryOutputSchema },
  prompt: `You are an AI nutrition and ingredient analysis engine. Your job is to provide a fast, reliable summary of any product by analyzing its label text extracted via OCR. Follow these steps precisely:

Step 1: Identify Product
From the raw text, identify the product name and brand. If you cannot find them, use "Scanned Product" for the name and "From Label" for the brand.

Step 2: Ingredient Evaluation
Flag any of the following as low-quality or red-flag:
- Added sugars (high fructose corn syrup, cane sugar, etc.)
- Artificial sweeteners (aspartame, sucralose)
- Artificial flavors/colors
- Processed oils (palm oil, canola oil, etc.)
- Excess sodium, saturated fats

Step-by-step analysis:
1. Scan for red-flag ingredients.
2. Check for quality boosters (organic, non-GMO).
3. Evaluate overall processing level.

Step 3: Health Rating Scale (1 to 10):
Use a scalable and transparent rating system.
- 1 = ultra-processed, low-nutrition
- 10 = clean, organic, nutritionally dense
Provide clear reasoning for the score. The score must be a number between 1 and 10.

Step 4: Generate Smart Summary
Create a clear, human-readable summary that answers the question: "Why is this product good or bad for you?"

If good:
Mention benefits (e.g., “High in fiber”, “Low in sugar”, “Organic”, “Rich in protein”)
If bad:
Mention risks (e.g., “High in added sugars”, “Contains palm oil”, “Ultra-processed”, “Artificial additives present”)

Here is the raw OCR text from the product label:
"{{labelText}}"

Output format: JSON according to the schema. If you cannot determine a field, provide a sensible default.
`,
});


const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      
      if (!output || !output.summary) {
        // This indicates the AI could not extract meaningful info.
        return {};
      }

      output.source = 'Label Only (OCR)';
      
      return {
        productName: output.productName,
        productBrand: output.productBrand,
        analysis: output,
      };

    } catch (error) {
      console.error('Error in summarizeTextFlow:', error);
      // Return an empty object on failure to prevent crashes
      return {};
    }
  }
);
