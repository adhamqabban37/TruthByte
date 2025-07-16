'use client';
import { useState, useEffect, Suspense } from 'react';
import { ScannerUI } from '@/components/scan/scanner-ui';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AnalysisSummary } from '@/components/scan/analysis-summary';
import { getProductFromApi } from '@/lib/data-service';
import type { Product } from '@/lib/types';
import type { GenerateTruthSummaryOutput } from '@/ai/flows/generate-truth-summary';
import { generateTruthSummary } from '@/ai/flows/generate-truth-summary';
import { Skeleton } from '@/components/ui/skeleton';

function SummaryPopupContent({
  barcode,
  onClose,
}: {
  barcode: string;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [analysis, setAnalysis] = useState<GenerateTruthSummaryOutput | null>(
    null
  );

  useEffect(() => {
    async function fetchData() {
      const fetchedProduct = await getProductFromApi(barcode);
      setProduct(fetchedProduct);

      if (fetchedProduct?.ingredients) {
        const fetchedAnalysis = await generateTruthSummary({
          ingredients: fetchedProduct.ingredients,
        });

        if (fetchedProduct.nutriscore) {
          fetchedAnalysis.healthRating = fetchedProduct.nutriscore.toUpperCase();
        }
        setAnalysis(fetchedAnalysis);
      }
    }
    fetchData();
  }, [barcode]);

  if (!product || !analysis) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="w-full h-32 rounded-lg" />
        <Skeleton className="w-3/4 h-8" />
        <Skeleton className="w-full h-20" />
        <Skeleton className="w-full h-12" />
      </div>
    );
  }

  return (
    <AnalysisSummary
      product={product}
      analysis={analysis}
      onClose={onClose}
    />
  );
}

export default function ScanPage() {
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const handleScanComplete = (barcode: string) => {
    setScannedBarcode(barcode);
  };

  const handleClosePopup = () => {
    setScannedBarcode(null);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen p-4 bg-background">
      <ScannerUI onScanComplete={handleScanComplete} />
      <div className="absolute z-20 text-center text-foreground bottom-24">
        <p className="mb-4 text-lg">Place a barcode inside the frame</p>
      </div>

      <Dialog open={!!scannedBarcode} onOpenChange={(open) => !open && handleClosePopup()}>
        <DialogContent className="p-0 bg-transparent border-none shadow-none">
          {scannedBarcode && (
            <Suspense fallback={<Skeleton className="w-full h-96" />}>
               <SummaryPopupContent barcode={scannedBarcode} onClose={handleClosePopup} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
