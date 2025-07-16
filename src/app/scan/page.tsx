
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
import { CameraOff, Loader2, Scan, ScanLine } from 'lucide-react';
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

type ScanMode = 'label' | 'barcode';
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
  const [scanMode, setScanMode] = useState<ScanMode>('label');
  const [scanResult, setScanResult] = useState<AnalyzeProductLabelOutput | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const { toast } = useToast();

  const handleOcrScan = async () => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.srcObject) {
        toast({ variant: 'destructive', title: 'Capture Error', description: 'Could not find video element or stream.' });
        return;
    };
    
    setScanState('analyzing');

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg');
      
    try {
      const result = await analyzeProductLabel({ photoDataUri: dataUri });
      if (result.method !== 'none' && result.analysis) {
        setScanResult(result);
        setShowPopup(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: "We couldn't read the label clearly. Please try again.",
        });
        setScanState('scanning'); // Go back to scanning
      }
    } catch (err) {
        console.error("OCR analysis failed:", err);
        toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong.' });
        setScanState('error');
    }
  };

  useEffect(() => {
    let isMounted = true;
    let localScanner: Html5Qrcode | null = null;
    let localStream: MediaStream | null = null;

    const stopScanner = async () => {
        try {
            if (localScanner && localScanner.isScanning) {
                await localScanner.stop();
            }
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) {
            console.error("Error stopping scanner gracefully:", e);
        } finally {
            localScanner = null;
            scannerRef.current = null;
        }
    };

    const startScanner = async () => {
        if (!isMounted || scanState !== 'scanning') return;

        await stopScanner();

        try {
            if (scanMode === 'label') {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                localStream = stream;
                if (isMounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                } else {
                    stream.getTracks().forEach(track => track.stop());
                }
            } else if (scanMode === 'barcode') {
                if (!document.getElementById(SCANNER_REGION_ID)) {
                    console.error("Scanner region not found in DOM");
                    if (isMounted) setScanState('error');
                    return;
                }
                
                localScanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
                scannerRef.current = localScanner;
                
                await localScanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    async (decodedText) => {
                        if (scanState !== 'scanning') return;
                        setScanState('analyzing');
                        try {
                            const result = await analyzeBarcode({ barcode: decodedText });
                            if (result.method !== 'none' && result.analysis) {
                                setScanResult(result);
                                setShowPopup(true);
                            } else {
                                toast({
                                    variant: 'destructive',
                                    title: 'Product Not Found',
                                    description: "Couldn't find this barcode. Try scanning the label.",
                                });
                                if (isMounted) setScanState('scanning');
                            }
                        } catch (err) {
                            console.error("Barcode analysis failed:", err);
                            toast({ variant: 'destructive', title: 'Analysis Error', description: 'Something went wrong.' });
                            if (isMounted) setScanState('error');
                        }
                    },
                    () => {}
                );
            }
        } catch (err) {
            console.error(`Error starting ${scanMode} scanner:`, err);
            if (isMounted) setScanState('permission_denied');
        }
    };
    
    if (scanState === 'scanning') {
        startScanner();
    }

    return () => {
        isMounted = false;
        stopScanner();
    };
  }, [scanState, scanMode, toast]);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('idle'); 
  }, []);

  const switchMode = (newMode: ScanMode) => {
    if (scanMode === newMode) return;
    setScanMode(newMode);
    if(scanState === 'scanning') {
        // The useEffect will handle the restart
    } else {
        setScanState('idle');
    }
  };

  const startScanning = () => {
    setScanState('scanning');
  }

  const renderContent = () => {
    switch(scanState) {
      case 'idle':
        return (
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Scan a Product</CardTitle>
                <CardDescription>
                  {scanMode === 'label' 
                    ? 'Point your camera at the ingredients list.'
                    : 'Center the product barcode in the frame.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={startScanning}>
                   <Scan className="w-5 h-5 mr-2"/> Start Camera
                </Button>
              </CardContent>
            </Card>
          </div>
        );
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
      case 'analyzing':
        return (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/50">
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">Analyzing...</h2>
                  <p className="mt-2 text-muted-foreground">The AI is inspecting your product.</p>
                </div>
            </div>
        );
      case 'scanning':
        if (scanMode === 'label') {
          return (
            <>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent pointer-events-none">
                    <Loader2 className="w-16 h-16 animate-spin text-white/50" />
                </div>
            </>
          );
        }
        if (scanMode === 'barcode') {
          return (
            <>
              <div id={SCANNER_REGION_ID} className="w-full h-full" />
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                 <div className="w-[250px] h-[250px] border-4 border-dashed border-white/50 rounded-2xl" />
              </div>
            </>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full h-full min-h-screen pt-8 bg-background">
      <div className="flex gap-2 mb-4">
        <Button variant={scanMode === 'label' ? 'default' : 'outline'} onClick={() => switchMode('label')}>
            Scan Label
        </Button>
        <Button variant={scanMode === 'barcode' ? 'default' : 'outline'} onClick={() => switchMode('barcode')}>
            Scan Barcode
        </Button>
      </div>

      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl bg-muted flex items-center justify-center">
        {renderContent()}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      
      {scanState === 'scanning' && scanMode === 'label' && (
        <div className="z-20 flex flex-col items-center gap-4 mt-4 text-center">
            <Button
              onClick={handleOcrScan}
              size="lg"
              className="w-48 h-16 rounded-full text-lg shadow-2xl"
              disabled={!videoRef.current?.srcObject}
            >
                <ScanLine className="w-6 h-6 mr-2" />
                Capture Label
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
