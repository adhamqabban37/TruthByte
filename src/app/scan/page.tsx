
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
import { CameraOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

type ScanState = 'initializing' | 'scanning' | 'analyzing' | 'error' | 'permission_denied';

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
  const [scanState, setScanState] = useState<ScanState>('initializing');
  const [scanResult, setScanResult] = useState<AnalyzeProductLabelOutput | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 

  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    try {
        if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
            await scannerRef.current.stop();
        }
    } catch (err) {
        console.error("Failed to stop scanner gracefully:", err);
    }
  }, []);

  const handleBarcodeScanSuccess = useCallback(async (decodedText: string) => {
    try {
      setScanState('analyzing');
      await stopScanner();
      
      const result = await analyzeBarcode({ barcode: decodedText });
      if (result.method !== 'none' && result.analysis) {
        setScanResult(result);
        setShowPopup(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Product Not Found',
          description: 'We couldn\'t find a product matching this barcode. Try scanning the label instead.',
        });
        setScanState('scanning');
      }
    } catch (err) {
      console.error("Barcode analysis failed:", err);
      toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong during barcode analysis.' });
      setScanState('error');
    }
  }, [stopScanner, toast]);
  
  const handleOcrScan = async () => {
    if (scanState !== 'scanning') return;

    const video = document.querySelector(`#${SCANNER_REGION_ID} video`) as HTMLVideoElement;
    
    if (!video || !canvasRef.current) {
        toast({ variant: 'destructive', title: 'Capture Error', description: 'Could not find video element to capture.' });
        setScanState('error');
        return;
    };

    try {
      setScanState('analyzing');
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');
      
      await stopScanner();

      const result = await analyzeProductLabel({ photoDataUri: dataUri });
      if (result.method !== 'none' && result.analysis) {
        setScanResult(result);
        setShowPopup(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'We couldn\'t read the label clearly. Please try again.',
        });
        setScanState('scanning');
      }
    } catch (err) {
        console.error("OCR analysis failed:", err);
        toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong during label analysis.' });
        setScanState('error');
    }
  };
  
  // Effect for checking camera permission and starting scan
  useEffect(() => {
    const checkPermissionAndStart = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(track => track.stop());
        setHasCameraPermission(true);
        setScanState('scanning');
      } catch (error) {
        console.error("Camera permission denied:", error);
        setHasCameraPermission(false);
        setScanState('permission_denied');
      }
    };

    if (hasCameraPermission === null) {
        checkPermissionAndStart();
    }

    return () => {
      stopScanner();
    }
  }, [hasCameraPermission, stopScanner]);

  // Effect for managing the scanner lifecycle based on scanState
  useEffect(() => {
    if (scanState !== 'scanning' || !hasCameraPermission) {
      return;
    }
    
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
    }
    const scanner = scannerRef.current;
    
    if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED || scanner.getState() === Html5QrcodeScannerState.STOPPED) {
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleBarcodeScanSuccess,
        () => { /* ignore non-scans */ }
      ).catch(err => {
        console.error("Error starting barcode scanner:", err);
        setScanState('permission_denied');
        toast({
          variant: 'destructive',
          title: 'Camera Error',
          description: 'Could not start the camera. Please check permissions and try again.',
        });
      });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        stopScanner();
      }
    };
  }, [scanState, hasCameraPermission, handleBarcodeScanSuccess, stopScanner, toast]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('scanning'); 
  }, []);
  
  const renderContent = () => {
    switch(scanState) {
      case 'initializing':
        return (
            <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                <h2 className="text-2xl font-bold">Requesting Camera...</h2>
            </div>
        )
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
            <p className="mt-2 text-muted-foreground">Something went wrong. Please try again.</p>
            <Button onClick={() => setScanState('initializing')} className="mt-4">Try Again</Button>
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
        <div className="absolute z-20 flex flex-col items-center gap-4 text-center bottom-10">
           <p className="px-4 text-sm text-muted-foreground">Or, if the product has no barcode:</p>
            <Button
              onClick={handleOcrScan}
              variant="outline"
              size="lg"
              className="w-48 h-16 rounded-full text-lg shadow-2xl bg-background/80"
            >
                Scan Label
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
