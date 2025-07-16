import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-product-label.ts';
import '@/ai/flows/explain-ingredient.ts';
import '@/ai/flows/analyze-barcode';
