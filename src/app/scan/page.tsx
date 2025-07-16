
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
import { Camera, Loader2, ScanLine, X, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import styles from '@/components/scan/scanner.module.css';

type ScanState = 'idle' | 'starting' | 'scanning' | 'analyzing' | 'error' | 'permission_denied' | 'success';

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
    dataAiHint: productName,
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
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Camera feature states
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isFlashlightAvailable, setIsFlashlightAvailable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<MediaTrackCapabilities['zoom'] | null>(null);
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  const { toast } = useToast();

  const compressImage = useCallback((dataUri: string, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUri;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => {
        console.error("Image loading error for compression", error);
        reject(error);
      };
    });
  }, []);

  const stopScanner = useCallback(async (isSuccessCleanup = false) => {
     try {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
            scannerRef.current = null; // Clear the instance
        }
        
        // This is a workaround for a potential bug in html5-qrcode where clear() is needed
        try {
            const scanner = new Html5Qrcode(SCANNER_REGION_ID);
            scanner.clear();
        } catch (e) {
            // This may fail if the element is gone, which is fine.
        }

        if (!isSuccessCleanup) {
            if (trackRef.current) {
              if (isFlashlightOn && isFlashlightAvailable) {
                await trackRef.current.applyConstraints({ advanced: [{ torch: false }] });
              }
              trackRef.current.stop();
              trackRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                 if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            }
            
            setScanState('idle');
            setIsFlashlightOn(false);
            setIsFlashlightAvailable(false);
            setZoomCapabilities(null);
            setZoomLevel(1);
            setShowZoomSlider(false);
        }
    } catch(e) {
        console.warn("Error stopping scanner", e);
    }
  }, [isFlashlightOn, isFlashlightAvailable]);

  const handleScanSuccess = useCallback((result: AnalyzeProductLabelOutput) => {
    if (result.method === 'none' || scanState === 'analyzing' || scanState === 'success') {
        return;
    }
    setScanState('success');
    setIsSuccess(true);
    stopScanner(true);
    
    setScanResult(result);
    setTimeout(() => {
        setShowPopup(true);
        setIsSuccess(false);
    }, 500); // Wait for feedback animation before showing popup
    
  }, [stopScanner, scanState]);
  
  const startScanner = useCallback(async () => {
    setScanState('starting');
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous',
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const currentTrack = stream.getVideoTracks()[0];
      trackRef.current = currentTrack;
      const capabilities = currentTrack.getCapabilities();

      if (capabilities.torch) {
        setIsFlashlightAvailable(true);
      }
      if (capabilities.zoom) {
        setZoomCapabilities(capabilities.zoom);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      const qrCodeScanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
      scannerRef.current = qrCodeScanner;
      
      qrCodeScanner.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 300, height: 150 }, showTorchButtonIfSupported: false, aspectRatio: 1.0 },
        async (decodedText) => {
           if (scanState === 'scanning') {
             setScanState('analyzing');
             try {
               abortControllerRef.current = new AbortController();
               const result = await analyzeBarcode({ barcode: decodedText, signal: abortControllerRef.current.signal });
               handleScanSuccess(result);
             } catch(e) {
                if (e.name !== 'AbortError') {
                    console.error("Barcode analysis failed:", e);
                    setScanState('scanning');
                }
             }
           }
        },
        (errorMessage) => { /* ignore */ }
      ).catch(err => {
          console.error("Error starting barcode scanner:", err);
      });

      setScanState('scanning');
    } catch (err) {
      console.error("Error starting camera:", err);
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start camera. Please grant permissions and try again.' });
      setScanState('permission_denied');
    }
  }, [toast, handleScanSuccess, scanState]);
  
  const handleCaptureLabel = useCallback(async () => {
    if (scanState !== 'scanning' || !videoRef.current || !canvasRef.current) {
      return;
    }
    setScanState('analyzing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            const dataUri = await compressImage(canvas.toDataURL('image/jpeg'), 800, 0.8);
            abortControllerRef.current = new AbortController();
            const result = await analyzeProductLabel({ photoDataUri: dataUri, signal: abortControllerRef.current.signal });
            handleScanSuccess(result);
        } catch (e) {
            if (e.name !== 'AbortError') {
              console.error("Label analysis failed:", e);
              toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not analyze the label. Please try again.' });
              setScanState('scanning'); // Return to scanning state on failure
            }
        }
    } else {
        setScanState('scanning');
    }
  }, [scanState, toast, handleScanSuccess, compressImage]);


  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    stopScanner().then(startScanner);
  }, [startScanner, stopScanner]);

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

  const handleZoomChange = (value: number) => {
    if (trackRef.current && zoomCapabilities) {
        const newZoom = Math.max(zoomCapabilities.min, Math.min(value, zoomCapabilities.max));
        trackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
        setZoomLevel(newZoom);
    }
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);


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
      case 'success':
        return null; 
      case 'permission_denied':
        return (
          <Alert variant="destructive" className="z-10 m-4">
            <ScanLine className="w-4 h-4" />
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
                <Button onClick={() => stopScanner().then(startScanner)} className="mt-4 w-full">Try Again</Button>
              </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen pt-4 bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl bg-muted flex items-center justify-center">
        {renderContent()}

        {(scanState !== 'idle' && scanState !== 'permission_denied' && scanState !== 'error') && (
            <>
              <video ref={videoRef} className={"absolute inset-0 w-full h-full object-cover"} autoPlay playsInline muted />
              <div id={SCANNER_REGION_ID} className={"w-full h-full"} />
              <canvas ref={canvasRef} className="hidden"></canvas>
            </>
        )}
        
        {(scanState === 'scanning' || scanState === 'success') && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-4 pointer-events-none">
                 <div className="flex justify-between w-full pointer-events-auto">
                    {/* Zoom controls */}
                    {zoomCapabilities ? (
                        <div className="flex items-center gap-1 p-1 rounded-full bg-black/30 backdrop-blur-sm">
                            <Button size="icon" variant="ghost" className="text-white rounded-full hover:bg-white/20" onClick={() => handleZoomChange(zoomLevel - zoomCapabilities.step)}>
                                <ZoomOut className="w-6 h-6" />
                            </Button>
                             <Button size="icon" variant="ghost" className="text-white rounded-full hover:bg-white/20" onClick={() => setShowZoomSlider(!showZoomSlider)}>
                                <span className="font-bold">{zoomLevel.toFixed(1)}x</span>
                            </Button>
                            <Button size="icon" variant="ghost" className="text-white rounded-full hover:bg-white/20" onClick={() => handleZoomChange(zoomLevel + zoomCapabilities.step)}>
                                <ZoomIn className="w-6 h-6" />
                            </Button>
                        </div>
                    ) : <div/>}
                    {/* Flashlight toggle */}
                    {isFlashlightAvailable && (
                      <Button
                          size="icon"
                          variant={isFlashlightOn ? 'secondary' : 'ghost'}
                          onClick={toggleFlashlight}
                          className={cn("text-white rounded-full backdrop-blur-sm", !isFlashlightOn && "bg-black/30 hover:bg-white/20")}
                      >
                        {isFlashlightOn ? <ZapOff className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        <span className="sr-only">Toggle Flashlight</span>
                      </Button>
                    )}
                 </div>
                 
                 {showZoomSlider && zoomCapabilities && (
                    <div className="absolute p-4 pointer-events-auto top-16 left-4 right-4">
                         <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                            <Slider
                                min={zoomCapabilities.min}
                                max={zoomCapabilities.max}
                                step={zoomCapabilities.step}
                                value={[zoomLevel]}
                                onValueChange={([val]) => handleZoomChange(val)}
                            />
                        </div>
                    </div>
                 )}

                 <div className="flex-grow" />
                 
                 <div className={cn(
                      styles.scanner,
                      "w-[80%] max-w-[400px] aspect-square rounded-full border-4 border-white/90 shadow-2xl relative",
                      isSuccess && styles.success,
                      { 'box-shadow': '0 0 0 9999px rgba(0,0,0,0.5)' }
                 )}>
                    {!isSuccess && scanState === 'scanning' && (
                       <>
                         <div className={styles.scanner_wave}></div>
                         <div className={styles.scanner_wave}></div>
                         <div className={styles.scanner_wave}></div>
                       </>
                    )}
                 </div>


                 <div className="flex flex-col items-center w-full gap-4 pt-4 pointer-events-auto">
                     {scanState === 'scanning' && (
                       <>
                        <Button
                            size="lg"
                            className="w-20 h-20 rounded-full shadow-lg"
                            onClick={handleCaptureLabel}
                        >
                            <Camera className="w-8 h-8"/>
                            <span className="sr-only">Capture Label</span>
                        </Button>
                        <p className="font-semibold text-white bg-black/50 px-3 py-1 rounded-lg">
                            Align product in the circle
                        </p>
                      </>
                    )}
                 </div>
              </div>
        )}
      </div>
      
      <div className="w-full max-w-md p-4">
        {scanState !== 'idle' && (
            <Button variant="destructive" className="w-full" onClick={() => stopScanner()}>
                <X className="w-5 h-5 mr-2" />
                Stop Camera
            </Button>
        )}
      </div>

      <Sheet
        open={showPopup}
        onOpenChange={(open) => {
           if (!open) {
                handleClosePopup();
           }
        }}
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

    
