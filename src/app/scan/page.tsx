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
import { Html5Qrcode } from 'html5-qrcode';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type ScanState = 'idle' | 'starting' | 'scanning' | 'analyzing' | 'error' | 'permission_denied';

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
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const { toast } = useToast();

  const stopAllScanners = useCallback(async () => {
    // Stop OCR interval
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
    
    // Stop barcode scanner
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error("Error stopping barcode scanner:", e);
      }
    }
    scannerRef.current = null;

    // Stop camera stream
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleScanSuccess = useCallback((result: AnalyzeProductLabelOutput) => {
    if (isProcessingRef.current) return; // Already handling a success
    isProcessingRef.current = true;
    setScanState('analyzing');
    stopAllScanners();
    setScanResult(result);
    setShowPopup(true);
  }, [stopAllScanners]);

  const startOcrScan = useCallback(() => {
    if (ocrIntervalRef.current) return; // Already running

    ocrIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || isProcessingRef.current || scanState !== 'scanning') return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState < video.HAVE_METADATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');
      
      try {
        const result = await analyzeProductLabel({ photoDataUri: dataUri });
        if (result.method === 'ocr' && result.analysis) {
          handleScanSuccess(result);
        }
      } catch (err) {
        // This is expected to fail often, so we don't show a toast.
        console.error("OCR analysis failed:", err);
      }
    }, 2000); // Run OCR every 2 seconds
  }, [scanState, handleScanSuccess]);
  
  const startBarcodeScanner = useCallback(async () => {
    if (scannerRef.current) return; // Already running

    try {
      const qrCodeScanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
      scannerRef.current = qrCodeScanner;
      await qrCodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
           if (isProcessingRef.current) return;
           const result = await analyzeBarcode({ barcode: decodedText });
           if (result.method === 'barcode' && result.analysis) {
             handleScanSuccess(result);
           }
        },
        () => {} // Ignore scan region
      );
    } catch (err) {
      console.error("Error starting barcode scanner:", err);
      // Don't set state to error, as OCR might still work
    }
  }, [handleScanSuccess]);


  useEffect(() => {
    const startScanning = async () => {
      if (scanState !== 'scanning') return;

      isProcessingRef.current = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
        // Start both scanners simultaneously
        startOcrScan();
        startBarcodeScanner();

      } catch (err) {
        console.error('Error starting camera:', err);
        setScanState('permission_denied');
      }
    };
    
    if (scanState === 'scanning') {
      startScanning();
    }

    // Cleanup
    return () => {
      stopAllScanners();
    };
  }, [scanState, stopAllScanners, startOcrScan, startBarcodeScanner]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('idle'); 
    isProcessingRef.current = false;
  }, []);


  const renderContent = () => {
    switch(scanState) {
      case 'idle':
        return (
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Scan a Product</CardTitle>
                <CardDescription>
                  Point your camera at a product label or barcode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={() => setScanState('scanning')}>
                   Start Camera
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'starting':
      case 'scanning':
      case 'analyzing':
        // The video and overlays are always present in these states
        return null; 
      case 'permission_denied':
        return (
          <Alert variant="destructive" className="z-10 m-4">
            <CameraOff className="w-4 h-4" />
            <AlertTitle>Camera Access Denied</AlertTitle>
            <AlertDescription>
              To scan products, please grant camera access in your browser settings and refresh the page.
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive" className="z-10 m-4">
              <AlertTitle>An Error Occurred</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again.
                <Button onClick={() => setScanState('idle')} className="mt-4 w-full">Try Again</Button>
              </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full h-full min-h-screen pt-8 bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl bg-muted flex items-center justify-center">
        {renderContent()}

        {/* Video and overlays are visible during scanning states */}
        {(scanState === 'scanning' || scanState === 'analyzing' || scanState === 'starting') && (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
              <div id={SCANNER_REGION_ID} className="absolute inset-0 w-full h-full" />
              <canvas ref={canvasRef} className="hidden"></canvas>
            </>
        )}
        
        {/* Overlays */}
        {(scanState === 'scanning') && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                 <div className="w-[250px] h-[250px] border-4 border-dashed border-white/50 rounded-2xl" />
                 <p className="mt-4 font-semibold text-white bg-black/50 px-3 py-1 rounded-lg">Scanning...</p>
              </div>
        )}
        
        {(scanState === 'analyzing') && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/50">
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">Analyzing...</h2>
                  <p className="mt-2 text-muted-foreground">The AI is inspecting your product.</p>
                </div>
            </div>
        )}

      </div>
      
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
