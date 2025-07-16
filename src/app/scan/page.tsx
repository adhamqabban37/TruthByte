'use client';
import { useState, useEffect, Suspense } from 'react';
import { ScannerUI } from '@/components/scan/scanner-ui';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
          // The API returns a letter, so we need to convert it to a number.
          const scoreMap: { [key: string]: number } = {
            a: 9,
            b: 7,
            c: 5,
            d: 3,
            e: 1,
          };
          fetchedAnalysis.healthScore = scoreMap[fetchedProduct.nutriscore.toLowerCase()] || fetchedAnalysis.healthScore;
        }
        setAnalysis(fetchedAnalysis);
      }
    }
    fetchData();
  }, [barcode]);

  if (!product || !analysis) {
    return (
      <div className="p-6 space-y-4 bg-background h-screen">
        <div className="flex justify-center pt-8">
            <Skeleton className="w-40 h-40 rounded-lg" />
        </div>
        <div className="pt-4 space-y-2">
            <Skeleton className="w-3/4 h-8 mx-auto" />
            <Skeleton className="w-1/2 h-6 mx-auto" />
        </div>
        <div className="space-y-3 pt-6">
            <Skeleton className="w-full h-20" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-24" />
        </div>
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

      <Sheet
        open={!!scannedBarcode}
        onOpenChange={(open) => !open && handleClosePopup()}
      >
        <SheetContent
          side="bottom"
          className="h-screen p-0 bg-black/80 backdrop-blur-sm border-none"
        >
          <SheetHeader>
            <SheetTitle className="sr-only">
              Product Analysis Summary
            </SheetTitle>
          </SheetHeader>
          {scannedBarcode && (
            <Suspense fallback={<Skeleton className="w-full h-screen" />}>
              <SummaryPopupContent
                barcode={scannedBarcode}
                onClose={handleClosePopup}
              />
            </Suspense>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
