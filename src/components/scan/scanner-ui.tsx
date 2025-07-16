'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './scanner.module.css';

export function ScannerUI() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/analysis/012345678905');
    }, 3000); // Simulate 3 second scan time

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.scanner}>
      <div className={styles.scanner_wave}></div>
      <div className={styles.scanner_wave}></div>
      <div className={styles.scanner_wave}></div>
    </div>
  );
}
