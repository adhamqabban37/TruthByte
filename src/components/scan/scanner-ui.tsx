'use client';
import { useEffect, useState, useCallback, RefObject } from 'react';

interface ScannerUIProps {
  onScanComplete: (barcode: string) => void;
  videoRef: RefObject<HTMLVideoElement>;
}

export function ScannerUI({ onScanComplete, videoRef }: ScannerUIProps) {
  const [isScanning, setIsScanning] = useState(true);

  const scanFrame = useCallback(async () => {
    // This is a browser API, so we need to check for it.
    // @ts-ignore - BarcodeDetector is not in all TS libs yet
    if (!('BarcodeDetector' in window)) {
      console.error('Barcode Detector is not supported in this browser.');
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2 || !isScanning) {
      return;
    }
    
    try {
      // @ts-ignore
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['ean_13', 'upc_a', 'upc_e', 'ean_8', 'qr_code'],
      });
      
      const barcodes = await barcodeDetector.detect(videoRef.current);
      
      if (barcodes.length > 0) {
        setIsScanning(false);
        const barcode = barcodes[0].rawValue;
        if (barcode) {
          onScanComplete(barcode);
        }
      }
    } catch (error) {
      console.error('Barcode detection failed:', error);
    }
  }, [isScanning, onScanComplete, videoRef]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      scanFrame();
    }, 500); // Scan every 500ms

    return () => {
      clearInterval(intervalId);
    };
  }, [scanFrame]);

  // Restart scanning when the popup is closed
  useEffect(() => {
    if (!isScanning) {
        const timer = setTimeout(() => setIsScanning(true), 3000); // Cooldown before scanning again
        return () => clearTimeout(timer);
    }
  }, [isScanning])

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="object-cover w-full h-full"
        autoPlay
        playsInline
        muted
      />
      <div className="absolute inset-0 border-8 border-white/50 rounded-2xl pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-1 bg-red-500/70 animate-pulse" />
      </div>
    </div>
  );
}
