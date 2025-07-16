import { config } from 'dotenv';
config();

import '@/ai/flows/explain-ingredient.ts';
import '@/ai/flows/analyze-barcode';
import '@/ai/flows/summarize-text';
import '@/ai/tools/search-products-by-text';
