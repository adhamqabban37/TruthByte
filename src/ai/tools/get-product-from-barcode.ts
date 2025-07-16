'use server';

import { ai } from '@/ai/genkit';
import { getProductFromApi } from '@/lib/data-service';
import type { Product } from '@/lib/types';
import { z } from 'zod';

// Note: This tool is now called directly from the analyzeBarcode flow,
// not by the LLM. The schema definition is still useful for type safety.
export const getProductFromBarcodeToolSchema = {
    name: 'getProductFromBarcode',
    description: 'Get product information for a given barcode from the Open Food Facts API.',
    inputSchema: z.object({
      barcode: z.string().describe('The product barcode.'),
    }),
    outputSchema: z.custom<Product>(),
};

export const getProductFromBarcode = ai.defineTool(
  getProductFromBarcodeToolSchema,
  async (input) => {
    console.log(`Getting product info for barcode: ${input.barcode}`);
    const product = await getProductFromApi(input.barcode);
    return product;
  }
);
