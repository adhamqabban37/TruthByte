import { config } from 'dotenv';
config();

import '@/ai/flows/generate-truth-summary.ts';
import '@/ai/flows/explain-ingredient.ts';
import '@/ai/flows/recommend-product.ts';