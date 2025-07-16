'use server';

/**
 * @fileOverview An AI agent that generates a truth summary of a food product based on an image of its ingredients.
 *
 * - generateTruthSummaryFromImage - A function that handles the generation of the truth summary from an image.
 * - GenerateTruthSummaryFromImageInput - The input type for the function.
 * - GenerateTruthSummaryOutput - The return type for the function (reused).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateTruthSummaryOutput,
  GenerateTruthSummaryOutputSchema,
} from './generate-truth-summary';

const GenerateTruthSummaryFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product's ingredients list, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateTruthSummaryFromImageInput = z.infer<
  typeof GenerateTruthSummaryFromImageInputSchema
>;

export async function generateTruthSummaryFromImage(
  input: GenerateTruthSummaryFromImageInput
): Promise<GenerateTruthSummaryOutput> {
  return generateTruthSummaryFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTruthSummaryFromImagePrompt',
  input: { schema: GenerateTruthSummaryFromImageInputSchema },
  output: { schema: GenerateTruthSummaryOutputSchema },
  prompt: `You are an AI assistant designed to provide a summary of a food product based on its ingredients.

You will receive an image of a product's ingredient list. Your first task is to accurately transcribe the ingredients from the image.

Then, using the transcribed ingredients, you must return a health score from 1 (bad) to 10 (good), a health rating (A-F), a summary of the ingredients and their potential health impacts, a breakdown of the top 4 key ingredients, and a recommendation on whether or not to eat the product.

Image of Ingredients: {{media url=photoDataUri}}

Output format: JSON according to the schema.
`,
});

const generateTruthSummaryFromImageFlow = ai.defineFlow(
  {
    name: 'generateTruthSummaryFromImageFlow',
    inputSchema: GenerateTruthSummaryFromImageInputSchema,
    outputSchema: GenerateTruthSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
