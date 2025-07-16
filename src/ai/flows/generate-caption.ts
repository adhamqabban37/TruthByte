'use server';
/**
 * @fileOverview Generates a caption for a product image.
 *
 * - generateCaption - A function that handles the caption generation process.
 * - GenerateCaptionInput - The input type for the generateCaption function.
 * - GenerateCaptionOutput - The return type for the generateCaption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCaptionInputSchema = z.object({
  productName: z.string().describe('The name of the product in the image.'),
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateCaptionInput = z.infer<typeof GenerateCaptionInputSchema>;

const GenerateCaptionOutputSchema = z.object({
  caption: z.string().describe('A one-sentence, engaging caption for the product image.'),
});
export type GenerateCaptionOutput = z.infer<typeof GenerateCaptionOutputSchema>;

export async function generateCaption(input: GenerateCaptionInput): Promise<GenerateCaptionOutput> {
  return generateCaptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCaptionPrompt',
  input: {schema: GenerateCaptionInputSchema},
  output: {schema: GenerateCaptionOutputSchema},
  prompt: `You are an expert copywriter for a food app.

You will receive an image of a food product and its name.

Your task is to generate a single, engaging, one-sentence caption for the image. The caption should be descriptive and appealing.

Product Name: {{{productName}}}
Image: {{media url=photoDataUri}}`,
});

const generateCaptionFlow = ai.defineFlow(
  {
    name: 'generateCaptionFlow',
    inputSchema: GenerateCaptionInputSchema,
    outputSchema: GenerateCaptionOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        return { caption: "" };
      }
      return output;
    } catch (error) {
      console.error('Error in generateCaptionFlow:', error);
      return { caption: "" };
    }
  }
);
