'use client';
import type { GenerateTruthSummaryOutput } from '@/ai/flows/generate-truth-summary';
import type { Product, ScanHistoryItem } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisSummaryProps {
  product: Product;
  analysis: GenerateTruthSummaryOutput;
  onClose: () => void;
}

export function AnalysisSummary({
  product,
  analysis,
  onClose,
}: AnalysisSummaryProps) {
  const { toast } = useToast();

  useEffect(() => {
    try {
      const history: ScanHistoryItem[] = JSON.parse(
        localStorage.getItem('scanHistory') || '[]'
      );
      const newHistoryItem: ScanHistoryItem = {
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        dataAiHint: product.dataAiHint,
        scanDate: new Date().toISOString(),
      };

      // Avoid duplicates
      const existingIndex = history.findIndex(
        (item) => item.barcode === product.barcode
      );
      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }

      const newHistory = [newHistoryItem, ...history].slice(0, 50);
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save scan history:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save this scan to your history.',
      });
    }
  }, [product, toast]);

  const getGlowEffectClass = () => {
    const rating = analysis.healthRating.toUpperCase();
    if (['A', 'B'].includes(rating)) {
      return 'shadow-[0_0_30px_10px_hsl(var(--healthy)/0.5)] border-healthy/80';
    }
    if (['D', 'E', 'F'].includes(rating)) {
      return 'shadow-[0_0_30px_10px_hsl(var(--unhealthy)/0.5)] border-unhealthy/80';
    }
    return 'shadow-lg border-muted/50';
  };

  return (
    <div
      className={cn(
        'p-4 space-y-4 text-center bg-card rounded-2xl border-2',
        getGlowEffectClass()
      )}
    >
      <div className="flex justify-center -mt-16">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={128}
          height={128}
          className="object-contain w-32 h-32 rounded-lg bg-background"
          data-ai-hint={product.dataAiHint}
          unoptimized
        />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-headline">{product.name}</h2>
        <p className="px-4 text-base text-muted-foreground">{analysis.summary}</p>
      </div>
      <Link href={`/analysis/${product.barcode}`} passHref>
        <Button size="lg" className="w-full text-lg" onClick={onClose}>
          View Full Analysis <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  );
}
