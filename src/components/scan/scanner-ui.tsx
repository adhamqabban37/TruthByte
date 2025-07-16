'use client';
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerUIProps {
  onScanComplete: (barcode: string) => void;
  onCameraPermission: (permission: boolean) => void;
}

const qrcodeRegionId = "html5qr-code-full-region";

export function ScannerUI({ onScanComplete, onCameraPermission }: ScannerUIProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [],
      formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
      ]
    };

    const onScanSuccess = (decodedText: string) => {
      // Cleanup the scanner on success to stop the camera
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5-qrcode scanner.", error);
        });
        scannerRef.current = null;
      }
      onScanComplete(decodedText);
    };

    const onScanFailure = (error: any) => {
        // This is called on each frame if no barcode is found. 
        // We can ignore it for our purposes.
    };
    
    const onCameraStart = () => {
        onCameraPermission(true);
    }
    
    const onCameraError = () => {
        onCameraPermission(false);
    }

    // Only create a new scanner if one doesn't exist
    if (!scannerRef.current) {
        const html5QrcodeScanner = new Html5QrcodeScanner(
            qrcodeRegionId, 
            config, 
            false // verbose
        );
        html5QrcodeScanner.render(onScanSuccess, onScanFailure, onCameraStart, onCameraError);
        scannerRef.current = html5QrcodeScanner;
    }


    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5-qrcode scanner on cleanup.", error);
        });
        scannerRef.current = null;
      }
    };
  }, [onScanComplete, onCameraPermission]);

  return (
    <div className="relative w-full h-full">
      <div id={qrcodeRegionId} className="w-full h-full" />
    </div>
  );
}
