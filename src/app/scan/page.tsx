import { ScannerUI } from '@/components/scan/scanner-ui';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ScanPage() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen p-4 bg-black">
      <ScannerUI />
      <div className="absolute z-20 text-center text-white bottom-24">
        <p className="mb-4 text-lg">Place a barcode inside the frame</p>
        <Link href="/analysis/012345678905" passHref>
          <Button variant="outline" className="text-black bg-white/80 backdrop-blur-sm">
            Manually Enter Barcode
          </Button>
        </Link>
      </div>
    </div>
  );
}
