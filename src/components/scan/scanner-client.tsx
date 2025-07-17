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
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
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
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const { toast } = useToast();

  const handleScanSuccess = useCallback((result: AnalyzeOutput) => {
    if (result.method === 'none' || !result.analysis) {
      console.warn("Analysis failed or returned no data.", result.error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error || 'Could not analyze the product. Please try again.',
      });
      // Reset to allow another scan, preserving the current mode
      const currentMode = scanMode;
      stopScanner().then(() => {
        setScanMode(currentMode);
        setScanState('starting'); // Go back to starting to re-init camera
      });
      return;
    }
    
    setScanResult(result);
    setScanState('success');
    setShowPopup(true);
  }, [toast, scanMode]);


  const stopScanner = useCallback(async () => {
    // Clear any running OCR interval
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }

    // Stop the html5-qrcode scanner
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Could not stop or clear barcode scanner", e);
      }
    }
    
    // Stop the video track manually to ensure the camera light turns off
    if (videoTrackRef.current) {
        if (isFlashlightOn) {
            try {
               await videoTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
            } catch (e) { console.warn("Could not turn off flashlight on stop", e) }
        }
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
    }

    // Clear the video element reference
    videoElRef.current = null;

    // Reset all states
    setScanState('idle');
    setIsFlashlightOn(false);
    setIsFlashlightAvailable(false);
    setZoomCapabilities(null);
    setShowZoomSlider(false);
    setZoomLevel(1);
    setIsClear(false);
  }, [isFlashlightOn]);
  
  const resetScanner = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    stopScanner().then(() => {
      setScanState('starting'); // Re-initialize the scanner in the current mode
    });
  }, [stopScanner]);


  const handleCaptureLabel = useCallback(async () => {
    if (scanState !== 'scanning' || !videoElRef.current) return;
    
    const videoEl = videoElRef.current;
    
    setScanState('analyzing'); // Move to analyzing to prevent concurrent captures

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        setScanState('scanning'); // Go back if canvas fails
        return;
    };
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const { data: { text } } = await Tesseract.recognize(dataUri, 'eng');
      
      if (!text || text.trim().length < 10) {
        setIsClear(false);
        setScanState('scanning'); // Not enough text, go back to scanning
        return;
      }
      
      setIsClear(true);
      // Now in 'analyzing' state from before

      const result = await summarizeText({ labelText: text });
      
      handleScanSuccess({ ...result, productImageUrl: dataUri, method: 'ocr' });
      
    } catch(e) {
        console.error("Label analysis failed:", e);
        toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not read the label. Please try again.' });
        setScanState('scanning'); // Go back to scanning on failure
        setIsClear(false);
    }
  }, [handleScanSuccess, toast, scanState]);

  const onBarcodeSuccess = async (decodedText: string) => {
    if (scanState === 'scanning') {
      setIsClear(true);
      setScanState('analyzing');
      try {
        const result = await analyzeBarcode({ barcode: decodedText });
        handleScanSuccess({...result, barcode: decodedText, method: 'barcode'});
      } catch(e) {
          console.error("Barcode analysis failed:", e);
          toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not analyze the barcode.' });
          setScanState('error');
      }
    }
  };
  
  useEffect(() => {
    // Main effect to manage the scanner lifecycle
    let isMounted = true;
    scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false });

    async function start() {
      if (scanState !== 'starting' || !isMounted) return;
      
      try {
        const config = { facingMode: 'environment' };
        
        const onCameraStarted = () => {
          if (!isMounted) return;
          const videoEl = document.getElementById(SCANNER_REGION_ID)?.querySelector('video');
          if (videoEl && videoEl.srcObject instanceof MediaStream) {
            videoTrackRef.current = videoEl.srcObject.getVideoTracks()[0];
            const capabilities = videoTrackRef.current.getCapabilities();
            if (capabilities.torch) setIsFlashlightAvailable(true);
            if (capabilities.zoom) setZoomCapabilities(capabilities.zoom);
            videoElRef.current = videoEl;
            setScanState('scanning');

            if (scanMode === 'label') {
                if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
                ocrIntervalRef.current = setInterval(handleCaptureLabel, 2500);
            }
          }
        }

        if (scanMode === 'barcode') {
            await scannerRef.current!.start(
                config,
                { fps: 10, qrbox: { width: 300, height: 150 }, disableFlip: true },
                onBarcodeSuccess,
                () => {} // Ignore scan failure callback
            );
        } else { // Label mode
            await scannerRef.current!.start(
                config,
                { fps: 5, disableFlip: true },
                () => {},
                () => {}
            );
        }
        
        onCameraStarted();

      } catch (err: any) {
        if (!isMounted) return;
        console.error(`Error starting ${scanMode} scanner:`, err);
        toast({ variant: 'destructive', title: 'Camera Error', description: `Could not start camera. Please grant permissions and try again.` });
        setScanState(err.name === 'NotAllowedError' ? 'permission_denied' : 'error');
      }
    }
    
    if (scanState === 'starting') {
        start();
    }
    
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [scanState, scanMode]);


  // Effect to trigger the initial start
  useEffect(() => {
    setScanState('starting');
  }, []);


  const handleModeChange = (newMode: ScanMode) => {
    if (newMode === scanMode) return;
    setScanMode(newMode);
    stopScanner().then(() => {
      setScanState('starting');
    });
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
                    Something went wrong. Please try again.
                    <Button onClick={() => setScanState('starting')} className="mt-4 w-full">Try Again</Button>
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

        <div id={SCANNER_REGION_ID} className={cn("w-full h-full", (scanState !== 'scanning' && scanState !== 'analyzing' && scanState !== 'success') && "hidden" )} />
        
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
                        { 'boxShadow': '0 0 0 9999px rgba(0,0,0,0.6)' }
                    )}>
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

    