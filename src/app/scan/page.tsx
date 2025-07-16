'use client';
import { useState, Suspense, useCallback } from 'react';
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
import { CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    async function fetchData() {
      try {
        const fetchedProduct = await getProductFromApi(barcode);
        
        if (!fetchedProduct) {
          setError(`Product with barcode ${barcode} not found.`);
          return;
        }
        
        setProduct(fetchedProduct);

        if (fetchedProduct?.ingredients) {
          const fetchedAnalysis = await generateTruthSummary({
            ingredients: fetchedProduct.ingredients,
          });

          if (fetchedProduct.nutriscore) {
            const scoreMap: { [key: string]: number } = {
              a: 9, b: 7, c: 5, d: 3, e: 1,
            };
            fetchedAnalysis.healthScore =
              scoreMap[fetchedProduct.nutriscore.toLowerCase()] ||
              fetchedAnalysis.healthScore;
          }
          setAnalysis(fetchedAnalysis);
        } else {
           setError(`No ingredient information found for ${fetchedProduct.name}.`);
        }
      } catch (e) {
         setError('An error occurred while fetching product data.');
         console.error(e);
      }
    }
    fetchData();
  });

  if (error) {
    return (
        <div className="flex items-center justify-center h-full p-6 text-center text-white bg-transparent">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Scan Failed</h2>
                <p className="text-white/80">{error}</p>
                 <button onClick={onClose} className="px-4 py-2 mt-4 text-white rounded-md bg-primary">
                    Try Again
                </button>
            </div>
        </div>
    );
  }

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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const { toast } = useToast();

   const handleCameraPermission = useCallback((permission: boolean) => {
    if (hasCameraPermission === permission) return; // Avoid redundant state updates
    
    setHasCameraPermission(permission);
    if (!permission) {
         toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
    }
  }, [toast, hasCameraPermission]);

  const handleScanComplete = useCallback((barcode: string) => {
    setShowScanner(false);
    setScannedBarcode(barcode);
  }, []);

  const handleClosePopup = useCallback(() => {
    setScannedBarcode(null);
    // Delay re-enabling the scanner to allow the sheet to close
    setTimeout(() => setShowScanner(true), 300);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen p-4 bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl">
        {showScanner && (
            <ScannerUI 
                onScanComplete={handleScanComplete} 
                onCameraPermission={handleCameraPermission} 
            />
        )}
        {hasCameraPermission === false && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/70 text-white">
                <CameraOff className="w-16 h-16 mb-4 text-destructive"/>
                <h2 className="text-2xl font-bold">Camera Access Denied</h2>
                <p className="mt-2 text-white/80">To scan barcodes, please grant camera access in your browser settings.</p>
            </div>
        )}
         {hasCameraPermission !== false && !showScanner && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-background">
                <p className="text-lg text-muted-foreground">Processing...</p>
             </div>
        )}
      </div>

      <div className="absolute z-20 text-center text-foreground bottom-24">
        <p className="mb-4 text-lg">Place a barcode inside the frame</p>
      </div>

      <Sheet
        open={!!scannedBarcode}
        onOpenChange={(open) => !open && handleClosePopup()}
      >
        <SheetContent
          side="bottom"
          className="h-screen max-h-[90vh] p-0 bg-black/80 backdrop-blur-sm border-none rounded-t-2xl"
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
