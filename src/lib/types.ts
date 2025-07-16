export interface Product {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl: string;
  ingredients?: string;
  dataAiHint?: string;
  nutriscore?: string;
}

export interface ScanHistoryItem {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl: string;
  scanDate: string;
  dataAiHint?: string;
}
