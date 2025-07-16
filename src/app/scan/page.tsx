import { ScannerUI } from '@/components/scan/scanner-ui';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ScanPage() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen p-4 bg-transparent">
      <ScannerUI />
      <div className="absolute z-20 text-center text-white bottom-24">
        <p className="mb-4 text-lg">Place a barcode inside the frame</p>
        <Link href="/analysis/012345678905" passHref>
           <Button variant="outline" className="text-white bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20 hover:text-white">
            Manually Enter Barcode
          </Button>
        </Link>
      </div>
    </div>
  );
}
