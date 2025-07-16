
import { AnalysisPageContent } from '@/components/analysis/analysis-page-content';
import Ribbons from '@/components/ribbons';

export default function AnalysisPage({
  params,
}: {
  params: { barcode: string };
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
         <Ribbons
            baseThickness={25}
            enableShaderEffect={true}
            colors={['#ADD8E6', '#E6E6FA']}
            speedMultiplier={0.5}
          />
      </div>
      <div className="relative z-10 container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
        <AnalysisPageContent params={params} />
      </div>
    </div>
  );
}

    