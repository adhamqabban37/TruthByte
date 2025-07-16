import { generateTruthSummary } from '@/ai/flows/generate-truth-summary';
import { AnalysisClient } from '@/components/analysis/analysis-client';
import { getProductByBarcode } from '@/lib/mock-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

type AnalysisPageProps = {
  params: {
    barcode: string;
  };
};

async function AnalysisData({ barcode }: { barcode: string }) {
  const product = getProductByBarcode(barcode);

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Product Not Found</AlertTitle>
          <AlertDescription>
            The barcode {barcode} could not be found in our database.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const analysis = await generateTruthSummary({ ingredients: product.ingredients });

  return <AnalysisClient product={product} analysis={analysis} />;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  return (
    <div className="container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <Suspense fallback={<AnalysisSkeleton />}>
        <AnalysisData barcode={params.barcode} />
      </Suspense>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Skeleton className="w-32 h-32 rounded-lg" />
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-6" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="w-40 h-7" />
        <div className="p-4 space-y-3 border rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-full h-5" />
          </div>
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-5" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="w-48 h-7" />
         <div className="flex flex-wrap gap-2">
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-32 h-8 rounded-full" />
            <Skeleton className="w-20 h-8 rounded-full" />
            <Skeleton className="w-28 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
