'use server';

import { ai } from '@/ai/genkit';
import { getProductFromApi } from '@/lib/data-service';
import type { Product } from '@/lib/types';
import { z } from 'zod';

export const getProductFromBarcode = ai.defineTool(
  {
    name: 'getProductFromBarcode',
    description: 'Get product information for a given barcode from the Open Food Facts API.',
    inputSchema: z.object({
      barcode: z.string().describe('The product barcode.'),
    }),
    outputSchema: z.custom<Product>(),
  },
  async (input) => {
    console.log(`Getting product info for barcode: ${input.barcode}`);
    const product = await getProductFromApi(input.barcode);
    return product;
  }
);
