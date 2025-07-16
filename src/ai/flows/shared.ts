/**
 * @fileOverview Shared types and schemas for AI flows.
 */
import { z } from 'zod';

export const GenerateTruthSummaryOutputSchema = z.object({
  mainIngredient: z.string().describe('The primary or most significant ingredient in the product.'),
  healthScore: z
    .number()
    .min(1)
    .max(10)
    .describe('A health score for the product from 1 (bad) to 10 (good).'),
  summary: z
    .string()
    .describe('An AI-generated summary of the ingredients and their potential health impacts.'),
  keyIngredients: z.array(
    z.object({
      name: z.string().describe('The name of the ingredient.'),
      category: z.string().describe('The category of the ingredient (e.g., Natural, Preservative, Artificial, Organic).'),
      explanation: z.string().describe('An AI explanation of the ingredient.'),
    })
  ).describe('A breakdown of the top 4 key ingredients.'),
  recommendation: z
    .string()
    .describe('A recommendation on whether or not to eat the product (e.g. "Yes: This product is healthy..." or "No: This product contains harmful ingredients..." or "Caution: This product should be consumed in moderation..."). Start with "Yes:", "No:", or "Caution:".'),
  healthRating: z.string().describe('A health rating for the product (A-F).'),
});
export type GenerateTruthSummaryOutput = z.infer<typeof GenerateTruthSummaryOutputSchema>;


export const AnalyzeProductLabelInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeProductLabelInput = z.infer<
  typeof AnalyzeProductLabelInputSchema
>;

export const AnalyzeProductLabelOutputSchema = z.object({
  method: z.enum(['ocr', 'barcode', 'none']).describe('The method used to identify the product.'),
  productName: z.string().optional().describe('The name of the product, if found.'),
  productBrand: z.string().optional().describe('The brand of the product, if found.'),
  productImageUrl: z.string().optional().describe('A URL for an image of the product, if found.'),
  analysis: GenerateTruthSummaryOutputSchema.optional(),
});
export type AnalyzeProductLabelOutput = z.infer<
  typeof AnalyzeProductLabelOutputSchema
>;

export const AnalyzeBarcodeOutputSchema = AnalyzeProductLabelOutputSchema;
export type AnalyzeBarcodeOutput = z.infer<typeof AnalyzeBarcodeOutputSchema>;

export const AnalyzeBarcodeInputSchema = z.object({
    barcode: z.string().describe("The product barcode value.")
});
export type AnalyzeBarcodeInput = z.infer<typeof AnalyzeBarcodeInputSchema>;