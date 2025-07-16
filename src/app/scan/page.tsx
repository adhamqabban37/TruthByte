
'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AnalysisSummary } from '@/components/scan/analysis-summary';
import type { Product } from '@/lib/types';
import {
  analyzeProductLabel,
  AnalyzeProductLabelOutput,
} from '@/ai/flows/analyze-product-label';
import { analyzeBarcode } from '@/ai/flows/analyze-barcode';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ScanState = 'idle' | 'scanning' | 'analyzing' | 'error' | 'permission_denied';

function SummaryPopupContent({
  scanResult,
  onClose,
}: {
  scanResult: AnalyzeProductLabelOutput;
  onClose: () => void;
}) {
  const {
    productName,
    productBrand,
    productImageUrl,
    analysis,
  } = scanResult;

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-white bg-transparent">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Analysis Failed</h2>
          <p className="text-white/80">
            Could not get enough information from the product. Please try again.
          </p>
          <Button
            onClick={onClose}
            className="mt-4"
            variant="secondary"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const product: Product = {
    barcode: scanResult.method === 'barcode' ? (productName || 'barcode-product') : 'ocr-product',
    name: productName || 'Analyzed Product',
    brand: productBrand || 'From your camera',
    imageUrl: productImageUrl || 'https://placehold.co/400x400.png',
  };

  return (
    <AnalysisSummary
      product={product}
      analysis={analysis}
      onClose={onClose}
    />
  );
}

const SCANNER_REGION_ID = 'scanner-region';

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<AnalyzeProductLabelOutput | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For OCR capture

  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await scannerRef.current.stop();
      } catch(err) {
        // Stop may fail if camera is already closed, which is fine.
        console.log("Scanner stop failed, probably already stopped.", err);
      }
    }
    setScanState('idle');
  }, []);

  const handleBarcodeScan = useCallback(async (decodedText: string) => {
    await stopScanner();
    setScanState('analyzing');
    console.log(`Scanned barcode: ${decodedText}`);

    try {
      const result = await analyzeBarcode({ barcode: decodedText });
      if (result.method !== 'none' && result.analysis) {
        setScanResult(result);
        setShowPopup(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Product Not Found',
          description: 'We couldn\'t find a product matching this barcode.',
        });
        setScanState('idle');
      }
    } catch (err) {
      console.error("Barcode analysis failed:", err);
      toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong.' });
      setScanState('error');
    }
  }, [stopScanner, toast]);

  const startBarcodeScanner = useCallback(async () => {
    if (hasCameraPermission === false || !scannerRef.current) {
      setScanState('permission_denied');
      return;
    }

    setScanState('scanning');
    
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleBarcodeScan,
        (errorMessage) => { /* ignore non-scans */ }
      );
    } catch (err) {
      console.error("Error starting barcode scanner", err);
      setScanState('permission_denied');
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: 'Could not start the camera. Please check permissions and try again.',
      });
    }
  }, [hasCameraPermission, handleBarcodeScan, toast]);

  const handleOcrScan = async () => {
    setScanState('analyzing');
    const video = document.querySelector(`#${SCANNER_REGION_ID} video`) as HTMLVideoElement;
    if (!video || !canvasRef.current) {
        setScanState('error');
        return;
    };

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg');

    await stopScanner();

    try {
        const result = await analyzeProductLabel({ photoDataUri: dataUri });
        if (result.method !== 'none' && result.analysis) {
          setScanResult(result);
          setShowPopup(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'We couldn\'t read the label. Please try again.',
          });
          setScanState('idle');
        }
    } catch (err) {
        console.error("OCR analysis failed:", err);
        toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong.' });
        setScanState('error');
    }
  };
  
  // This effect initializes and cleans up the scanner instance.
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setHasCameraPermission(false);
        setScanState('permission_denied');
      }
    };
    checkPermission();

    // Initialize the scanner instance when component mounts
    scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID, {
        verbose: false,
    });

    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('idle'); 
  }, []);

  const renderContent = () => {
    switch(scanState) {
      case 'permission_denied':
        return (
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <CameraOff className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold">Camera Access Denied</h2>
            <p className="mt-2 text-muted-foreground">To scan products, please grant camera access in your browser settings and refresh the page.</p>
          </div>
        );
      case 'error':
        return (
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <Loader2 className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold">An Error Occurred</h2>
            <p className="mt-2 text-muted-foreground">Something went wrong during analysis.</p>
            <Button onClick={() => setScanState('idle')} className="mt-4">Try Again</Button>
          </div>
        );
      case 'idle':
        return (
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <Camera className="w-16 h-16 mb-4 text-primary"/>
            <h2 className="text-2xl font-bold">Ready to Scan</h2>
            <p className="mt-2 max-w-xs text-center text-muted-foreground">Point your camera at a product barcode to begin.</p>
            <Button onClick={startBarcodeScanner} size="lg" className="mt-6 h-14" disabled={hasCameraPermission === false}>
              <ScanLine className="w-6 h-6 mr-2" />
              Start Barcode Scan
            </Button>
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-4 text-left">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser settings to use this feature.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      case 'scanning':
      case 'analyzing':
        return (
          <>
            <div id={SCANNER_REGION_ID} className="w-full h-full" />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
              {scanState === 'analyzing' ? (
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">Analyzing...</h2>
                  <p className="mt-2 text-muted-foreground">The AI is inspecting your product.</p>
                </div>
              ) : (
                <div className="w-[250px] h-[250px] border-4 border-dashed border-white/50 rounded-2xl" />
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl bg-muted flex items-center justify-center">
        {renderContent()}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      
      {scanState === 'scanning' && (
        <div className="absolute bottom-10 z-20 flex flex-col items-center gap-4">
          <Button onClick={stopScanner} size="lg" variant="destructive" className="w-48 h-16 rounded-full text-lg shadow-2xl">
            Cancel
          </Button>
        </div>
      )}

      {scanState === 'idle' && (
        <div className="absolute z-20 flex flex-col items-center gap-4 text-center text-foreground bottom-10 px-4">
            <p className="text-sm text-muted-foreground">Or, if the product has no barcode:</p>
             <Button
                onClick={() => toast({ title: "Feature coming soon!", description: "OCR scanning will be enabled in a future update."})}
                variant="outline"
                disabled // Re-enable when OCR flow is ready
             >
                Scan Label with OCR
            </Button>
        </div>
      )}

      <Sheet
        open={showPopup}
        onOpenChange={(open) => !open && handleClosePopup()}
      >
        <SheetContent
          side="bottom"
          className="h-screen max-h-[90vh] p-0 bg-black/80 backdrop-blur-sm border-none rounded-t-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle className="sr-only">
              Product Analysis Summary
            </SheetTitle>
          </SheetHeader>
          {scanResult && (
            <SummaryPopupContent
              scanResult={scanResult}
              onClose={handleClosePopup}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
