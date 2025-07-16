
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ScannerClient = dynamic(() => import('@/components/scan/scanner-client'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen pt-4 bg-background">
      <div className="relative w-full h-[80vh] max-h-screen overflow-hidden bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-6 bg-background/80 rounded-2xl backdrop-blur-sm">
            <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary"/>
            <h2 className="text-2xl font-bold">Loading Scanner...</h2>
        </div>
      </div>
       <div className="w-full max-w-md p-4">
       </div>
    </div>
  ),
});

export default function ScanPage() {
  return <ScannerClient />;
}
