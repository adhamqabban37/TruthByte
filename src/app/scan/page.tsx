
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
import { Camera, CameraOff, Loader2, ScanBarcode, ScanLine, X, Zap, ZapOff } from 'lucide-react';
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
import { cn } from '@/lib/utils';

type ScanState = 'idle' | 'starting' | 'scanning' | 'analyzing' | 'error' | 'permission_denied';
type ScanMode = 'label' | 'barcode';

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
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isFlashlightAvailable, setIsFlashlightAvailable] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    // Stop barcode scanner
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn("Could not stop barcode scanner.", e);
      }
    }
    
    // Stop camera stream
    if (trackRef.current) {
        if (isFlashlightOn) {
            // Turn off flashlight before stopping track
            trackRef.current.applyConstraints({ advanced: [{ torch: false }] });
            setIsFlashlightOn(false);
        }
        trackRef.current.stop();
        trackRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanState('idle');
  }, [isFlashlightOn]);

  const handleScanSuccess = useCallback((result: AnalyzeProductLabelOutput) => {
    setScanResult(result);
    setShowPopup(true);
    setScanState('analyzing');
  }, []);
  
  const startScanner = useCallback(async () => {
    setScanState('starting');
    try {
       const constraints = {
          video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
          }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const currentTrack = stream.getVideoTracks()[0];
      trackRef.current = currentTrack;
      const capabilities = currentTrack.getCapabilities();
      if (capabilities.torch) {
          setIsFlashlightAvailable(true);
      }
      
      // Attach stream to video element for label scanning
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setScanState('scanning');
    } catch (err) {
      console.error("Error starting camera:", err);
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start camera. Please grant permissions and try again.'});
      setScanState('permission_denied');
    }
  }, [toast]);
  
  const captureLabel = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanState('analyzing');
    
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
      handleScanSuccess(result);
    } catch (err) {
      console.error("OCR analysis failed:", err);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not analyze the image. Please try again.' });
      setScanState('scanning');
    }
  }, [handleScanSuccess, toast]);
  

  useEffect(() => {
    const initBarcodeScanner = async () => {
      if(scanMode === 'barcode' && scanState === 'scanning' && !scannerRef.current?.isScanning) {
        try {
          const qrCodeScanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
          scannerRef.current = qrCodeScanner;
          
          await qrCodeScanner.start(
            { facingMode: 'environment' },
            { fps: 30, qrbox: { width: 300, height: 150 } },
            async (decodedText) => {
               try {
                 setScanState('analyzing');
                 const result = await analyzeBarcode({ barcode: decodedText });
                 handleScanSuccess(result);
               } catch(e) {
                 console.error("Barcode analysis failed:", e);
                 setScanState('scanning');
               }
            },
            () => {}
          );
        } catch (err) {
          console.error("Error starting barcode scanner:", err);
        }
      }
    };
    
    initBarcodeScanner();

    // Cleanup
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.warn("Error stopping barcode scanner on cleanup", e));
      }
    };
  }, [scanState, scanMode, handleScanSuccess]);


  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('scanning'); 
  }, []);

  const toggleFlashlight = useCallback(() => {
    if (trackRef.current && isFlashlightAvailable) {
        const nextState = !isFlashlightOn;
        trackRef.current.applyConstraints({
            advanced: [{ torch: nextState }]
        }).then(() => {
            setIsFlashlightOn(nextState);
        }).catch(e => console.error("Failed to toggle flashlight", e));
    }
  }, [isFlashlightOn, isFlashlightAvailable]);

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
                <Button size="lg" onClick={startScanner}>
                   Start Camera
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'starting':
      case 'analyzing':
         return (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/60">
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">{scanState === 'starting' ? 'Starting Camera...' : 'Analyzing...'}</h2>
                  {scanState === 'analyzing' && <p className="mt-2 text-muted-foreground">The AI is inspecting your product.</p>}
                </div>
            </div>
        )
      case 'scanning':
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
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen pt-4 bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-video rounded-2xl bg-muted flex items-center justify-center">
        {renderContent()}

        {/* Video and overlays are visible during scanning states */}
        {(scanState !== 'idle' && scanState !== 'permission_denied' && scanState !== 'error') && (
            <>
              <video ref={videoRef} className={cn("absolute inset-0 w-full h-full object-cover", scanMode === 'barcode' ? 'hidden' : 'block')} autoPlay playsInline muted />
              <div id={SCANNER_REGION_ID} className={cn("absolute inset-0 w-full h-full", scanMode === 'label' ? 'hidden' : 'block')} />
              <canvas ref={canvasRef} className="hidden"></canvas>
            </>
        )}
        
        {/* Scanning UI */}
        {(scanState === 'scanning') && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-4 pointer-events-none">
                 {/* Top Controls */}
                 <div className="flex justify-end w-full pointer-events-auto">
                    {isFlashlightAvailable && (
                      <Button
                          size="icon"
                          variant={isFlashlightOn ? 'secondary' : 'outline'}
                          onClick={toggleFlashlight}
                          className="rounded-full h-12 w-12"
                      >
                        {isFlashlightOn ? <ZapOff className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        <span className="sr-only">Toggle Flashlight</span>
                      </Button>
                    )}
                 </div>

                 {/* Center Frame */}
                 <div className="w-[90%] aspect-video border-4 border-white/80 rounded-2xl shadow-2xl" style={{
                     boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                 }} />

                 {/* Bottom Controls */}
                 <div className="flex flex-col items-center w-full gap-4 pointer-events-auto">
                    <p className="font-semibold text-white bg-black/50 px-3 py-1 rounded-lg">
                        {scanMode === 'label' ? "Align product label in the box" : "Align barcode in the box"}
                    </p>
                    
                    {scanMode === 'label' ? (
                       <Button size="lg" className="w-full max-w-xs h-14" onClick={captureLabel}>
                         <Camera className="w-6 h-6 mr-2"/>
                         Capture Label
                       </Button>
                    ) : null}

                    <div className="flex items-center justify-center w-full gap-4 p-2 rounded-full bg-black/30">
                        <Button variant={scanMode === 'label' ? 'secondary' : 'ghost'} onClick={() => setScanMode('label')}>
                            <ScanLine className="w-5 h-5 mr-2" /> Label
                        </Button>
                        <Button variant={scanMode === 'barcode' ? 'secondary' : 'ghost'} onClick={() => setScanMode('barcode')}>
                             <ScanBarcode className="w-5 h-5 mr-2" /> Barcode
                        </Button>
                    </div>
                 </div>
              </div>
        )}
      </div>
      
      <div className="w-full max-w-md p-4">
        {scanState !== 'idle' && (
            <Button variant="destructive" className="w-full" onClick={stopScanner}>
                <X className="w-5 h-5 mr-2" />
                Stop Camera
            </Button>
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

    