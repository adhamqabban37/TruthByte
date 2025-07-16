import type { GenerateTruthSummaryOutput } from '@/ai/flows/generate-truth-summary';

export interface Product {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  dataAiHint?: string;
}

export interface ScanHistoryItem {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  scanDate: string;
  dataAiHint?: string;
}
