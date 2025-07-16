'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeDetector } from 'barcode-detector-polyfill';

interface ScannerUIProps {
  onScanComplete: (barcode: string) => void;
  onCameraPermission: (granted: boolean) => void;
}

export function ScannerUI({ onScanComplete, onCameraPermission }: ScannerUIProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(true);

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || !isScanning) {
      return;
    }

    try {
      const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'upc_a', 'upc_e', 'ean_8'],
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
  }, [isScanning, onScanComplete]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        onCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        onCameraPermission(false);
      }
    };

    getCameraPermission();

    const intervalId = setInterval(() => {
      scanFrame();
    }, 500); // Scan every 500ms

    return () => {
      clearInterval(intervalId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [onCameraPermission, scanFrame]);

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
