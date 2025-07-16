'use client';
import { useEffect } from 'react';
import styles from './scanner.module.css';

interface ScannerUIProps {
  onScanComplete: (barcode: string) => void;
}

export function ScannerUI({ onScanComplete }: ScannerUIProps) {
  useEffect(() => {
    // This simulates a barcode scan after 3 seconds.
    // In a real app, you would integrate a barcode scanning library here.
    const timer = setTimeout(() => {
      onScanComplete('012345678905'); // Mock barcode
    }, 3000);

    return () => clearTimeout(timer);
  }, [onScanComplete]);

  return (
    <div className={styles.scanner}>
      <div className={styles.scanner_wave}></div>
      <div className={styles.scanner_wave}></div>
      <div className={styles.scanner_wave}></div>
    </div>
  );
}
