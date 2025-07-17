
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
import { analyzeBarcode } from '@/ai/flows/analyze-barcode';
import { Loader2, ScanLine, X, Zap, ZapOff, ZoomIn, ZoomOut, Barcode, TextSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Html5Qrcode, type Html5QrcodeError } from 'html5-qrcode';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import styles from '@/components/scan/scanner.module.css';
import Tesseract from 'tesseract.js';
import { summarizeText, type SummarizeTextOutput } from '@/ai/flows/summarize-text';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


type AnalyzeOutput = (SummarizeTextOutput & {productImageUrl?: string, method: 'ocr' | 'barcode' | 'none', error?: string, barcode?: string});

type ScanState = 'idle' | 'starting' | 'scanning' | 'analyzing' | 'error' | 'permission_denied' | 'success';
type ScanMode = 'barcode' | 'label';


function SummaryPopupContent({
  scanResult,
  onClose,
}: {
  scanResult: AnalyzeOutput;
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
    barcode: scanResult.method === 'barcode' && scanResult.barcode ? scanResult.barcode : 'ocr-product',
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

export default function ScannerClient() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [scanResult, setScanResult] = useState<AnalyzeOutput | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isFlashlightAvailable, setIsFlashlightAvailable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<MediaTrackCapabilities['zoom'] | null>(null);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [isClear, setIsClear] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingRef = useRef(false);

  const { toast } = useToast();

  const handleCaptureLabel = useCallback(async () => {
    if (scanState !== 'scanning' || !videoElRef.current || scanMode !== 'label') return;
    
    const videoEl = videoElRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const { data: { text, confidence } } = await Tesseract.recognize(dataUri, 'eng');
      
      if (confidence < 60 || !text || text.trim().length < 10) {
        setIsClear(false);
        return;
      }
      
      if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
      
      setScanState('analyzing');
      setIsClear(true);

      const result = await summarizeText({ labelText: text });
      
      handleScanSuccess({ ...result, productImageUrl: dataUri, method: 'ocr' });
      
    } catch(e) {
        console.error("Label analysis failed:", e);
        // Don't toast here, as it's a continuous process
        setScanState('scanning'); 
        setIsClear(false);
        // Restart the timer if it failed
        if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
        ocrIntervalRef.current = setInterval(handleCaptureLabel, 2500);
    }
  }, [scanState, scanMode]);


  const handleScanSuccess = useCallback((result: AnalyzeOutput) => {
    if (result.method === 'none' || !result.analysis) {
      console.warn("Analysis failed or returned no data.", result.error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error || 'Could not analyze the product. Please try again.',
      });
      setScanState('scanning'); 
      setIsClear(false);
      
      if (result.method === 'ocr') {
         if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
         ocrIntervalRef.current = setInterval(handleCaptureLabel, 2500);
      }
      return;
    }
    
    setScanResult(result);
    setScanState('success');
    setShowPopup(true);
  }, [toast, handleCaptureLabel]);


  const onBarcodeSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple triggers while analyzing
    if (scanState !== 'scanning') return;
    
    setIsClear(true);
    setScanState('analyzing');
    if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);

    try {
      const result = await analyzeBarcode({ barcode: decodedText });
      handleScanSuccess({...result, barcode: decodedText, method: 'barcode'});
    } catch(e) {
        console.error("Barcode analysis failed:", e);
        toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not analyze the barcode.' });
        setScanState('error');
    }
  }, [scanState, handleScanSuccess, toast]);

  const onScanError = useCallback((error: Html5QrcodeError) => {
    // This callback is noisy, so we only log specific, non-continuous errors.
    // "QR code or barcode not found" is expected, so we ignore it.
  }, []);

 const stopScanner = useCallback(async () => {
    if (ocrIntervalRef.current) {
        clearInterval(ocrIntervalRef.current);
        ocrIntervalRef.current = null;
    }

    if (!scannerRef.current) return;

    try {
        if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
        }
    } catch (e) {
        console.warn("Error stopping scanner:", e);
    } finally {
        if (videoTrackRef.current) {
            if (isFlashlightOn) {
                try {
                    await videoTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
                } catch (e) { console.warn("Could not turn off flashlight on stop", e); }
            }
            videoTrackRef.current.stop();
            videoTrackRef.current = null;
        }

        const scannerRegion = document.getElementById(SCANNER_REGION_ID);
        if (scannerRegion) {
          const videoEl = scannerRegion.querySelector('video');
          if (videoEl) videoEl.srcObject = null;
          // Clear any leftover elements from the library
          scannerRegion.innerHTML = "";
        }
        
        videoElRef.current = null;
        setIsFlashlightOn(false);
        setIsFlashlightAvailable(false);
        setZoomCapabilities(null);
        setShowZoomSlider(false);
        setZoomLevel(1);
        setIsClear(false);
    }
}, [isFlashlightOn]);


  const startScanner = useCallback(async (mode: ScanMode) => {
    if (isStartingRef.current) return;
    
    isStartingRef.current = true;
    setScanState('starting');
    
    // Ensure previous instance is stopped before starting a new one
    await stopScanner();

    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      let size = Math.floor(minEdge * 0.9);
      const finalSize = Math.max(size, 50); // Ensure size is at least 50px

      if (mode === 'barcode') {
        return { width: finalSize, height: Math.max(Math.floor(finalSize * 0.5), 50) };
      }
      return { width: finalSize, height: finalSize };
    };

    const config = {
      fps: 10,
      qrbox: qrboxFunction,
      disableFlip: true,
      videoConstraints: {
        facingMode: 'environment',
      }
    };
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        onBarcodeSuccess,
        onScanError
      );

      setScanState('scanning');
      
      const videoEl = document.getElementById(SCANNER_REGION_ID)?.querySelector('video');
      if (videoEl && videoEl.srcObject instanceof MediaStream) {
        videoTrackRef.current = videoEl.srcObject.getVideoTracks()[0];
        const capabilities = videoTrackRef.current.getCapabilities();
        if (capabilities.torch) setIsFlashlightAvailable(true);
        if (capabilities.zoom) setZoomCapabilities(capabilities.zoom);
        videoElRef.current = videoEl;

        if (mode === 'label') {
          if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
          ocrIntervalRef.current = setInterval(handleCaptureLabel, 2500);
        }
      } else {
        throw new Error("Could not get video stream.");
      }
    } catch (err: any) {
      console.error(`Error starting ${mode} scanner:`, err);
      toast({ variant: 'destructive', title: 'Camera Error', description: `Could not start camera. Please grant permissions and try again. ${err.message}` });
      setScanState(err.name === 'NotAllowedError' ? 'permission_denied' : 'error');
    } finally {
        isStartingRef.current = false;
    }
  }, [stopScanner, onBarcodeSuccess, onScanError, toast, handleCaptureLabel]);

  useEffect(() => {
    startScanner(scanMode);
  }, [scanMode, startScanner]);

  useEffect(() => {
    // This is the cleanup function that runs when the component unmounts.
    return () => {
        if (ocrIntervalRef.current) {
            clearInterval(ocrIntervalRef.current);
        }
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
        }
    };
  }, []);

  const resetScanner = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('idle'); // This will trigger the effect to restart the scanner
    startScanner(scanMode);
  }, [scanMode, startScanner]);

  const handleModeChange = (newMode: ScanMode) => {
    if (newMode === scanMode || scanState === 'analyzing' || isStartingRef.current) return;
    setScanMode(newMode);
  }


  const toggleFlashlight = useCallback(() => {
    if (videoTrackRef.current && isFlashlightAvailable) {
      const nextState = !isFlashlightOn;
      videoTrackRef.current.applyConstraints({
        advanced: [{ torch: nextState }]
      }).then(() => {
        setIsFlashlightOn(nextState);
      }).catch(e => console.error("Failed to toggle flashlight", e));
    }
  }, [isFlashlightOn, isFlashlightAvailable]);

  const handleZoomChange = (value: number) => {
    if (videoTrackRef.current && zoomCapabilities) {
        try {
            const newZoom = Math.max(zoomCapabilities.min, Math.min(value, zoomCapabilities.max));
            videoTrackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
            setZoomLevel(newZoom);
        } catch(e) {
            console.warn("Could not apply zoom", e);
        }
    }
  }

  const renderScannerStateOverlay = () => {
    switch(scanState) {
      case 'idle':
      case 'starting':
         return (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/60">
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">Starting Camera...</h2>
                </div>
            </div>
        )
      case 'analyzing':
           return (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-black/60">
                <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                  <h2 className="text-2xl font-bold">Analyzing...</h2>
                   <p className="mt-2 text-muted-foreground">The AI is inspecting your product.</p>
                </div>
            </div>
        )
      case 'permission_denied':
        return (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-background">
            <Alert variant="destructive" className="max-w-md">
              <ScanLine className="w-4 h-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                To scan products, please grant camera access in your browser settings and refresh the page.
                 <Button onClick={() => window.location.reload()} className="w-full mt-4">Refresh Page</Button>
              </AlertDescription>
            </Alert>
          </div>
        );
      case 'error':
        return (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-background">
              <Alert variant="destructive" className="max-w-md">
                  <AlertTitle>An Error Occurred</AlertTitle>
                  <AlertDescription>
                    Something went wrong with the camera. Please try again.
                    <Button onClick={() => setScanMode(m => m)} className="mt-4 w-full">Try Again</Button>
                  </AlertDescription>
              </Alert>
          </div>
        );
      default:
        return null;
    }
  };
  
  const getScannerBoxClass = () => {
    const baseClass = "w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] shadow-2xl relative";
    if (scanMode === 'barcode') {
       return cn(baseClass, styles.scanner_barcode, isClear && styles.success, scanState === 'analyzing' && styles.analyzing);
    }
    return cn(baseClass, styles.scanner_label, isClear && styles.success, scanState === 'analyzing' && styles.analyzing);
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen pt-4 bg-background">
      <div className="relative w-full h-[80vh] max-h-screen overflow-hidden bg-muted flex items-center justify-center">
        {renderScannerStateOverlay()}

        <div id={SCANNER_REGION_ID} className={cn("w-full h-full", "scanner-container", (scanState !== 'scanning' && scanState !== 'analyzing' && scanState !== 'success') && "hidden" )}>
            <style jsx>{`
              .scanner-container > video {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
            `}</style>
        </div>
        
        {(scanState === 'scanning' || scanState === 'success' || scanState === 'analyzing') && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-4 pointer-events-none">
                 <div className="flex justify-between w-full pointer-events-auto">
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
                 
                 <div className={getScannerBoxClass()}>
                    <div className={cn(
                        styles.scanner_box,
                    )}>
                      <div className={styles.scanner_overlay}></div>
                        {(scanState === 'scanning' && scanMode === 'barcode') && (
                            <div className={styles.barcode_line} />
                        )}
                    </div>
                 </div>

                <div className="flex flex-col items-center w-full gap-4 pt-4 pointer-events-auto">
                    {scanState === 'scanning' && (
                        <p className="font-semibold text-white bg-black/50 px-3 py-1 rounded-lg">
                           {scanMode === 'barcode' ? 'Align barcode in the frame' : 'Align label in the frame'}
                        </p>
                    )}
                    <Tabs value={scanMode} onValueChange={(v) => handleModeChange(v as ScanMode)} className="w-full max-w-xs">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="barcode"><Barcode className="w-5 h-5 mr-2" /> Barcode</TabsTrigger>
                            <TabsTrigger value="label"><TextSearch className="w-5 h-5 mr-2" /> Label</TabsTrigger>
                        </TabsList>
                    </Tabs>
                 </div>
              </div>
        )}
      </div>

      <Sheet
        open={showPopup}
        onOpenChange={(open) => {
           if (!open) {
                resetScanner();
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
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 z-10 text-white bg-white/10 hover:bg-white/20 rounded-full"
                onClick={resetScanner}
            >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
            </Button>
          </SheetHeader>
          {scanResult && (
            <SummaryPopupContent
              scanResult={scanResult}
              onClose={resetScanner}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
