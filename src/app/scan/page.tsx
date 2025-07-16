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
import { Camera, CameraOff, Loader2, Aperture } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
            Could not get enough information from the label. Please try again with a clearer picture.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 mt-4 text-white rounded-md bg-primary"
          >
            Try Again
          </button>
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

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<AnalyzeProductLabelOutput | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera(); // Ensure any existing streams are stopped
    setScanState('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setScanState('permission_denied');
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this app.',
      });
    }
  }, [stopCamera, toast]);

  const handleCapture = async () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      videoRef.current.readyState === 4 // HAVE_ENOUGH_DATA
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');

        setScanState('analyzing');
        stopCamera();

        try {
          const result = await analyzeProductLabel({ photoDataUri: dataUri });
          if (result.method !== 'none' && result.analysis) {
             setScanResult(result);
             setShowPopup(true);
             setScanState('idle');
          } else {
             toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: 'Could not detect a product. Please try again with a clearer image.',
             });
             setScanState('idle');
          }
        } catch (err) {
          console.error("Analysis failed:", err);
          toast({
              variant: 'destructive',
              title: 'Analysis Error',
              description: 'Something went wrong. Please try again.'
          });
          setScanState('error');
        }
      }
    }
  };
  
  // Cleanup on component unmount
  useEffect(() => {
      return () => {
          stopCamera();
      }
  }, [stopCamera]);


  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setScanResult(null);
    setScanState('idle'); // Go back to the initial state
  }, []);

  const renderContent = () => {
    switch(scanState) {
        case 'permission_denied':
            return (
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/70 text-white">
                    <CameraOff className="w-16 h-16 mb-4 text-destructive"/>
                    <h2 className="text-2xl font-bold">Camera Access Denied</h2>
                    <p className="mt-2 text-white/80">To scan products, please grant camera access in your browser settings and refresh the page.</p>
                </div>
            );
        case 'error':
             return (
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/70 text-white">
                    <Loader2 className="w-16 h-16 mb-4 text-destructive"/>
                    <h2 className="text-2xl font-bold">An Error Occurred</h2>
                    <p className="mt-2 text-white/80">Something went wrong during analysis. Please try again.</p>
                     <Button onClick={() => setScanState('idle')} className="mt-4">Try Again</Button>
                </div>
            );
        case 'idle':
            return (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/50">
                    <div className="flex flex-col items-center justify-center p-10 bg-background/80 rounded-2xl backdrop-blur-sm">
                        <Camera className="w-16 h-16 mb-4 text-primary"/>
                        <h2 className="text-2xl font-bold">Ready to Scan</h2>
                        <p className="mt-2 max-w-xs text-center text-muted-foreground">Point your camera at a product label to begin.</p>
                        <Button onClick={startCamera} size="lg" className="mt-6 h-14">
                            Start Camera
                        </Button>
                    </div>
                </div>
            );
        case 'scanning':
            return (
                <>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center">
                        <div className="w-3/4 h-1/2 border-4 border-dashed border-white/50 rounded-2xl" />
                    </div>
                </>
            );
        case 'analyzing':
            return (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/70 text-white">
                    <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
                    <h2 className="text-2xl font-bold">Analyzing...</h2>
                    <p className="mt-2 text-white/80">The AI is inspecting your product.</p>
                </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen bg-background">
      <div className="relative w-full max-w-md mx-auto overflow-hidden aspect-square rounded-2xl bg-muted">
        {renderContent()}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      
      {scanState === 'scanning' && (
        <div className="absolute bottom-10 z-20 flex flex-col items-center gap-4">
            <p className="text-lg text-center text-foreground">Position the label within the frame and capture</p>
            <Button onClick={handleCapture} size="lg" className="w-48 h-16 rounded-full text-lg shadow-2xl">
                <Aperture className="w-6 h-6 mr-2" />
                Capture
            </Button>
        </div>
      )}

      {scanState === 'idle' && (
         <div className="absolute z-20 text-center text-foreground bottom-24 px-4">
            <p className="text-lg">Scan product labels with your camera</p>
        </div>
      )}


      <Sheet
        open={showPopup}
        onOpenChange={(open) => !open && handleClosePopup()}
      >
        <SheetContent
          side="bottom"
          className="h-screen max-h-[90vh] p-0 bg-black/80 backdrop-blur-sm border-none rounded-t-2xl"
          onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click
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
