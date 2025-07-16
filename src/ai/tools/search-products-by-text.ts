'use server';

import { ai } from '@/ai/genkit';
import { searchProductsFromApi } from '@/lib/data-service';
import type { Product } from '@/lib/types';
import { z } from 'zod';


export const searchProductsByText = ai.defineTool(
  {
    name: 'searchProductsByText',
    description: 'Searches for product information by text query from the Open Food Facts API. Use this to find a product when you have its name or brand from an image.',
    inputSchema: z.object({
      query: z.string().describe('The text to search for, like a product or brand name.'),
    }),
    outputSchema: z.custom<Product | null>(),
  },
  async (input) => {
    console.log(`Searching for product with query: ${input.query}`);
    const product = await searchProductsFromApi(input.query);
    // The tool returns the first result if found
    return product;
  }
);
